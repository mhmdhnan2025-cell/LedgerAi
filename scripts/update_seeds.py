import json
import os

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

custs = db['customers']
print(f"Loaded {len(custs)} clean customers.")

seed_paths = [
    'server/seeds/all_337_customers.json',
    'dist/seeds/all_337_customers.json',
    'data/all_337_customers.json'
]

for sp in seed_paths:
    os.makedirs(os.path.dirname(sp), exist_ok=True)
    with open(sp, 'w', encoding='utf-8') as f:
        json.dump(custs, f, indent=2, ensure_ascii=False)
    print(f"Written {len(custs)} clean customers to {sp}")

print("Seeds updated successfully.")
