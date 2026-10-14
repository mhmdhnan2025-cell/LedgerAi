import json
import re

# We can parse the OCR from the prompt or from the 16 pages
# Let's inspect customers 1 to 337 in database.json
with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])
print(f"Total customers: {len(custs)}")

# Check codes from 325 to 337
for i in range(324, min(339, len(custs))):
    c = custs[i]
    print(f"Index {i+1}: srNo={c.get('srNo')}, code={c.get('code')}, mcode={c.get('manualCode')}, title={c.get('accountTitle')}")
