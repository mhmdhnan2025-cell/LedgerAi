import urllib.request
import json
import sys

BASE_URL = 'https://ledgerai-production-ba44.up.railway.app'

def make_req(path, data=None, token=None, method=None):
    url = BASE_URL + path
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers, method=method)
    body = json.dumps(data).encode('utf-8') if data is not None else None
    try:
        with urllib.request.urlopen(req, data=body) as res:
            res_body = res.read().decode('utf-8')
            try:
                return res.status, json.loads(res_body)
            except:
                return res.status, res_body
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(res_body)
        except:
            return e.code, res_body

print('=' * 60)
print('VERIFYING SECURITY RULES & USER PERMISSIONS')
print('=' * 60)

# 1. Verify Data Integrity
status, db_all = make_req('/api/db/all')
assert status == 200, f'Failed /api/db/all: {db_all}'
sales = db_all.get('saleBills', [])
purchases = db_all.get('purchaseBills', [])
vouchers = db_all.get('vouchers', [])
payments = db_all.get('payments', [])
print(f'1. Data Integrity Check:')
print(f'   Sales Bills: {len(sales)} (Expected 117)')
print(f'   Purchase Bills: {len(purchases)} (Expected 42)')
print(f'   Vouchers Count: {len(vouchers)}')
print(f'   Payments Count: {len(payments)}')
assert len(sales) == 117, f'Expected 117 sales bills, got {len(sales)}'
assert len(purchases) == 42, f'Expected 42 purchase bills, got {len(purchases)}'

# 2. Login as Admin (qamar99)
print('\n2. Logging in as Admin (qamar99):')
status, admin_login = make_req('/api/auth/login', {'username': 'qamar99', 'password': 'admin'})
if status != 200:
    status, admin_login = make_req('/api/auth/login', {'username': 'qamar99', 'password': 'qamarabbas'})
assert status == 200, f'Admin login failed: {admin_login}'
admin_token = admin_login['token']
admin_user = admin_login['user']
print(f"   Logged in as Admin: {admin_user['name']} ({admin_user['username']}, Role: {admin_user['role']})")

# 3. Check Users List - Confirm anjum abbas / qamarabbas is completely deleted
print('\n3. Verifying User Accounts List:')
status, users_res = make_req('/api/company/users', token=admin_token)
assert status == 200, f'Failed to fetch users: {users_res}'
users = users_res.get('users', [])
print(f'   Total Active Users: {len(users)}')
for u in users:
    print(f"   - {u.get('name')} | Username: {u.get('username')} | Role: {u.get('role')}")
    assert u.get('username') != 'qamarabbas', f"Second admin account 'qamarabbas' should be deleted, but found in users!"
    assert u.get('id') != 'usr-1790787310391', f"Account usr-1790787310391 should be deleted, but found!"

# Find accountant user
accountant = next((u for u in users if u.get('role') == 'Accountant'), None)
assert accountant is not None, "At least one accountant account must exist for testing!"
print(f"   Accountant account identified: {accountant['name']} ({accountant['username']})")

# 4. Test Admin Switch to Accountant
print('\n4. Testing Admin switching to Accountant:')
status, switch_res = make_req('/api/auth/switch-user', {'targetUserId': accountant['id']}, token=admin_token)
assert status == 200, f'Admin switch to accountant failed: {switch_res}'
staff_token = switch_res['token']
staff_user = switch_res['user']
print(f"   Successfully switched to staff user: {staff_user['name']} (Role: {staff_user['role']})")

# 5. Test Non-Admin switching to Admin (MUST BE FORBIDDEN)
print('\n5. Testing Accountant attempting to switch to Admin:')
status, fail_switch = make_req('/api/auth/switch-user', {'targetUserId': admin_user['id']}, token=staff_token)
print(f"   Switch to Admin status: {status} (Expected 403 Forbidden)")
assert status == 403, f'Accountant should NOT be able to switch to Admin, got {status}'

# 6. Test Date Restrictions for Accountant on Vouchers
print('\n6. Testing Date Restrictions on Vouchers for Accountant:')
if vouchers:
    # Pick a past voucher
    past_voucher = None
    today = '2026-10-29'
    for v in vouchers:
        v_date = v.get('date', '')
        if v_date and v_date != today and not v_date.startswith(today):
            past_voucher = v
            break
    
    if past_voucher:
        print(f"   Testing with past voucher #{past_voucher.get('voucherNumberFormatted')} (Date: {past_voucher.get('date')})")
        # Accountant tries to delete past voucher -> MUST FAIL (400/403)
        status, del_res = make_req(f"/api/vouchers/{past_voucher['id']}", token=staff_token, method='DELETE')
        print(f"   Accountant deleting past voucher status: {status} (Expected 400/403)")
        assert status in (400, 403), f'Accountant should not delete past voucher, got {status}: {del_res}'
        
        # Accountant tries to edit past voucher -> MUST FAIL (400/403)
        status, edit_res = make_req(f"/api/vouchers/{past_voucher['id']}", {'narration': 'Tampered by accountant'}, token=staff_token, method='PUT')
        print(f"   Accountant editing past voucher status: {status} (Expected 400/403)")
        assert status in (400, 403), f'Accountant should not edit past voucher, got {status}: {edit_res}'
    else:
        print("   (No past vouchers found, skipping past voucher check)")

# 7. Test Admin unrestricted access to edit/delete vouchers
print('\n7. Testing Admin Voucher Access (Unrestricted):')
# Create a test voucher as Admin
test_vch_payload = {
    'voucherType': 'CR',
    'date': '2026-10-01', # Past date!
    'totalAmount': 50,
    'entries': [
        {'accountId': '0101010001', 'accountTitle': 'Main Cash Box', 'accountType': 'Cash', 'debit': 50, 'credit': 0, 'amount': 50, 'narration': 'Test past voucher'}
    ]
}
status, created_vch = make_req('/api/vouchers', test_vch_payload, token=admin_token)
assert status in (200, 201), f'Admin creating past voucher failed: {created_vch}'
vch_id = created_vch['id']
print(f"   Admin created test past voucher: {created_vch.get('voucherNumberFormatted')} (Date: {created_vch.get('date')})")

# Accountant tries to delete this past voucher -> MUST FAIL
status, staff_del_vch = make_req(f"/api/vouchers/{vch_id}", token=staff_token, method='DELETE')
print(f"   Accountant deleting admin's past voucher status: {status} (Expected 400/403)")
assert status in (400, 403), f'Accountant should be blocked from deleting past voucher, got {status}'

# Admin deletes the past voucher -> MUST SUCCEED
status, admin_del_vch = make_req(f"/api/vouchers/{vch_id}", token=admin_token, method='DELETE')
print(f"   Admin deleting past voucher status: {status} (Expected 200)")
assert status == 200, f'Admin should be able to delete past voucher anytime, got {status}: {admin_del_vch}'

print('\n' + '=' * 60)
print('ALL SECURITY RULES & PERMISSIONS VERIFIED 100% SUCCESSFULLY!')
print('=' * 60)
