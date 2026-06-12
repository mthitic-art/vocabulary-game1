#!/usr/bin/env python3
"""
============================================================
 excel_to_json.py  ·  June Word World vocabulary converter
============================================================
 Converts the monthly vocabulary spreadsheet (e.g.
 "June Vocabulary.xlsx") into data/vocabulary.json that the
 game loads at runtime.

 USAGE:
   python tools/excel_to_json.py "June Vocabulary.xlsx" data/vocabulary.json

 The spreadsheet layout this script expects (sheet = month name):
   Row 1: level headers  -> K1 K2 K3 P1 (P1 spans 3 cols) P2 P3 P4 P5 P6
   Row 2: P1 sub-subjects -> Go Get Maths | Science | English
   Row 3+: column A = item number, then one word per level column.

 OUTPUT JSON shape (image path is auto-suggested; emoji optional):
   {
     "_meta": { "month": "JUNE", "levels": [...] },
     "K1": [ { "word":"apple", "image":"assets/K1/apple.jpeg", "emoji":"🍎" }, ... ],
     "P1": [ { "word":"numbers", "image":"assets/P1/numbers.jpeg",
               "subject":"Go Get Maths" }, ... ],
     ...
   }

 NOTES:
 - P1 merges its three subjects into one list, tagging each word
   with "subject" so the game can filter/label if desired.
 - "image" is a *suggested* path. If the PNG does not exist the game
   falls back to emoji (if present) or the word's first letter.
 - An optional emoji map (EMOJI dict below) gives kindergarten words
   a picture even before real art is added. Extend it freely.
============================================================
"""
import sys, json, re
from openpyxl import load_workbook

# Optional emoji fallbacks (mostly useful for K1-K3 picture games).
EMOJI = {
 "hello":"👋","teacher":"👩‍🏫","boy":"👦","girl":"👧","welcome":"🤗","goodbye":"👋",
 "blue":"🔵","yellow":"🟡","red":"🔴","color":"🎨","ball":"⚽","leaf":"🍃","flower":"🌸",
 "bird":"🐦","family":"👨‍👩‍👧‍👦","hat":"🎩","mittens":"🧤","coat":"🧥","shoes":"👟","baby":"👶",
 "cat":"🐱","apple":"🍎","bus":"🚌","mom":"👩","dad":"👨","brother":"👦","sister":"👧",
 "friend":"👫","draw":"✏️","point":"👉","pen":"🖊️","brush":"🖌️","paper":"📄","paint":"🎨",
 "crayons":"🖍️","pencil":"✏️","books":"📚","bag":"🎒","black":"⚫","white":"⚪","brown":"🟤",
 "purple":"🟣","green":"🟢","orange":"🟠","banana":"🍌","fish":"🐟","dog":"🐶","spider":"🕷️",
 "rabbit":"🐰","elephant":"🐘","jump":"🦘","fly":"🦋","swim":"🏊","circle":"⭕","square":"🟦",
 "triangle":"🔺","star":"⭐","eyes":"👀","nose":"👃","grandma":"👵","grandpa":"👴","kitten":"🐱",
 "boots":"👢","frogs":"🐸","socks":"🧦","stars":"✨","happy":"😄","sad":"😢","cold":"🥶","hot":"🥵",
 "rainy":"🌧️","sunny":"☀️","run":"🏃","sing":"🎤","dance":"💃","walk":"🚶","sit":"🪑","climb":"🧗",
 "play":"🎮","bedroom":"🛏️","Monday":"📅","Tuesday":"📅","Wednesday":"📅","Thursday":"📅",
 "Friday":"📅","Saturday":"📅","Sunday":"📅","tree":"🌳","plant":"🌱","flag":"🚩","clock":"🕐",
 "house":"🏠","door":"🚪","car":"🚗","fish ":"🐟","cake":"🎂","train":"🚆","snake":"🐍","snail":"🐌",
}

def slug(word):
    """Filename-safe asset name: 'air stewards' -> 'air_stewards'."""
    s = word.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_") or "word"

# Column map. P1 occupies columns 5,6,7 with three subjects.
SINGLE = {"K1":2, "K2":3, "K3":4, "P2":8, "P3":9, "P4":10, "P5":11, "P6":12}
P1_COLS = {"Go Get Maths":5, "Science":6, "English":7}

def convert(xlsx_path, out_path, sheet=None):
    wb = load_workbook(xlsx_path, data_only=True)
    ws = wb[sheet] if sheet else wb[wb.sheetnames[0]]
    month = ws.title

    def is_data_row(r):
        a = ws.cell(r, 1).value
        return isinstance(a, int) or (isinstance(a, str) and a.strip().isdigit())

    data = {}
    # Single-column levels
    for lv, col in SINGLE.items():
        items = []
        seen = set()
        for r in range(1, ws.max_row + 1):
            if not is_data_row(r):
                continue
            v = ws.cell(r, col).value
            if v is None:
                continue
            w = str(v).strip()
            if not w or w.lower() in seen:
                continue
            seen.add(w.lower())
            entry = {"word": w, "image": f"assets/{lv}/{slug(w)}.jpeg"}
            if w in EMOJI:
                entry["emoji"] = EMOJI[w]
            items.append(entry)
        data[lv] = items

    # P1: merge three subjects, tag each
    p1 = []
    seen = set()
    for subject, col in P1_COLS.items():
        for r in range(1, ws.max_row + 1):
            if not is_data_row(r):
                continue
            v = ws.cell(r, col).value
            if v is None:
                continue
            w = str(v).strip()
            if not w:
                continue
            key = w.lower()
            if key in seen:
                continue
            seen.add(key)
            entry = {"word": w, "image": f"assets/P1/{slug(w)}.jpeg", "subject": subject}
            if w in EMOJI:
                entry["emoji"] = EMOJI[w]
            p1.append(entry)
    data["P1"] = p1

    # Ordered output with metadata first
    levels = ["K1","K2","K3","P1","P2","P3","P4","P5","P6"]
    out = {"_meta": {"month": month, "levels": levels,
                     "counts": {lv: len(data.get(lv, [])) for lv in levels}}}
    for lv in levels:
        out[lv] = data.get(lv, [])

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"✓ Wrote {out_path}")
    print(f"  Month: {month}")
    for lv in levels:
        print(f"  {lv}: {len(data.get(lv, []))} words")
    return out

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python excel_to_json.py <input.xlsx> <output.json> [sheet]")
        sys.exit(1)
    sheet = sys.argv[3] if len(sys.argv) > 3 else None
    convert(sys.argv[1], sys.argv[2], sheet)
