from pathlib import Path
import openpyxl

path = Path(r"C:\Users\Sneha\Downloads\Lenders_SCF_Products (2).xlsx")
print('file exists:', path.exists())
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
print('rows:', len(rows))
for i, row in enumerate(rows[:10], start=1):
    print(i, row)
