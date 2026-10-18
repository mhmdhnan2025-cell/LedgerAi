"""Robust parser for recievable.pdf (Party Receivable) and payable.pdf (Party Payables).

Column bands come from the PDF's own vertical grid lines (recievable) or from the
header layout (payable). Numeric/date cells are attached to the NEAREST S.NO
anchor row, while the multi-line TITLE cell is split by the mid-point between
consecutive anchors - so no two neighbouring rows can ever bleed into each other.
"""
import json
import re
import sys

import pymupdf

ROOT = r"C:\Users\Mr.Developer\Downloads\Restraunt_ERP"


def words_of(page):
    return sorted(page.get_text("words"), key=lambda w: (round(w[1], 1), w[0]))


def is_digits(t):
    return bool(t) and t.strip().isdigit()


def num(t):
    t = str(t).replace(",", "").strip()
    if not t:
        return 0.0
    try:
        return float(t)
    except ValueError:
        return 0.0


def fixdate(parts):
    parts = [p for p in parts if p]
    if not parts:
        return ""
    txt = "".join(parts) if parts[0].endswith("-") else " ".join(parts)
    return txt.replace(" ", "")


def group_lines(ws):
    lines = []
    for w in sorted(ws, key=lambda w: (w[1], w[0])):
        y = w[1]
        if lines and abs(lines[-1]["y"] - y) < 3.0:
            lines[-1]["words"].append(w)
        else:
            lines.append({"y": y, "words": [w]})
    out = []
    for ln in lines:
        ln["words"].sort(key=lambda w: w[0])
        out.append((ln["y"], " ".join(w[4] for w in ln["words"])))
    return out


PHONE_LINE = re.compile(r"^[+\d][\d\s\-().*]*$")
PAREN_LINE = re.compile(r"^\(.*\)$")
HEADER_TOKENS = {"TITLE", "ACCOUNT", "S.NO", "M.CODE", "LASTBILL#"}
NULL_LINE = re.compile(r"^null$", re.I)


def _is_phone_line(t):
    if NULL_LINE.match(t):
        return True
    return bool(PHONE_LINE.match(t)) and any(c.isdigit() for c in t) and not re.search(r"[A-Za-z]{2,}", t)


def split_title_cell(line_texts):
    """Extract (salesman, title, phone).

    The salesman cell is parenthesised and may wrap across several physical
    lines, e.g. ``(Hafiz Abdul`` + ``Qadeer)`` - so the span is consumed until
    the closing parenthesis instead of line by line.
    """
    texts = []
    for _y, text in line_texts:
        t = " ".join(text.split())
        if t and t.upper() not in HEADER_TOKENS:
            texts.append(t)

    salesman = ""
    if texts and texts[0].startswith("("):
        acc = ""
        idx = 0
        closed = False
        while idx < len(texts):
            acc = (acc + " " + texts[idx]).strip() if acc else texts[idx]
            idx += 1
            if acc.endswith(")"):
                closed = True
                break
            if idx >= 3:
                break
        if closed:
            salesman = " ".join(acc[1:-1].split())
            texts = texts[idx:]

    phone_parts = []
    title_parts = []
    for t in texts:
        if PAREN_LINE.match(t):
            inner = " ".join(t[1:-1].split())
            if inner and not salesman:
                salesman = inner
            continue
        if _is_phone_line(t):
            phone_parts.append(t)
            continue
        title_parts.append(t)

    real = [p for p in phone_parts if not NULL_LINE.match(p)]
    phone_parts = real if real else phone_parts

    return salesman, " ".join(title_parts), " ".join(phone_parts)


def anchors_for(page, x_lo, x_hi, y_lo, y_hi):
    out = []
    for w in page.get_text("words"):
        if x_lo <= w[0] < x_hi and is_digits(w[4]):
            if y_lo < w[1] < y_hi:
                out.append((w[1], int(w[4])))
    out.sort()
    return out


def assign_title_lines(lines, anchors, min_gap=15.0, window=35.0):
    """Split the TITLE cell's physical lines between consecutive rows.

    Cells are vertically centred on their S.NO anchor and separated by a gap of
    ~16pt while lines inside one cell sit 12pt apart - so the boundary is taken
    at the gap nearest the anchor mid-point that is at least ``min_gap`` wide.
    A plain mid-point split is only used when no such gap exists.
    """
    n = len(anchors)
    blocks = []
    idx = 0
    for i, (ay, _sno) in enumerate(anchors):
        if i == n - 1:
            blocks.append(lines[idx:])
            idx = len(lines)
            break
        mid = (ay + anchors[i + 1][0]) / 2.0
        best = None
        plain = None
        for k in range(idx, max(idx, len(lines) - 1)):
            if k + 1 >= len(lines):
                break
            gap = lines[k + 1][0] - lines[k][0]
            center = (lines[k][0] + lines[k + 1][0]) / 2.0
            if center > mid + window:
                break
            if center < mid - window:
                continue
            if plain is None or abs(center - mid) < plain[0]:
                plain = (abs(center - mid), k)
            if gap >= min_gap and (best is None or abs(center - mid) < best[0]):
                best = (abs(center - mid), k)
        if best is not None:
            cut = best[1] + 1
        elif plain is not None:
            cut = plain[1] + 1
        else:
            cut = idx
            while cut < len(lines) and lines[cut][0] < mid:
                cut += 1
        if cut <= idx and idx < len(lines):
            cut = idx + 1
        blocks.append(lines[idx:cut])
        idx = cut
    if idx < len(lines) and blocks:
        blocks[-1].extend(lines[idx:])
    while len(blocks) < n:
        blocks.append([])
    return blocks[:n]


# --------------------------------------------------------------------------
# recievable.pdf
# --------------------------------------------------------------------------
REC_GRID = [34.5, 68.5, 120.0, 203.0, 272.0, 324.0, 382.0, 438.0, 496.0, 561.0]
REC_COLS = list(
    zip(
        [
            "sno",
            "mcode",
            "title",
            "lastBillNumber",
            "lastBillDate",
            "lastBillAmount",
            "lastReceiptDate",
            "lastReceiptAmount",
            "balance",
        ],
        REC_GRID[:-1],
        REC_GRID[1:],
    )
)


def parse_recievable(path=f"{ROOT}\\recievable.pdf"):
    doc = pymupdf.open(path)
    rows = []
    for page in doc:
        ws = words_of(page)
        anchors = anchors_for(page, REC_GRID[0], REC_GRID[1], 60, 810)
        if not anchors:
            continue
        ay0, ayN = anchors[0][0], anchors[-1][0]
        # bottom of the page header band (header words live in every column)
        header_bottom = max(
            [w[1] for w in ws if w[1] < ay0 - 20 and w[0] >= 60 and not (120.0 <= w[0] < 203.0)] or [0]
        )
        # every physical line of the TITLE column for this page (header removed)
        title_lines = [
            (y, t)
            for y, t in group_lines([w for w in ws if 120.0 <= w[0] < 203.0 and w[1] > header_bottom])
            if y <= ayN + 45 and t.strip().rstrip(":").lower() != "total"
        ]
        blocks = assign_title_lines(title_lines, anchors)

        for i, (ay, sno) in enumerate(anchors):
            cells = {name: [] for name, _a, _b in REC_COLS}
            for w in ws:
                x0, y = w[0], w[1]
                if 120.0 <= x0 < 203.0:
                    continue
                j = min(range(len(anchors)), key=lambda k: abs(anchors[k][0] - y))
                if abs(anchors[j][0] - y) > 15.0 or anchors[j][0] != ay:
                    continue
                for name, a, b in REC_COLS:
                    if name == "title":
                        continue
                    if a <= x0 < b:
                        cells[name].append(w)
                        break

            salesman, title, phone = split_title_cell(blocks[i])

            def parts(name):
                return [w[4] for w in sorted(cells[name], key=lambda w: (w[1], w[0]))]

            def joined(name):
                return " ".join(parts(name)).strip()

            bal_txt = joined("balance")
            m = re.search(r"([0-9][0-9,]*\.?[0-9]*)\s*(DR|CR)?", bal_txt)
            rows.append(
                {
                    "sNo": sno,
                    "mCode": "",
                    "salesman": salesman,
                    "title": title,
                    "phone": phone,
                    "lastBillNumber": joined("lastBillNumber"),
                    "lastBillDate": fixdate(parts("lastBillDate")),
                    "lastBillAmount": num(joined("lastBillAmount")),
                    "lastReceiptDate": fixdate(parts("lastReceiptDate")),
                    "lastReceiptAmount": num(joined("lastReceiptAmount")),
                    "balance": round(num(m.group(1)) if m else 0.0, 2),
                    "balanceType": (m.group(2) if m and m.group(2) else "DR"),
                }
            )
    doc.close()
    rows.sort(key=lambda r: r["sNo"])
    return rows


# --------------------------------------------------------------------------
# payable.pdf
# --------------------------------------------------------------------------
PAY_COLS = [
    ("sno", 0, 60),
    ("title", 60, 146),
    ("lastBillNumber", 146, 177),
    ("lastBillDate", 177, 226),
    ("lastBillAmount", 226, 275),
    ("lastPaymentDate", 275, 325),
    ("paymentAmount", 325, 375),
    ("ledgerBalance", 375, 432),
    ("postDatedPayments", 432, 487),
    ("postDatedReceipts", 487, 535),
    ("adjustedLedgerBalance", 535, 9999),
]


def parse_payable(path=f"{ROOT}\\payable.pdf"):
    doc = pymupdf.open(path)
    rows = []
    for page in doc:
        ws = words_of(page)
        anchors = anchors_for(page, 0, 60, 60, 760)
        if not anchors:
            continue
        ay0, ayN = anchors[0][0], anchors[-1][0]
        header_bottom = max(
            [w[1] for w in ws if w[1] < ay0 - 20 and w[0] >= 60 and not (60.0 <= w[0] < 144.0)] or [0]
        )
        title_lines = [
            (y, t)
            for y, t in group_lines([w for w in ws if 60.0 <= w[0] < 144.0 and w[1] > header_bottom])
            if y <= ayN + 20 and t.strip().rstrip(":").lower() != "total"
        ]
        blocks = assign_title_lines(title_lines, anchors)

        for i, (ay, sno) in enumerate(anchors):
            cells = {name: [] for name, _a, _b in PAY_COLS}
            for w in ws:
                x0, y = w[0], w[1]
                if 60.0 <= x0 < 144.0:
                    continue
                j = min(range(len(anchors)), key=lambda k: abs(anchors[k][0] - y))
                if abs(anchors[j][0] - y) > 7.0 or anchors[j][0] != ay:
                    continue
                for name, a, b in PAY_COLS:
                    if name == "title":
                        continue
                    if a <= x0 < b:
                        cells[name].append(w)
                        break

            title = " ".join(t for _y, t in blocks[i] if t.upper() not in HEADER_TOKENS)

            def parts(name):
                return [w[4] for w in sorted(cells[name], key=lambda w: (w[1], w[0]))]

            def joined(name):
                return " ".join(parts(name)).strip()

            def parse_bal(name, default):
                txt = joined(name)
                m = re.search(r"([0-9][0-9,]*\.?[0-9]*)\s*(DR|CR)?", txt)
                if not m:
                    return 0.0, default
                return round(num(m.group(1)), 2), (m.group(2) or default)

            bal, btype = parse_bal("ledgerBalance", "CR")
            adj, adj_type = parse_bal("adjustedLedgerBalance", btype)
            rows.append(
                {
                    "sNo": sno,
                    "title": " ".join(title.split()),
                    "lastBillNumber": joined("lastBillNumber"),
                    "lastBillDate": fixdate(parts("lastBillDate")),
                    "lastBillAmount": num(joined("lastBillAmount")),
                    "lastPaymentDate": fixdate(parts("lastPaymentDate")),
                    "paymentAmount": num(joined("paymentAmount")),
                    "balance": bal,
                    "balanceType": btype,
                    "postDatedPayments": num(joined("postDatedPayments")),
                    "postDatedReceipts": num(joined("postDatedReceipts")),
                    "adjustedLedgerBalance": adj,
                    "adjustedLedgerBalanceType": adj_type,
                }
            )
    doc.close()
    rows.sort(key=lambda r: r["sNo"])
    return rows


def signed(rows, key="balance", tkey="balanceType"):
    return round(sum(r[key] if r[tkey] == "DR" else -r[key] for r in rows), 2)


def sanity(rows):
    bad = []
    for r in rows:
        t = r["title"]
        stray = ")" in t or "NULL" in t.upper() or ("(" in t and not t.rstrip().endswith("("))
        if not t.strip() or stray:
            bad.append((r["sNo"], t, r.get("phone", "")))
        ph = str(r.get("phone") or "")
        if ph != "NULL" and re.search(r"[A-Za-z]{3,}", ph):
            bad.append((r["sNo"], t, ph))
    return bad


def crosscheck_337(rec, pay):
    """Compare parsed receivable titles against the 337-customer master list."""
    try:
        with open(f"{ROOT}\\server\\seeds\\customers_pdf_337_new.json", encoding="utf-8") as f:
            cust = json.load(f)
    except OSError:
        return []
    def norm(s):
        return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()
    by_phone, by_title = {}, {}
    for c in cust:
        ph = re.sub(r"\D", "", str(c.get("mobileRaw") or ""))
        if len(ph) >= 6:
            by_phone.setdefault(ph, c)
        by_title.setdefault(norm(c.get("name")), c)
    unmatched = []
    for r in rec:
        ph = re.sub(r"\D", "", r.get("phone") or "")
        hit = by_phone.get(ph) if len(ph) >= 6 else None
        if not hit:
            hit = by_title.get(norm(r["title"]))
        if not hit:
            unmatched.append((r["sNo"], r["title"], r.get("phone")))
    return unmatched


def crosscheck_suppliers(pay):
    """Payable titles are visually clipped to ~20 chars by the PDF column, so
    match them as prefixes of the supplier master."""
    try:
        with open(f"{ROOT}\\server\\seeds\\zafr_supplier_data.ts", encoding="utf-8") as f:
            raw = f.read()
    except OSError:
        return [], []
    sup = []
    for frag in re.findall(r"\{[^{}]*\}", raw):
        try:
            sup.append(json.loads(frag))
        except ValueError:
            continue
    def norm(t):
        return re.sub(r"[^a-z0-9]+", " ", str(t).lower()).strip()
    # PDF column clips titles at ~20 chars and OCR mangles a few of them
    aliases = {
        "golden rise trading": "Golden Rice Trading",
        "local qfs": "Local OFS",
        "qamar al madiana who": "Qamar Al Madians",
    }
    matched, problems = {}, []
    for r in pay:
        n = norm(r["title"])
        probe = norm(aliases.get(n, n))
        cand = [s for s in sup if norm(s.get("title", "")).startswith(probe) or probe.startswith(norm(s.get("title", "")))]
        if len(cand) == 1:
            matched[r["sNo"]] = cand[0]
        else:
            problems.append((r["sNo"], r["title"], len(cand)))
    return matched, problems


if __name__ == "__main__":
    rec = parse_recievable()
    expect = 302163.55
    snos = [r["sNo"] for r in rec]
    missing = [i for i in range(1, 153) if i not in snos]
    empty = [r["sNo"] for r in rec if not r["title"].strip()]
    net = signed(rec)
    bad_rec = sanity(rec)
    unmatched = crosscheck_337(rec, None)
    print(f"[receivable] rows={len(rec)} missing={missing} empty_titles={empty}")
    print(f"[receivable] NET={net} expected={expect}")
    print(f"[receivable] sanity_fail={bad_rec}")
    print(f"[receivable] unmatched_vs_337={unmatched}")
    titles = [r["title"] for r in rec]
    print("[receivable] dup titles:", [t for t in set(titles) if titles.count(t) > 1])
    if not missing and not empty and not bad_rec and abs(net - expect) < 0.005:
        with open(f"{ROOT}\\server\\seeds\\receivables_pdf_152_final.json", "w", encoding="utf-8") as f:
            json.dump(rec, f, indent=2, ensure_ascii=False)
        print("wrote receivables_pdf_152_final.json")

    pay = parse_payable()
    pnet = signed(pay)
    padj = signed(pay, "adjustedLedgerBalance", "adjustedLedgerBalanceType")
    pcr = round(-pnet, 2)
    pmiss = [i for i in range(1, 41) if i not in [r["sNo"] for r in pay]]
    pempty = [r["sNo"] for r in pay if not r["title"].strip()]
    bad_pay = sanity(pay)
    print(f"[payable] rows={len(pay)} missing={pmiss} empty_titles={pempty}")
    print(f"[payable] sanity_fail={bad_pay}")
    print(f"[payable] CR total(ledger)={pcr} CR total(adjusted)={round(-padj, 2)} expected=1096568.86")
    sup_map, sup_problems = crosscheck_suppliers(pay)
    print(f"[payable] supplier_match={len(sup_map)}/40 problems={sup_problems}")
    if not pmiss and not pempty and not bad_pay:
        out = []
        for r in pay:
            r = dict(r)
            s = sup_map.get(r["sNo"])
            r["fullTitle"] = s["title"] if s else r["title"]
            r["supplierId"] = s["id"] if s else ""
            r["supplierCode"] = s["code"] if s else ""
            out.append(r)
        with open(f"{ROOT}\\server\\seeds\\payables_pdf_final.json", "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        print("wrote payables_pdf_final.json")

    ok = (
        len(rec) == 152
        and not missing
        and not empty
        and not bad_rec
        and abs(net - expect) < 0.005
        and len(pay) == 40
        and not pmiss
        and not bad_pay
        and (abs(pcr - 1096568.86) < 0.005 or abs(-padj - 1096568.86) < 0.005)
    )
    print("ALL CHECKS PASSED" if ok else "CHECKS FAILED")
    sys.exit(0 if ok else 1)
