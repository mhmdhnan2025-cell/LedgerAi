import json, re, unicodedata

ROOT = r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP"


def norm(s):
    s = unicodedata.normalize("NFKD", (s or "")).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


rows = json.load(open(ROOT + r"\scripts\recv155_rows.json", encoding="utf-8"))
cust = json.load(open(ROOT + r"\server\seeds\customers_pdf_343.json", encoding="utf-8"))
ten = json.load(open(ROOT + r"\data\database_comp-muocj00t-j3co.json", encoding="utf-8"))
by_id = {c["id"]: c for c in ten["customers"]}

cmap = {}
for c in cust:
    for k in ("accountTitle", "title", "name", "account_title"):
        n = norm(c.get(k, ""))
        if n:
            cmap.setdefault(n, []).append(c)

out, used, dup = [], set(), []
for r in rows:
    t = norm(r["title"])
    cands = cmap.get(t)
    method = "exact"
    if not cands:
        cands = [c for k, v in cmap.items()
                 if k.startswith(t) or t.startswith(k) or k in t or t in k
                 for c in v]
        method = "fuzzy"
    if not cands:
        raise SystemExit(f"unmatched sr={r['sr']} title={r['title']!r}")
    if len(cands) != 1:
        raise SystemExit(f"ambiguous sr={r['sr']} title={r['title']!r} -> {[c['accountTitle'] for c in cands]}")
    c = cands[0]
    if c["code"] in used:
        raise SystemExit(f"duplicate customer code {c['code']} for sr={r['sr']}")
    used.add(c["code"])
    if method != "exact":
        dup.append((r["sr"], r["title"], c["accountTitle"]))
    out.append({
        "sNo": r["sr"],
        "code": c["code"],
        "customerId": by_id.get(norm(c["accountTitle"]) and "", "") or "",
        "mCode": r["mcode"],
        "salesman": r["employee"] or "",
        "title": r["title"],
        "phone": r["mcode"],
        "lastBillNumber": r["billNo"],
        "lastBillDate": r["billDate"],
        "lastBillAmount": float(r["billAmt"].replace(",", "")) if r["billAmt"] else 0.0,
        "lastReceiptDate": r["rcptDate"],
        "lastReceiptAmount": float(r["rcptAmt"].replace(",", "")) if r["rcptAmt"] else 0.0,
        "balance": round(float(r["amount"]), 2),
        "balanceType": "DR" if r["dr"] else "CR",
    })

out.sort(key=lambda x: x["sNo"])
for e in out:
    m = [c for c in ten["customers"] if c.get("code") == e["code"] or c.get("accountTitle", "").lower() == e["title"].lower()]
    e["customerId"] = m[0]["id"] if m else ""

dr = sum(e["balance"] for e in out if e["balanceType"] == "DR")
cr = sum(e["balance"] for e in out if e["balanceType"] == "CR")
print(f"rows={len(out)} uniqueCodes={len({e['code'] for e in out})} DR={dr:,.2f} CR={cr:,.2f} NET={dr-cr:,.2f}")
print("fuzzy matches:", len(dup))
for d in dup:
    print("   ", d)
noId = [e for e in out if not e["customerId"]]
print("no customerId:", [(e['sNo'], e['title']) for e in noId])

json.dump(out, open(ROOT + r"\server\seeds\receivables_pdf_155_final.json", "w"), indent=1, ensure_ascii=False)
print("wrote server/seeds/receivables_pdf_155_final.json")
