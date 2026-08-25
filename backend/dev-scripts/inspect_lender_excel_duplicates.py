from pathlib import Path
import openpyxl
import re

path = Path(r"C:\Users\Sneha\Downloads\Lenders_SCF_Products (2).xlsx")
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
headers = [str(c).strip() if c is not None else '' for c in rows[0]]
print('rows', len(rows) - 1)

slug_counts = {}
name_counts = {}
for row in rows[1:]:
    record = dict(zip(headers, row))
    name = str(record.get('Lender Name') or '').strip()
    slug = name.lower().replace(' ', '-').replace('&', 'and')
    slug = re.sub(r'[^a-z0-9\-]+', '', slug)
    slug_counts[slug] = slug_counts.get(slug, 0) + 1
    name_counts[name] = name_counts.get(name, 0) + 1

print('top duplicate names:')
for name, count in sorted(name_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:20]:
    if count > 1:
        print(name, count)
print('top duplicate slugs:')
for slug, count in sorted(slug_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:20]:
    if count > 1:
        print(slug, count)
