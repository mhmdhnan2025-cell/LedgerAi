import pymupdf
import re
import json

ROOT = r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP"

# ---------------------------------------------------------------
# 1) customers.pdf -> 337 rows
# ---------------------------------------------------------------
doc = pymupdf.open(ROOT + r"\customers.pdf")
customers = []
for pno in range(len(doc)):
    for t in doc[pno].find_tables().tables:
        data = t.extract()
        for r in data:
            cells = [(c or '').strip() for c in (r + [''] * 10)[:10]]
            c0, c1, c2, c3, c4, c5, c6, c7, c8, c9 = cells
            if c0 == 'Sr#' or c0.startswith('ZAHRAT') or c0.startswith('Customers List'):
                continue
            if c0.isdigit():
                # code + name from customer cell
                lines = [l.strip() for l in c4.split('\n') if l.strip()]
                code = ''
                m = re.match(r'\((0\d{9})\)', lines[0]) if lines else None
                if m:
                    code = m.group(1)
                    lines = lines[1:]
                customers.append({
                    'sr': int(c0),
                    'date': c1,
                    'employee': c2,
                    'codeCol': c3,
                    'code': code,
                    'name': ' '.join(lines),
                    'contact': c5,
                    'mobileRaw': c6,
                    'area': c7,
                    'sector': c8,
                    'city': c9,
                    'page': pno + 1,
                })
            elif c0 == '' and c4 and customers:
                # name continuation row (only if no other data)
                if not any([c1, c2, c6, c7, c8, c9]):
                    customers[-1]['name'] = (customers[-1]['name'] + ' ' + ' '.join(
                        l.strip() for l in c4.split('\n') if l.strip())).strip()

print(f"customers parsed: {len(customers)}")
srs = [c['sr'] for c in customers]
exp = list(range(1, 338))
print("sr sequence exact 1..337:", srs == exp, "| dups:", len(srs) - len(set(srs)))
print("missing code:", sum(1 for c in customers if not c['code']))
print("with employee:", sum(1 for c in customers if c['employee']))
print("with contact:", sum(1 for c in customers if c['contact']))
print("with area:", sum(1 for c in customers if c['area']),
      "| sector:", sum(1 for c in customers if c['sector']),
      "| city:", sum(1 for c in customers if c['city']))
print("dates distinct:", sorted({c['date'] for c in customers}))
emp_set = sorted({c['employee'] for c in customers if c['employee']})
print("employees:", emp_set)
bad_mobile = [c['sr'] for c in customers if c['mobileRaw'] and not re.match(r'M1:', c['mobileRaw'])]
print("rows w/o M1 prefix:", bad_mobile)

with open(ROOT + r"\server\seeds\customers_pdf_337_new.json", 'w', encoding='utf-8') as f:
    json.dump(customers, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------
# 2) receivebles new.pdf -> 152 rows + total
# ---------------------------------------------------------------
doc = pymupdf.open(ROOT + r"\receivebles new.pdf")
records = []
total_row = None
for pno in range(len(doc)):
    for t in doc[pno].find_tables().tables:
        data = t.extract()
        for r in data:
            cells = [(c or '').strip() for c in (r + [''] * 9)[:9]]
            c0 = cells[0]
            if c0 == 'S.NO':
                continue
            if c0.upper().startswith('TOTAL'):
                total_row = cells
                continue
            if c0.isdigit():
                records.append({
                    'sNo': int(c0),
                    'mCode': cells[1],
                    'rawTitle': cells[2],
                    'lastBillNumber': cells[3].replace('\n', ''),
                    'lastBillDate': cells[4].replace('\n', ''),
                    'lastBillAmount': float((cells[5] or '0').replace(',', '') or 0),
                    'lastReceiptDate': cells[6].replace('\n', ''),
                    'lastReceiptAmount': float((cells[7] or '0').replace(',', '') or 0),
                    'ledgerBalanceStr': cells[8].replace('\n', ' '),
                })
            elif c0 == '' and cells[2] and records:
                if not any(cells[3:8]):
                    records[-1]['rawTitle'] += '\n' + cells[2]

parsed = []
total_dr = total_cr = 0.0
for rec in records:
    raw = rec['rawTitle']
    salesman = ''
    sm = re.search(r'\((.*?)\)', raw, re.DOTALL)
    if sm:
        salesman = re.sub(r'\s+', ' ', sm.group(1)).strip()
        raw = raw[:sm.start()] + raw[sm.end():]
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    phone_parts, name_lines = [], []
    for l in lines:
        if l == 'NULL':
            continue
        cleaned = re.sub(r'[+\s\*-]', '', l)
        if cleaned.isdigit() and len(cleaned) >= 5:
            phone_parts.append(l)
        elif l == lines[-1] and (cleaned.isdigit() or l in ('000000', '0')):
            phone_parts.append(l)
        else:
            name_lines.append(l)
    phone = ' '.join(phone_parts).strip()
    title = re.sub(r'\s+', ' ', ' '.join(name_lines)).replace('NULL', '').strip()
    for key in ('lastBillDate', 'lastReceiptDate'):
        if rec[key] in ('-', '0'):
            rec[key] = ''
    if rec['lastBillNumber'] in ('-', '0'):
        rec['lastBillNumber'] = ''
    m = re.search(r'([\d,]+\.?\d*)\s*(DR|CR)', rec['ledgerBalanceStr'])
    amt = float(m.group(1).replace(',', ''))
    btype = m.group(2)
    if btype == 'DR':
        total_dr += amt
    else:
        total_cr += amt
    parsed.append({
        'sNo': rec['sNo'],
        'mCode': rec['mCode'],
        'salesman': salesman,
        'title': title,
        'phone': phone,
        'lastBillNumber': rec['lastBillNumber'],
        'lastBillDate': rec['lastBillDate'],
        'lastBillAmount': rec['lastBillAmount'],
        'lastReceiptDate': rec['lastReceiptDate'],
        'lastReceiptAmount': rec['lastReceiptAmount'],
        'balance': amt,
        'balanceType': btype,
    })

print()
print(f"receivables parsed: {len(parsed)}")
snos = [p['sNo'] for p in parsed]
print("sNo sequence exact 1..152:", snos == list(range(1, 153)), "| dups:", len(snos) - len(set(snos)))
print(f"Total DR: {total_dr:.2f} | Total CR: {total_cr:.2f} | Net: {(total_dr - total_cr):.2f}")
print("TARGET: 285407.17 ->", "MATCH" if abs((total_dr - total_cr) - 285407.17) < 0.005 else "MISMATCH")
print("TOTAL row in PDF:", total_row)
print("rows with salesman:", sum(1 for p in parsed if p['salesman']),
      "| with phone:", sum(1 for p in parsed if p['phone']),
      "| with bill:", sum(1 for p in parsed if p['lastBillNumber']),
      "| with receipt:", sum(1 for p in parsed if p['lastReceiptDate']))
sm_set = sorted({p['salesman'] for p in parsed if p['salesman']})
print("salesmen:", sm_set)

with open(ROOT + r"\server\seeds\receivables_pdf_152_new.json", 'w', encoding='utf-8') as f:
    json.dump(parsed, f, ensure_ascii=False, indent=1)
print("saved both JSONs")
