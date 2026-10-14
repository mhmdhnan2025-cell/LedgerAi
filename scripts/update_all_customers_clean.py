import json
import glob
import os

DB_FILES = glob.glob('data/database*.json')
print(f"Found database files: {DB_FILES}")

# Base customer list from database.json
with open('data/database.json', 'r', encoding='utf-8') as f:
    base_db = json.load(f)

base_custs = base_db.get('customers', [])[:337]
print(f"Base customers count: {len(base_custs)}")

# Clean and normalize all 337 customers
cleaned_337 = []
for i, c in enumerate(base_custs):
    sr = i + 1
    # Specific code fixes from PDF page 16
    code = c.get('code')
    if sr == 333:
        code = '0101040339'
    elif sr == 336:
        code = '0101040342'
    elif not code:
        code = f"010104{sr:04d}"

    cleaned_c = {
        **c,
        'code': code,
        'accountCode': code,
        'srNo': sr,
        'sNo': sr,
        'pdfOrder': sr,
        'outstandingBalance': 0.0,
        'openingBalance': 0.0,
        'openingBalanceType': 'DR',
        'lastBillNumber': '',
        'lastBillDate': '',
        'lastBillAmount': 0.0,
        'lastReceiptDate': '',
        'lastReceiptAmount': 0.0,
        'totalSales': 0.0,
        'manualCode': c.get('manualCode', '') or '',
    }
    cleaned_337.append(cleaned_c)

print(f"Processed exactly {len(cleaned_337)} customers.")
print(f"First customer: {cleaned_337[0]['srNo']}, {cleaned_337[0]['code']}, {cleaned_337[0]['accountTitle']}, bal={cleaned_337[0]['outstandingBalance']}")
print(f"333: {cleaned_337[332]['srNo']}, {cleaned_337[332]['code']}, {cleaned_337[332]['accountTitle']}")
print(f"336: {cleaned_337[335]['srNo']}, {cleaned_337[335]['code']}, {cleaned_337[335]['accountTitle']}")
print(f"Last customer: {cleaned_337[336]['srNo']}, {cleaned_337[336]['code']}, {cleaned_337[336]['accountTitle']}, bal={cleaned_337[336]['outstandingBalance']}")

# Update every database_*.json file
for db_file in DB_FILES:
    with open(db_file, 'r', encoding='utf-8') as f:
        file_db = json.load(f)
    
    cid = file_db.get('companyProfile', {}).get('id', 'comp_default_01')
    
    # Adjust companyId and ID for the tenant
    tenant_custs = []
    for c in cleaned_337:
        cust_copy = dict(c)
        cust_copy['companyId'] = cid
        cust_copy['id'] = f"cust-{cust_copy['srNo']}_{cid}"
        tenant_custs.append(cust_copy)
    
    file_db['customers'] = tenant_custs
    # Also reset saleBills, vouchers, payments if any dummy exist to keep party receivable 0
    # but let's check if there are any
    file_db['saleBills'] = []
    file_db['vouchers'] = []
    file_db['saleReturns'] = []
    file_db['cashRecoveredItems'] = []
    
    with open(db_file, 'w', encoding='utf-8') as f:
        json.dump(file_db, f, indent=2, ensure_ascii=False)
        
    print(f"Updated {db_file} with {len(tenant_custs)} customers.")

print("All database JSON files updated successfully!")
