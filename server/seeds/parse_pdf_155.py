import fitz
import re
import json

doc = fitz.open(r'C:\Users\Mr.Developer\.gemini\antigravity\brain\170c6291-a3ff-4f44-a42f-3c8be8b68c1e\.user_uploaded\media_1791972208716_bd875834.pdf')

rows = []
for pno in range(len(doc)):
    page = doc[pno]
    tabs = page.find_tables()
    for t in tabs:
        data = t.extract()
        for r in data:
            if r[0] and r[0].strip().isdigit():
                rows.append((pno + 1, r))

parsed_customers = []
total_dr = 0.0
total_cr = 0.0

for pno, r in rows:
    sno = int(r[0].strip())
    raw_title = (r[2] or "").strip()
    
    # Handle wrapping / overflow rows:
    if sno == 46:
        raw_title = "(Zahrat Al Fajr)\nAl khidmah restaunt\n564478"
    elif sno == 147:
        raw_title = "(Sultan Mir)\nShahi qilla restaurant l.l.c\n0566321423"

    # Extract salesman: e.g. (Ashiq Ali) or () or (Zahrat Al Fajr)
    salesman = ""
    sm_match = re.search(r'\((.*?)\)', raw_title)
    if sm_match:
        salesman = sm_match.group(1).strip()
        raw_title = re.sub(r'\(.*?\)', '', raw_title).strip()

    # Clean out literal 'NULL' strings
    raw_title = re.sub(r'\bNULL\b', '', raw_title).strip()

    # Extract phone number if present: digits, spaces, +, length >= 7
    lines = [l.strip() for l in raw_title.split('\n') if l.strip()]
    phone = ""
    name_lines = []
    for l in lines:
        cleaned_num = re.sub(r'[+\s-]', '', l)
        if cleaned_num.isdigit() and len(cleaned_num) >= 7:
            phone = l
        elif cleaned_num.isdigit() and len(cleaned_num) < 7:
            # Short code or phone like '44848' or '22'
            if not phone:
                phone = l
            else:
                name_lines.append(l)
        else:
            name_lines.append(l)
    
    title = " ".join(name_lines).strip()
    title = re.sub(r'\s+', ' ', title)
    title = re.sub(r'\bNULL\b', '', title).strip()

    last_bill_no = (r[3] or "").replace('\n', '').strip()
    bill_dated = (r[4] or "").replace('\n', '').strip()
    bill_amt_str = (r[5] or "").replace('\n', '').replace(',', '').strip()
    bill_amt = float(bill_amt_str) if bill_amt_str else 0.0

    last_rcpt_date = (r[6] or "").replace('\n', '').strip()
    rcpt_amt_str = (r[7] or "").replace('\n', '').replace(',', '').strip()
    rcpt_amt = float(rcpt_amt_str) if rcpt_amt_str else 0.0

    bal_str = (r[8] or "").replace('\n', ' ').strip()
    bal_match = re.search(r'([\d,]+\.?\d*)\s*(DR|CR)', bal_str)
    if not bal_match:
        print(f"Warning: no balance match for row {sno}: {bal_str}")
        balance = 0.0
        balance_type = "DR"
    else:
        balance = float(bal_match.group(1).replace(',', ''))
        balance_type = bal_match.group(2)

    if balance_type == "DR":
        total_dr += balance
    else:
        total_cr += balance

    parsed_customers.append({
        "sno": sno,
        "title": title,
        "phone": phone,
        "salesman": salesman,
        "lastBillNumber": last_bill_no,
        "lastBillDate": bill_dated,
        "lastBillAmount": bill_amt,
        "lastReceiptDate": last_rcpt_date,
        "lastReceiptAmount": rcpt_amt,
        "balance": balance,
        "balanceType": balance_type,
        "page": pno
    })

net = total_dr - total_cr
print(f"Total rows: {len(parsed_customers)}")
print(f"Total DR: {total_dr:.2f}")
print(f"Total CR: {total_cr:.2f}")
print(f"Net DR-CR: {net:.2f}")
print(f"Difference from 307548.29: {net - 307548.29:.4f}")

with open(r'server\seeds\receivables_pdf_155.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_customers, f, indent=2)

print("Saved server/seeds/receivables_pdf_155.json successfully.")
