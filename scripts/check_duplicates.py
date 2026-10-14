# Let's inspect the 337 customers in database.json and verify each one
import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])
print(f"Current total customers: {len(custs)}")

# If len is 339, remove 338 and 339
valid_custs = custs[:337]

# Let's check duplicate codes or names
codes = {}
titles = {}
for i, c in enumerate(valid_custs):
    code = c.get('code')
    title = c.get('accountTitle', '').strip().lower()
    if code in codes:
        print(f"Duplicate code {code}: index {codes[code]} and {i}")
    codes[code] = i
    if title in titles:
        print(f"Duplicate title '{title}': index {titles[title]} and {i} (codes: {valid_custs[titles[title]].get('code')} vs {code})")
    titles[title] = i

print(f"Unique codes: {len(codes)}")
print(f"Unique titles: {len(titles)}")
