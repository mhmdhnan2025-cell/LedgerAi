import json
import re

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])
print(f"Total customers in database.json: {len(custs)}")

discrepancies = []
for i, c in enumerate(custs):
    sr = c.get('srNo')
    code = c.get('code')
    title = c.get('accountTitle')
    mcode = c.get('manualCode')
    if sr != i + 1:
        discrepancies.append((i, sr, code, mcode, title))

print(f"Total discrepancies: {len(discrepancies)}")
for d in discrepancies[:20]:
    print(d)
