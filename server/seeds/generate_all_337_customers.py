import fitz
import json
import re
import os

pdf_path = r'C:\Users\Mr.Developer\.gemini\antigravity\brain\170c6291-a3ff-4f44-a42f-3c8be8b68c1e\.user_uploaded\media_1791976252205_ba290b1f.pdf'
rec_path = r'server/seeds/receivables_pdf_155.json'
out_path = r'server/seeds/all_337_customers.json'

doc = fitz.open(pdf_path)
print(f'Opened PDF: {pdf_path}, total pages: {len(doc)}')

with open(rec_path, 'r', encoding='utf-8') as f:
    rec_155 = json.load(f)

def clean_name(n):
    return re.sub(
        r'[^a-z0-9]', '',
        (n or '').lower()
        .replace('restaurant', '')
        .replace('resturant', '')
        .replace('restaunt', '')
        .replace('cafeteria', '')
        .replace('cafetetria', '')
        .replace('kitchen', '')
        .replace('llc', '')
        .replace('services', '')
        .replace('trading', '')
    )

customers_337 = []

for p_idx, page in enumerate(doc):
    tabs = page.find_tables()
    for tab in tabs.tables:
        df = tab.extract()
        for row in df:
            if not row or not row[0] or not row[0].strip().isdigit():
                continue
            sr = int(row[0].strip())
            date_raw = row[1].strip() if len(row) > 1 and row[1] else ''
            emp_raw = row[2].strip() if len(row) > 2 and row[2] else ''
            code_cust = row[4].strip() if len(row) > 4 and row[4] else ''
            contact_raw = row[5].strip() if len(row) > 5 and row[5] else ''
            mobiles_raw = row[6].strip() if len(row) > 6 and row[6] else ''
            area_raw = row[7].strip() if len(row) > 7 and row[7] else ''
            sector_raw = row[8].strip() if len(row) > 8 and row[8] else ''
            city_raw = row[9].strip() if len(row) > 9 and row[9] else ''

            code = ''
            name = code_cust
            m = re.match(r'^\(?([0-9]{10})\)?\s*(.*)$', code_cust, re.DOTALL)
            if m:
                code = m.group(1)
                name = m.group(2).strip()

            name = ' '.join(name.split())
            emp = ' '.join(emp_raw.split())
            contact = ' '.join(contact_raw.split())
            area = ' '.join(area_raw.split())
            sector = ' '.join(sector_raw.split())
            city = ' '.join(city_raw.split())
            mobiles = ' '.join(mobiles_raw.split())

            # Parse primary mobile
            clean_mobile = ''
            m_match = re.search(r'M1:\s*([0-9+*-]+)', mobiles)
            if m_match:
                clean_mobile = m_match.group(1).replace('*', '').replace('-', '').strip()
                if clean_mobile in ['0', 'NULL', '']:
                    clean_mobile = ''
            elif 'M1:NULL' in mobiles or 'M1:0' in mobiles or mobiles == 'M1:':
                clean_mobile = ''
            else:
                clean_mobile = re.sub(r'[^0-9+]', '', mobiles)

            # Secondary mobile
            clean_mobile2 = ''
            m2_match = re.search(r'M2:\s*([0-9+*-]+)', mobiles)
            if m2_match:
                clean_mobile2 = m2_match.group(1).replace('*', '').replace('-', '').strip()
                if clean_mobile2 in ['0', '000000', '0000000', '00000000']:
                    clean_mobile2 = ''

            # Reg date YYYY-MM-DD
            reg_date = '2026-04-18'
            if date_raw:
                dm = re.match(r'(\d{2})/(\d{2})/(\d{4})', date_raw)
                if dm:
                    reg_date = f'{dm.group(3)}-{dm.group(2)}-{dm.group(1)}'

            # Customer group based on name
            name_lower = name.lower()
            if any(k in name_lower for k in ['cafeteria', 'cafeteriya', 'cafe', 'tea ']):
                group = 'Cafeteria'
            elif any(k in name_lower for k in ['kitchen', 'kitchens']):
                group = 'Cloud Kitchen'
            elif any(k in name_lower for k in ['super market', 'supermarket', 'baqala', 'grocery']):
                group = 'Supermarket'
            elif any(k in name_lower for k in ['catering', 'caterers']):
                group = 'Catering Services'
            elif any(k in name_lower for k in ['carpentry', 'carpantry', 'demolition', 'interiors', 'plastic']):
                group = 'Commercial Hub'
            elif any(k in name_lower for k in ['bakery', 'sweets']):
                group = 'Bakery'
            else:
                group = 'Restaurants'

            customers_337.append({
                'srNo': sr,
                'regDate': reg_date,
                'employee': emp,
                'code': code,
                'accountCode': code,
                'name': name,
                'accountTitle': name,
                'title': name,
                'contactPerson': contact,
                'mobile': clean_mobile,
                'mobile2': clean_mobile2,
                'rawMobiles': mobiles,
                'area': area or 'Sajja Industrial Area',
                'sector': sector or 'Sector 1',
                'city': city or 'Sharjah',
                'customerGroup': group,
                'creditLimit': 30000,
                'status': 'ACTIVE'
            })

print(f'Extracted {len(customers_337)} customers from PDF.')

# Match with 155 receivables
used_rec = set()
matched_count = 0

for c in customers_337:
    c_clean = clean_name(c['name'])
    c_phone = re.sub(r'[^0-9]', '', c['mobile'])

    match = None
    for idx, r in enumerate(rec_155):
        if idx in used_rec:
            continue
        if clean_name(r['title']) == c_clean and c_clean != '':
            match = (idx, r)
            break

    if not match and c_phone and len(c_phone) >= 7 and not c_phone.endswith('000000'):
        for idx, r in enumerate(rec_155):
            if idx in used_rec:
                continue
            r_phone = re.sub(r'[^0-9]', '', r.get('phone', ''))
            if r_phone and (r_phone in c_phone or c_phone in r_phone):
                match = (idx, r)
                break

    if match:
        idx, r = match
        used_rec.add(idx)
        matched_count += 1

        # Use salesman from receivable if employee is blank
        assigned_salesman = c['employee'] or r.get('salesman', '')
        c['assignedSalesman'] = assigned_salesman
        c['salesman'] = assigned_salesman

        c['openingBalance'] = abs(r['balance'])
        c['openingBalanceType'] = r['balanceType']
        c['outstandingBalance'] = -abs(r['balance']) if r['balanceType'] == 'CR' else abs(r['balance'])
        c['lastBillNumber'] = r.get('lastBillNumber', '')
        c['lastBillDate'] = r.get('lastBillDate', '')
        c['lastBillAmount'] = r.get('lastBillAmount', 0)
        c['lastReceiptDate'] = r.get('lastReceiptDate', '')
        c['lastReceiptAmount'] = r.get('lastReceiptAmount', 0)
        c['pdfOrder'] = r['sno']
        c['sNo'] = r['sno']
        c['hasBalance'] = True
    else:
        assigned_salesman = c['employee']
        c['assignedSalesman'] = assigned_salesman
        c['salesman'] = assigned_salesman

        c['openingBalance'] = 0
        c['openingBalanceType'] = 'DR'
        c['outstandingBalance'] = 0
        c['lastBillNumber'] = ''
        c['lastBillDate'] = ''
        c['lastBillAmount'] = 0
        c['lastReceiptDate'] = ''
        c['lastReceiptAmount'] = 0
        c['pdfOrder'] = 9999
        c['sNo'] = 9999
        c['hasBalance'] = False

print(f'Matched {matched_count}/{len(rec_155)} receivables.')

# Validate total balance
total_dr = sum(c['outstandingBalance'] for c in customers_337 if c['outstandingBalance'] > 0)
total_cr = sum(abs(c['outstandingBalance']) for c in customers_337 if c['outstandingBalance'] < 0)
net_balance = total_dr - total_cr

print(f'Total DR: {total_dr:.2f}')
print(f'Total CR: {total_cr:.2f}')
print(f'Net Balance: {net_balance:.2f} DR (Target: 307548.29 DR)')

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(customers_337, f, indent=2, ensure_ascii=False)

print(f'Saved all 337 customers to {out_path}')
