"""Column-aware parser for customers.pdf (Customers List, 25-10-2026).

Column bands are taken from the printed header x-positions:
  Sr# | Date | Employee | C.Code | Customer | Contact Person | Mobiles | Area | Sector | City
Rows are anchored on the Sr# cell and split at the midpoint between consecutive
anchors, so a wrapped Employee cell (which can start above its own Sr#) and a
wrapped Customer cell can never bleed into the neighbouring row.
"""
import json
import re

import pymupdf

ROOT = r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP"
PDF = ROOT + r"\customers.pdf"

DATA_Y_LO = 145.0
DATA_Y_HI = 760.0

BANDS = [
    ("sr", 0.0, 54.0),
    ("date", 54.0, 101.2),
    ("employee", 101.2, 146.2),
    ("cust", 146.2, 276.8),
    ("contact", 276.8, 342.0),
    ("mobile", 342.0, 414.8),
    ("area", 414.8, 468.8),
    ("sector", 468.8, 523.5),
    ("city", 523.5, 577.5),
    ("off", 577.5, 10000.0),
]

CODE_RE = re.compile(r"^\((\d{10})\)$")
INT_RE = re.compile(r"^\d+$")


def band_of(x):
    for name, lo, hi in BANDS:
        if lo <= x < hi:
            return name
    return None


def parse():
    doc = pymupdf.open(PDF)
    rows = []
    for pno in range(len(doc)):
        words = [w for w in doc[pno].get_text("words") if DATA_Y_LO <= w[1] < DATA_Y_HI]
        anchors = []
        for w in words:
            t = w[4].strip()
            if w[0] < 55 and INT_RE.match(t) and 1 <= int(t) <= 400:
                anchors.append((w[1], int(t)))
        anchors.sort()
        # one sr per row, strictly increasing
        seen = set()
        uniq = []
        for y, n in anchors:
            if n not in seen:
                seen.add(n)
                uniq.append((y, n))
        anchors = uniq
        if not anchors:
            continue

        bounds = []
        for i, (y, _n) in enumerate(anchors):
            lo = (anchors[i - 1][0] + y) / 2 if i else y - 20.0
            hi = (y + anchors[i + 1][0]) / 2 if i + 1 < len(anchors) else y + 60.0
            bounds.append((lo, hi))

        for (lo, hi), (y, sr) in zip(bounds, anchors):
            cells = {k: [] for k, _a, _b in BANDS}
            for w in words:
                if lo <= w[1] < hi:
                    b = band_of(w[0])
                    if b:
                        cells[b].append((w[1], w[0], w[4]))
            for k in cells:
                cells[k].sort()

            code = ""
            cust = []
            for _yy, _xx, t in cells["cust"]:
                m = CODE_RE.match(t.strip())
                if m and not code:
                    code = m.group(1)
                else:
                    cust.append(t)

            raw_mobile = " ".join(t for _y, _x, t in cells["mobile"]).strip()
            raw_mobile = re.sub(r"\s+", " ", raw_mobile)
            # keep the first M-prefixed number as the primary mobile, the rest as alternates
            parts = re.split(r"\s*(?=[MPF]\d*\s*:)", raw_mobile) if raw_mobile else []
            parts = [p.strip() for p in parts if p.strip()]
            primary = ""
            alternates = []
            for i, part in enumerate(parts):
                val = re.sub(r"^[MPF]\d*\s*:\s*", "", part).strip()
                if not primary and i == 0:
                    primary = val
                else:
                    alternates.append(val)
            if not primary and raw_mobile:
                primary = re.sub(r"^[MPF]\d*\s*:\s*", "", raw_mobile).strip()

            rows.append(
                {
                    "srNo": sr,
                    "date": " ".join(t for _y, _x, t in cells["date"]).strip(),
                    "employee": " ".join(t for _y, _x, t in cells["employee"]).strip(),
                    "code": code,
                    "accountTitle": re.sub(r"\s+", " ", " ".join(cust)).strip(),
                    "contactPerson": re.sub(r"\s+", " ", " ".join(t for _y, _x, t in cells["contact"])).strip(),
                    "mobile": primary,
                    "mobile2": " / ".join(alternates),
                    "telephones": raw_mobile,
                    "area": " ".join(t for _y, _x, t in cells["area"]).strip(),
                    "sector": " ".join(t for _y, _x, t in cells["sector"]).strip(),
                    "city": " ".join(t for _y, _x, t in cells["city"]).strip(),
                    "page": pno + 1,
                }
            )
    return rows


def sanity(rows):
    problems = []
    if len(rows) != 343:
        problems.append(f"row count {len(rows)} != 343")
    srs = [r["srNo"] for r in rows]
    if sorted(srs) != list(range(1, 344)):
        problems.append(f"sr sequence broken: {sorted(set(range(1, 344)) - set(srs))}")
    if len(set(srs)) != len(srs):
        problems.append("duplicate sr")
    codes = [r["code"] for r in rows]
    if any(not c for c in codes):
        problems.append(f"missing codes: {[r['srNo'] for r in rows if not r['code']]}")
    if len(set(codes)) != len(codes):
        problems.append("duplicate codes")
    empty = [r["srNo"] for r in rows if not r["accountTitle"]]
    if empty:
        problems.append(f"empty titles: {empty}")
    return problems


if __name__ == "__main__":
    rows = parse()
    probs = sanity(rows)
    geo = [r for r in rows if r["area"] or r["sector"] or r["city"]]
    emp = [r for r in rows if r["employee"]]
    print(f"rows={len(rows)} problems={probs}")
    print(f"with geo(area/sector/city)={len(geo)}")
    print(f"with employee={len(emp)}")
    print(f"with mobile={sum(1 for r in rows if r['mobile'])}")
    print(f"with contact={sum(1 for r in rows if r['contactPerson'])}")
    print("employee values:", sorted({r["employee"] for r in emp}))
    print("geo rows:")
    for r in geo:
        print("  ", r["srNo"], r["code"], r["accountTitle"][:28], "|", r["area"], "|", r["sector"], "|", r["city"])
    print("first:", json.dumps(rows[0], ensure_ascii=False))
    print("last :", json.dumps(rows[-1], ensure_ascii=False))
    if not probs:
        with open(ROOT + r"\server\seeds\customers_pdf_343.json", "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2, ensure_ascii=False)
        print("wrote server/seeds/customers_pdf_343.json")
