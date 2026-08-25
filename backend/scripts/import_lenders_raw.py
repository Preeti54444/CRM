from pathlib import Path
import re
import json
import os

from sqlalchemy import MetaData, Table, Column, Integer, Text
from sqlalchemy import create_engine
from sqlalchemy.sql import insert

EXCEL_PATH = Path(r"C:\Users\ujmak\Downloads\Lenders_SCF_Products (2) (1).xlsx")

# Prefer DATABASE_URL envvar first, then fall back to db.py, then sqlite
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {})
else:
    try:
        from db import engine
    except Exception:
        DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./crm.db')
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {})


def normalize_col(name: str) -> str:
    if name is None:
        return ''
    s = str(name).strip()
    # replace spaces and punctuation with underscore
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", '_', s)
    s = re.sub(r'_+', '_', s)
    s = s.strip('_')
    if not s:
        s = 'col'
    return s


if __name__ == '__main__':
    import openpyxl

    if not EXCEL_PATH.exists():
        raise SystemExit(f'Excel file not found: {EXCEL_PATH}')

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        raise SystemExit('Excel workbook is empty')

    raw_headers = [str(h).strip() if h is not None else '' for h in rows[0]]

    # Normalize headers to valid column names and ensure uniqueness
    normalized = []
    seen = {}
    for h in raw_headers:
        col = normalize_col(h)
        if col in seen:
            seen[col] += 1
            col = f"{col}_{seen[col]}"
        else:
            seen[col] = 0
        normalized.append(col)

    # Define table metadata
    metadata = MetaData()
    table_name = 'lenders_raw'
    columns = [Column('id', Integer, primary_key=True, autoincrement=True)]
    for col in normalized:
        columns.append(Column(col, Text, nullable=True))

    lenders_raw = Table(table_name, metadata, *columns)

    # Create table if not exists
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if inspector.has_table(table_name):
        metadata.reflect(bind=engine, only=[table_name])
        lenders_raw = metadata.tables[table_name]
    else:
        metadata.create_all(bind=engine, tables=[lenders_raw])

    # Prepare insert rows preserving exact values as strings
    insert_rows = []
    for i, raw in enumerate(rows[1:], start=1):
        row_map = {}
        for col_name, cell in zip(normalized, raw):
            if cell is None:
                row_map[col_name] = None
            else:
                # preserve as string, but strip only terminal whitespace
                row_map[col_name] = str(cell)
        insert_rows.append(row_map)

    if not insert_rows:
        print('No data rows to import')
        raise SystemExit(0)

    # Bulk insert
    with engine.begin() as conn:
        conn.execute(insert(lenders_raw), insert_rows)

    print(f'Imported {len(insert_rows)} rows into {table_name}')
    print('Columns mapping:')
    for hdr, col in zip(raw_headers, normalized):
        print(f"{col} <- {hdr}")
