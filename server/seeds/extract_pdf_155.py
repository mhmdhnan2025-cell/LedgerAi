import fitz
import re
import json

doc = fitz.open(r'C:\Users\Mr.Developer\.gemini\antigravity\brain\170c6291-a3ff-4f44-a42f-3c8be8b68c1e\.user_uploaded\media_1791972208716_bd875834.pdf')

records = []
for pno in range(len(doc)):
    page = doc[pno]
    tab = page.find_tables()[0]
    data = tab.extract()
    for r in data:
        sno_cell = (r[0] or '').strip()
        if sno_cell == 'S.NO' or sno_cell == 'TOTAL:':
            continue
        if sno_cell.isdigit():
            records.append({
                'sNo': int(sno_cell),
                'mCode': (r[1] or '').strip(),
                'rawTitle': (r[2] or '').strip(),
                'lastBillNumber': (r[3] or '').strip().replace('\n', ''),
                'lastBillDate': (r[4] or '').strip().replace('\n', ''),
                'lastBillAmount': float((r[5] or '0').strip().replace('\n', '').replace(',', '') or 0),
                'lastReceiptDate': (r[6] or '').strip().replace('\n', ''),
                'lastReceiptAmount': float((r[7] or '0').strip().replace('\n', '').replace(',', '') or 0),
                'ledgerBalanceStr': (r[8] or '').strip().replace('\n', ' ')
            })
        elif sno_cell == '':
            cont_title = (r[2] or '').strip()
            if cont_title and cont_title != 'NULL' and len(records) > 0:
                records[-1]['rawTitle'] += '\n' + cont_title

parsed = []
total_dr = 0.0
total_cr = 0.0

for rec in records:
    raw = rec['rawTitle']
    
    # Extract salesman:
    salesman = ''
    sm_match = re.search(r'\((.*?)\)', raw, re.DOTALL)
    if sm_match:
        salesman = re.sub(r'\s+', ' ', sm_match.group(1)).strip()
        raw = raw[:sm_match.start()] + raw[sm_match.end():]
    
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    phone_parts = []
    name_lines = []
    
    for l in lines:
        if l == 'NULL':
            continue
        # Check if line looks like phone number:
        cleaned = re.sub(r'[+\s\*-]', '', l)
        if cleaned.isdigit() and len(cleaned) >= 5:
            phone_parts.append(l)
        elif len(lines) > 1 and l == lines[-1] and (cleaned.isdigit() or l == '000000' or l == '0'):
            phone_parts.append(l)
        else:
            name_lines.append(l)
            
    phone = ' '.join(phone_parts).strip()
    title = ' '.join(name_lines).strip()
    title = re.sub(r'\s+', ' ', title)
    title = re.sub(r'\bNULL\b', '', title).strip()
    
    # Normalize dates (clean any accidental dashes or spaces)
    last_bill_date = rec['lastBillDate']
    if last_bill_date == '-' or last_bill_date == '0':
        last_bill_date = ''
    last_rcpt_date = rec['lastReceiptDate']
    if last_rcpt_date == '-' or last_rcpt_date == '0':
        last_rcpt_date = ''
        
    last_bill_no = rec['lastBillNumber']
    if last_bill_no == '-' or last_bill_no == '0':
        last_bill_no = ''
        
    # Ledger balance
    m = re.search(r'([\d,]+\.?\d*)\s*(DR|CR)', rec['ledgerBalanceStr'])
    amt = float(m.group(1).replace(',', ''))
    b_type = m.group(2)
    
    if b_type == 'DR':
        total_dr += amt
    else:
        total_cr += amt
        
    parsed.append({
        'sNo': rec['sNo'],
        'mCode': rec['mCode'],
        'salesman': salesman,
        'title': title,
        'phone': phone,
        'lastBillNumber': last_bill_no,
        'lastBillDate': last_bill_date,
        'lastBillAmount': rec['lastBillAmount'],
        'lastReceiptDate': last_rcpt_date,
        'lastReceiptAmount': rec['lastReceiptAmount'],
        'balance': amt,
        'balanceType': b_type
    })

print(f'Total records: {len(parsed)}')
print(f'Total DR: {total_dr:.2f}')
print(f'Total CR: {total_cr:.2f}')
print(f'Net: {(total_dr - total_cr):.2f}')

with open(r'server/seeds/receivables_pdf_155_clean.json', 'w', encoding='utf-8') as f:
    json.dump(parsed, f, indent=2)

print('Saved server/seeds/receivables_pdf_155_clean.json')
