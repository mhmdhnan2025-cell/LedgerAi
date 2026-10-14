import json
import re

# Let's verify all 337 customers
with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])[:337]

# Let's inspect their codes and names
for i, c in enumerate(custs):
    expected_sr = i + 1
    sr = c.get('srNo')
    code = c.get('code')
    title = c.get('accountTitle')
    if sr != expected_sr:
        print(f"Sr mismatch at {i}: got {sr}, expected {expected_sr}")
        
print("All srNo checked for 1..337.")
print(f"333: code={custs[332].get('code')}, title={custs[332].get('accountTitle')}")
print(f"334: code={custs[333].get('code')}, title={custs[333].get('accountTitle')}")
print(f"335: code={custs[334].get('code')}, title={custs[334].get('accountTitle')}")
print(f"336: code={custs[335].get('code')}, title={custs[335].get('accountTitle')}")
print(f"337: code={custs[336].get('code')}, title={custs[336].get('accountTitle')}")
