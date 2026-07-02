#!/usr/bin/env python3
"""
excel_to_json.py — CVN Word World vocabulary converter (multi-month)

Reads EVERY sheet in the Excel file. Each sheet name = a month
(JUNE, JULY, AUG ...). Layout per sheet (same as before):

  Row 1: (blank) K1 K2 K3 P1 _ _ P2 P3 P4 P5 P6
  Row 2: (blank) .. .. .. Go Get Maths | Science | English ..
  Row 3+: numbered word rows

Usage:
  python tools/excel_to_json.py "Summary_Vocabulary.xlsx" data/vocabulary.json

Output shape:
  { "_meta": {...},
    "months": {
       "june": { "K1":[{word,image,emoji?,th?}], ... },
       "july": { ... } } }

- Image path is shared across months: assets/<LV>/<slug>.jpeg
- Thai translations (th) from the previous JSON are preserved
  and re-attached by word so nothing is lost on re-run.
"""
import sys, json, re, datetime
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("pip install openpyxl --break-system-packages")

# ── canonical month order for the school year ──
MONTH_ORDER = ["may","june","july","august","september",
               "november","december","january","february"]
# map many spellings → canonical key
MONTH_ALIAS = {
    "may":"may",
    "jun":"june","june":"june",
    "jul":"july","july":"july",
    "aug":"august","august":"august",
    "sep":"september","sept":"september","september":"september",
    "nov":"november","november":"november",
    "dec":"december","december":"december",
    "jan":"january","january":"january",
    "feb":"february","february":"february",
}

def slug(word):
    s = word.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_") or "word"

# column layout (1-based): 2=K1 3=K2 4=K3 5,6,7=P1 8=P2 ... 12=P6
COLMAP = [(2,"K1",None),(3,"K2",None),(4,"K3",None),
          (5,"P1","Go Get Maths"),(6,"P1","Science"),(7,"P1","English"),
          (8,"P2",None),(9,"P3",None),(10,"P4",None),(11,"P5",None),(12,"P6",None)]

def read_sheet(ws):
    levels = {}
    for col, lv, subject in COLMAP:
        for row in range(3, ws.max_row + 1):
            v = ws.cell(row=row, column=col).value
            if v is None: continue
            w = str(v).strip()
            if not w: continue
            entry = {"word": w, "image": f"assets/{lv}/{slug(w)}.jpeg"}
            if subject: entry["subject"] = subject
            levels.setdefault(lv, []).append(entry)
    return levels

def main():
    if len(sys.argv) < 3:
        sys.exit('Usage: python tools/excel_to_json.py "Summary_Vocabulary.xlsx" data/vocabulary.json')
    xlsx, out = sys.argv[1], sys.argv[2]

    # keep Thai translations from a previous run (by month::level::word, with
    # a fallback that matches by level::word across any month)
    old_th = {}
    old_path = Path(out)
    if old_path.exists():
        try:
            old = json.loads(old_path.read_text(encoding="utf-8"))
            months_obj = old.get("months") or {}
            # also support the old flat shape { K1:[...], ... }
            if not months_obj and any(k in old for k in ("K1","P1")):
                months_obj = {"june": {k:v for k,v in old.items() if not k.startswith("_")}}
            for mn, lvls in months_obj.items():
                for lv, entries in lvls.items():
                    for e in entries:
                        if isinstance(e, dict) and e.get("th"):
                            old_th[f"{mn}::{lv}::{e['word']}"] = e["th"]
                            old_th.setdefault(f"*::{lv}::{e['word']}", e["th"])
        except Exception:
            pass

    wb = openpyxl.load_workbook(xlsx, data_only=True)
    months = {}
    skipped = []
    for name in wb.sheetnames:
        key = MONTH_ALIAS.get(name.strip().lower())
        if not key:
            skipped.append(name); continue
        months[key] = read_sheet(wb[name])

    # re-attach Thai translations
    for mn, lvls in months.items():
        for lv, entries in lvls.items():
            for e in entries:
                th = old_th.get(f"{mn}::{lv}::{e['word']}") or old_th.get(f"*::{lv}::{e['word']}")
                if th: e["th"] = th

    # order months canonically
    ordered = {m: months[m] for m in MONTH_ORDER if m in months}

    meta = {
        "generated": datetime.date.today().isoformat(),
        "months": list(ordered.keys()),
        "counts": {m: {lv: len(v) for lv, v in lvls.items()} for m, lvls in ordered.items()},
    }
    data = {"_meta": meta, "months": ordered}
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ wrote {out}")
    for m, lvls in ordered.items():
        total = sum(len(v) for v in lvls.values())
        print(f"  {m}: {total} words")
    if skipped:
        print(f"  (skipped sheets: {skipped})")

if __name__ == "__main__":
    main()
