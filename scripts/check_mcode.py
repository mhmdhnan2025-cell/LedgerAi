import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])
has_mcode = []
for i, c in enumerate(custs[:337]):
    mc = c.get('manualCode')
    if mc:
        has_mcode.append((c.get('srNo'), c.get('code'), mc, c.get('accountTitle')))

print(f"Total customers with manualCode in first 337: {len(has_mcode)}")
for x in has_mcode:
    print(x)
