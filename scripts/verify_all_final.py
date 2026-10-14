import json
import glob

# Check database files
db_files = sorted(glob.glob('data/database*.json'))
print(f"Checking {len(db_files)} database files...")

for fpath in db_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        db = json.load(f)
    custs = db.get('customers', [])
    assert len(custs) == 337, f"{fpath}: Expected 337 customers, got {len(custs)}"
    
    non_zero = [c for c in custs if (c.get('outstandingBalance') or 0) != 0 or (c.get('openingBalance') or 0) != 0]
    assert len(non_zero) == 0, f"{fpath}: Found {len(non_zero)} non-zero balance customers!"
    
    # Check srNo sequence
    for idx, c in enumerate(custs):
        expected_sr = idx + 1
        assert c.get('srNo') == expected_sr, f"{fpath}: srNo mismatch at index {idx}: got {c.get('srNo')}, expected {expected_sr}"
        assert c.get('sNo') == expected_sr, f"{fpath}: sNo mismatch at index {idx}"
        
    # Check 333 and 336
    assert custs[332]['code'] == '0101040339', f"{fpath}: Cust 333 code is {custs[332]['code']}"
    assert custs[332]['accountTitle'] == 'MARHABA CAFETERIA'
    assert custs[335]['code'] == '0101040342', f"{fpath}: Cust 336 code is {custs[335]['code']}"
    assert custs[335]['accountTitle'] == 'NOOR MOHAMMAD RESTAURANT'
    assert custs[336]['code'] == '0101040343', f"{fpath}: Cust 337 code is {custs[336]['code']}"
    assert custs[336]['accountTitle'] == 'ARKAN KHAS'

print("ALL JSON DATABASES VERIFIED: Exactly 337 customers, perfectly numbered 1..337, all 0 balance, correct codes!")
