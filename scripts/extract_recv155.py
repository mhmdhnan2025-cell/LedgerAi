import json, re, pymupdf

PDF = r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP\finalRecieveable.pdf"
doc = pymupdf.open(PDF)
lines = []
stop = False
for pno, page in enumerate(doc):
    if stop:
        break
    for ln in page.get_text("text").splitlines():
        ln = ln.strip()
        if not ln:
            continue
        if re.match(r"^\d{1,2}/\d{1,2}$", ln) or "Sitsbook" in ln or "lbbook" in ln:
            continue
        if ln.upper().startswith("TOTAL"):
            stop = True
            break
        lines.append((pno + 1, ln))

AMT = re.compile(r"^[\d,]+\.\d{2}$")
DR_FLAG = re.compile(r"^(DR|CR)$")
BAL = re.compile(r"^([\d,]+\.\d{2})\s*(DR|CR)$")
DATE = re.compile(r"^\d{2}-\d{2}(-\d{4})?$")
BARE_YEAR = re.compile(r"^\d{4}$")


def is_data(t: str) -> bool:
    if t in ("NULL", "DR", "CR"):
        return True
    if not re.search(r"[A-Za-z]", t):
        return True
    return False


rows, n, cur = [], 1, None
for pno, ln in lines:
    if ln == str(n) and not cur or (cur is not None and ln == str(n) and len(cur["lines"]) > 0 and cur["sr"] == n - 1):
        pass
    if ln == str(n):
        nxt = n + 1
        if cur is not None and cur["sr"] == n:
            continue
        if cur:
            rows.append(cur)
        cur = {"page": pno, "sr": n, "lines": []}
        n += 1
        continue
    if cur is not None:
        cur["lines"].append(ln)
if cur:
    rows.append(cur)

out = []
for r in rows:
    ls = list(r["lines"])
    emp = None
    if ls and ls[0].startswith("("):
        j = 0
        while j < len(ls) and not ls[j].endswith(")"):
            j += 1
        if j < len(ls):
            emp = " ".join(ls[: j + 1])[1:-1].strip()
            ls = ls[j + 1:]

    bi, bamt, bdr = -1, None, None
    for i in range(len(ls) - 1, -1, -1):
        m = BAL.match(ls[i])
        if m:
            bi, bamt, bdr = i, float(m.group(1).replace(",", "")), m.group(2)
            break
        if i + 1 < len(ls) and DR_FLAG.match(ls[i + 1]) and AMT.match(ls[i]):
            bi, bamt, bdr = i, float(ls[i].replace(",", "")), ls[i + 1]
            break
    tail = ls[:bi] if bi >= 0 else ls

    title = []
    for t in tail:
        if is_data(t):
            break
        title.append(t)

    mcode = bill_no = bill_date = bill_amt = rcpt_date = rcpt_amt = ""
    for t in tail:
        if BAL.match(t):
            continue
        if t in ("NULL",) and not mcode:
            mcode = "NULL"
        elif re.fullmatch(r"\d+", t) and len(t) >= 4 and not mcode:
            mcode = t
        elif DATE.match(t):
            if not bill_date:
                bill_date = t
            elif not rcpt_date:
                rcpt_date = t
        elif AMT.match(t):
            if not bill_amt:
                bill_amt = t
            elif not rcpt_amt:
                rcpt_amt = t
    out.append({"sr": r["sr"], "page": r["page"], "title": " ".join(title), "employee": emp,
                "mcode": mcode, "billNo": bill_no, "billDate": bill_date, "billAmt": bill_amt,
                "rcptDate": rcpt_date, "rcptAmt": rcpt_amt, "amount": bamt, "dr": bdr == "DR" if bdr else None,
                "rawBal": (f"{bamt} {bdr}" if bamt is not None else "")})

srs = [r["sr"] for r in out]
print("rows:", len(out), "unique:", len(set(srs)), "max:", max(srs))
print("missing:", [i for i in range(1, max(srs) + 1) if i not in set(srs)])
dr = sum(r["amount"] for r in out if r["dr"])
cr = sum(r["amount"] for r in out if r["dr"] is False)
print(f"DR={dr:,.2f}  CR={cr:,.2f}  NET={dr-cr:,.2f}   (expect DR=357,555.34)")
bad = [r for r in out if r["amount"] is None or not r["title"] or r["dr"] is None]
print("bad:", len(bad), [(r["sr"], r["rawBal"], r["title"]) for r in bad])
json.dump(out, open(r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP\scripts\recv155_rows.json", "w"), indent=1)
for r in out[:3] + out[10:13] + out[-3:]:
    print(r["sr"], "|", r["title"], "|", r["mcode"], "|", r["rawBal"])
