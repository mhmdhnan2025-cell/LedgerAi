import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db.get('customers', [])
print(f"Total customers in database.json: {len(custs)}")

# Check customer codes and titles
for i in range(len(custs)):
    c = custs[i]
    sr = c.get('srNo')
    code = c.get('code')
    title = c.get('accountTitle')
    # print sample or any weird ones
    if i < 15 or i > 330:
        print(f"{i+1}: srNo={sr}, code={code}, title={title}")
