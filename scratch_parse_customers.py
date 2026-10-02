import pypdf
import re
import json
import os

pdf_path = r'C:/Users/Mr.Developer/.gemini/antigravity/brain/11287cbe-72a9-4734-a0b4-ef952ccc9a6e/.user_uploaded/media_1790695656876.pdf'
reader = pypdf.PdfReader(pdf_path)

pages_body = []
for page_idx, p in enumerate(reader.pages):
    lines = [l.strip() for l in p.extract_text().split('\n') if l.strip()]
    body_lines = []
    for l in lines:
        if 'ZAHRAT AL FAJR' in l or 'z.alfajr' in l or 'Customers List [' in l or 'Sr# Date' in l or 'Person Mobiles' in l:
            continue
        if 'Sit Solution' in l or 'customers-report.php' in l:
            continue
        body_lines.append(l)
    pages_body.append(body_lines)

# Fix page 18: 'SERVICES LLC' belongs to customer 280 (page 17)
services_llc = pages_body[17].pop(0)
pages_body[16].append(services_llc)

# Fix page 21: 'GORKHA', 'KITCHEN' belongs to customer 326 (page 20)
g1 = pages_body[20].pop(0)
g2 = pages_body[20].pop(0)
pages_body[19].append(g1 + ' ' + g2)

all_lines = []
for pb in pages_body:
    all_lines.extend(pb)

all_text = '\n'.join(all_lines)

entry_starts = []
for m in re.finditer(r'(?:^|\n)(\d{1,3})\s+(\d{2}/\d{2}/-?\d{4})', all_text):
    entry_starts.append((m.start(), int(m.group(1)), m.group(2)))

known_contacts = {
    48: 'MAROOF',
    166: 'Aashiq Ali',
    274: 'Ramz Al Madina',
    275: 'Rukan Al Reyan',
    276: 'Najoom Al Bataya',
    295: 'JAKARIYA JONY',
    297: 'bharat',
    318: 'MURAD BHI',
    323: 'TOQEER AHMAD',
    327: 'NAEEM AHMED'
}

def determine_group(name):
    n = name.lower()
    if 'rest' in n or 'kitchen' in n or 'baba' in n or 'darbar' in n or 'broast' in n or 'chaska' in n:
        return 'Restaurants'
    if 'cafe' in n or 'tea' in n or 'chai' in n:
        return 'Cafeterias & Fast Food'
    if 'super' in n or 'market' in n or 'grocery' in n or 'baqala' in n:
        return 'Supermarkets'
    if 'trad' in n or 'foodstuff' in n or 'co.llc' in n or 'tr l.l.c' in n:
        return 'Wholesale Traders'
    if 'bakery' in n or 'baker' in n or 'makhbaz' in n:
        return 'Bakery'
    if 'cater' in n:
        return 'Catering Services'
    if 'carpentry' in n or 'interior' in n or 'demolition' in n:
        return 'Commercial & Services'
    return 'Restaurants'

customers = []
for i in range(len(entry_starts)):
    pos, sr, dt = entry_starts[i]
    next_pos = entry_starts[i+1][0] if i+1 < len(entry_starts) else len(all_text)
    chunk = all_text[pos:next_pos].strip()
    
    code_match = re.search(r'\((\d{10})\)', chunk)
    code = code_match.group(1) if code_match else f'010104{sr:04d}'
    
    chunk_before = chunk[:code_match.start()].strip() if code_match else ''
    before_lines = [l.strip() for l in chunk_before.split('\n') if l.strip()]
    emp = ''
    if before_lines:
        first_l = re.sub(r'^\d+\s+\d{2}/\d{2}/-?\d{4}\s*', '', before_lines[0]).strip()
        parts = ([first_l] if first_l else []) + before_lines[1:]
        emp = ' '.join(parts).strip()
        
    chunk_after = chunk[code_match.end():].strip() if code_match else ''
    
    # Split on M1:
    m1_idx = chunk_after.find('M1:')
    if m1_idx != -1:
        before_m1 = chunk_after[:m1_idx].strip()
        from_m1 = chunk_after[m1_idx:].strip()
    else:
        before_m1 = chunk_after
        from_m1 = ''
        
    contact_person = known_contacts.get(sr, '')

    # Special handling for cust 280: "TASTY EATS CATERING SERVICES LLC"
    if sr == 280:
        before_m1 = "TASTY EATS CATERING SERVICES LLC"
        from_m1 = "M1:"
    elif sr == 326:
        before_m1 = "GORKHA KITCHEN"
        from_m1 = "M1:"
        
    # Parse mobile and location
    # Extract phone numbers
    phones = re.findall(r'(?:M1:|M2:|Ph:)\s*([^\s\n]+)', from_m1)
    primary_mobile = ''
    if phones:
        p = phones[0].strip()
        if p.upper() != 'NULL' and p not in ['0', 'SERVICES', 'GORKHA']:
            primary_mobile = p
            
    # Check location after phones in from_m1
    rem_after_phones = re.sub(r'(?:M1:|M2:|Ph:)\s*[^\s\n]+', '', from_m1).strip()
    area = ''
    sector = ''
    city = 'Sharjah'
    
    if 'Sharjah' in rem_after_phones or 'Sajjah' in rem_after_phones or 'Bataya' in rem_after_phones:
        loc_parts = rem_after_phones.split()
        if 'Sajjah' in loc_parts:
            area = 'Sajjah'
            sector = 'Sajjah'
            city = 'Sharjah'
        elif 'Bataya' in loc_parts:
            area = 'Bataya'
            sector = 'Bataya'
            city = 'Sharjah'
            
    # Clean customer name
    cust_name = before_m1
    if contact_person:
        # Strip contact_person from end of cust_name
        pattern = re.compile(rf'\b{re.escape(contact_person)}\b', re.IGNORECASE)
        # only replace if not the entire name
        if cust_name.strip().lower() != contact_person.lower():
            cust_name = pattern.sub('', cust_name).strip()
            
    # Clean up newlines in customer name
    cust_name = ' '.join([l.strip() for l in cust_name.split('\n') if l.strip()])
    
    # In some records like 274, 275, 276 the customer name might be repeated if contact person was same
    if sr in [274, 275, 276]:
        parts = cust_name.split()
        half = len(parts) // 2
        if half > 0 and parts[:half] == parts[half:]:
            cust_name = ' '.join(parts[:half])
            
    reg_date = '2026-04-18'
    if dt.endswith('2026'):
        d_parts = dt.split('/')
        if len(d_parts) == 3:
            reg_date = f'{d_parts[2]}-{d_parts[1]}-{d_parts[0]}'
            
    group = determine_group(cust_name)
    
    cust_obj = {
        'id': f'cust-{sr}',
        'code': code,
        'accountCode': code,
        'manualCode': '',
        'accountTitle': cust_name,
        'name': cust_name,
        'title': cust_name,
        'customerGroup': group,
        'regDate': reg_date,
        'contactPerson': contact_person,
        'mobile': primary_mobile,
        'city': city,
        'area': area or 'Sajja Industrial Area',
        'sector': sector or 'Sector 1',
        'location': area or 'Sajja Industrial Area',
        'address': f'{city} {area or "Sajja Industrial Area"}',
        'assignedSalesman': emp,
        'status': 'ACTIVE',
        'outstandingBalance': 0.0,
        'creditLimit': 25000,
        'totalSales': 0.0,
        'createdAt': reg_date
    }
    customers.append(cust_obj)

print(f'Total customers generated: {len(customers)}')
out_path = r'C:/Users/Mr.Developer/Downloads/Restraunt_ERP/data/all_329_customers.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(customers, f, indent=2, ensure_ascii=False)

print('Saved successfully to', out_path)
