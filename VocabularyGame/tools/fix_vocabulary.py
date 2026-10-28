# -*- coding: utf-8 -*-
"""
fix_vocabulary.py — ซ่อม data/vocabulary.json ให้ตรงกับไฟล์ภาพที่มีอยู่จริง

ทำ 3 อย่าง:
  1. สแกนโฟลเดอร์ assets/<LEVEL>/ หา "ไฟล์จริง" ของแต่ละคำ แล้วเขียน
     นามสกุลที่ถูกต้องลง JSON (.jpeg / .jpg / .png / .webp อะไรก็ได้)
     → เบราว์เซอร์จะไม่ยิง 404 ทิ้งอีกต่อไป และ preload ทำงานได้จริง
  2. ถ้าไม่มีไฟล์ภาพเลย → ลบฟิลด์ image ทิ้ง เพื่อให้เกมรู้ตั้งแต่ต้นว่า
     "คำนี้ไม่มีรูป" แล้วสลับไปใช้ emoji / โหมดการ์ดคำแทน
  3. เติม emoji จาก tools/emoji_map.py ให้คำที่ยังไม่มี

ใช้งาน:
    python tools/fix_vocabulary.py                      # ซ่อมไฟล์จริง
    python tools/fix_vocabulary.py --dry-run            # ดูผลก่อน ไม่เขียนไฟล์
    python tools/fix_vocabulary.py data/vocabulary.json assets
"""
import json
import os
import re
import sys
import shutil
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emoji_map import emoji_for  # noqa: E402

IMG_EXTS = (".png", ".jpeg", ".jpg", ".webp", ".gif", ".avif")


def slugify(word: str) -> str:
    """คำ → ชื่อไฟล์ (ต้องตรงกับ excel_to_json.py)"""
    s = str(word).strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s-]+", "_", s)
    return s.strip("_")


def build_asset_index(assets_dir: str):
    """{ 'K1': { 'apple': 'assets/K1/apple.jpeg', ... }, ... }"""
    index = {}
    if not os.path.isdir(assets_dir):
        print(f"!! ไม่พบโฟลเดอร์ {assets_dir}")
        return index
    for level in sorted(os.listdir(assets_dir)):
        ldir = os.path.join(assets_dir, level)
        if not os.path.isdir(ldir):
            continue
        found = {}
        for fname in os.listdir(ldir):
            base, ext = os.path.splitext(fname)
            if ext.lower() not in IMG_EXTS:
                continue
            key = base.lower()
            # ถ้ามีหลายนามสกุลของคำเดียวกัน เลือกตามลำดับความชอบ
            prev = found.get(key)
            if prev is None or _ext_rank(ext) < _ext_rank(os.path.splitext(prev)[1]):
                found[key] = f"assets/{level}/{fname}"
        index[level] = found
    return index


def _ext_rank(ext: str) -> int:
    order = [".webp", ".jpeg", ".jpg", ".png", ".avif", ".gif"]
    ext = ext.lower()
    return order.index(ext) if ext in order else 99


def load_thai(json_path: str) -> dict:
    """อ่านคำแปลไทยจาก data/clues.json → { "apple": "แอปเปิล", ... }

    clues.json มีคำแปลไทยครบ 886 คำอยู่แล้ว แต่ vocabulary.json ไม่เคยมีฟิลด์ th
    ทำให้ thaiOf() ใน game.js คืนค่าว่างเสมอ และปุ่มเสียงไทย 🇹🇭 ของ K1-K3
    ไม่เคยแสดงเลย ฟังก์ชันนี้ย้ายคำแปลมาไว้ที่เดียวกับคำศัพท์
    """
    clues_path = os.path.join(os.path.dirname(json_path), "clues.json")
    if not os.path.exists(clues_path):
        print("  !  ไม่พบ", clues_path, "— ข้ามการเติมคำแปลไทย")
        return {}
    with open(clues_path, encoding="utf-8") as f:
        data = json.load(f)
    table = {}
    for _level, entries in (data.get("levels") or {}).items():
        for e in entries:
            w = str(e.get("word", "")).strip().lower()
            th = str(e.get("th", "")).strip()
            if w and th:
                table.setdefault(w, th)
    return table


def fix(json_path: str, assets_dir: str, dry_run: bool = False):
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    index = build_asset_index(assets_dir)
    print("ไฟล์ภาพที่พบ:", {k: len(v) for k, v in sorted(index.items())})
    thai = load_thai(json_path)
    print("คำแปลไทยที่อ่านได้จาก clues.json:", len(thai), "คำ")

    stats = Counter()
    still_blank = []

    months = data.get("months")
    if not months:                       # รูปแบบเก่า (flat) → ห่อให้เป็น june
        months = {"june": {k: v for k, v in data.items() if k != "_meta"}}

    for month, levels in months.items():
        for level, entries in levels.items():
            table = index.get(level, {})
            for e in entries:
                word = e.get("word", "")
                slug = slugify(word)
                real = table.get(slug)

                if real:
                    if e.get("image") != real:
                        stats["image_fixed"] += 1
                    e["image"] = real
                    stats["has_image"] += 1
                else:
                    if "image" in e:
                        del e["image"]          # ไม่มีไฟล์จริง → ไม่ต้องหลอกให้โหลด
                        stats["image_removed"] += 1

                if not e.get("emoji"):
                    emo = emoji_for(word)
                    if emo:
                        e["emoji"] = emo
                        stats["emoji_added"] += 1

                if not e.get("th"):
                    th = thai.get(str(word).strip().lower())
                    if th:
                        e["th"] = th
                        stats["thai_added"] += 1

                if not e.get("image") and not e.get("emoji"):
                    stats["no_visual"] += 1
                    still_blank.append(f"{month}/{level}/{word}")

    meta = data.setdefault("_meta", {})
    meta["assets_verified"] = True
    meta["no_visual_count"] = stats["no_visual"]

    print()
    print(f"  แก้นามสกุลภาพให้ถูก        : {stats['image_fixed']:>5}")
    print(f"  ลบ image ที่ไม่มีไฟล์จริง  : {stats['image_removed']:>5}")
    print(f"  เติม emoji ใหม่            : {stats['emoji_added']:>5}")
    print(f"  เติมคำแปลไทย (th)          : {stats['thai_added']:>5}")
    print(f"  มีภาพจริงใช้ได้            : {stats['has_image']:>5}")
    print(f"  ไม่มีทั้งภาพและ emoji      : {stats['no_visual']:>5}  (เกมจะใช้โหมดการ์ดคำ)")

    if still_blank:
        print("\nตัวอย่างคำที่ยังไม่มีภาพ/emoji (30 รายการแรก):")
        for w in still_blank[:30]:
            print("   -", w)

    if dry_run:
        print("\n[--dry-run] ไม่ได้เขียนไฟล์")
        return

    backup = json_path + ".bak"
    if not os.path.exists(backup):
        shutil.copy2(json_path, backup)
        print(f"\nสำรองไฟล์เดิมไว้ที่ {backup}")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"เขียน {json_path} เรียบร้อย")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    jp = args[0] if len(args) > 0 else os.path.join(here, "data", "vocabulary.json")
    ad = args[1] if len(args) > 1 else os.path.join(here, "assets")
    fix(jp, ad, dry)
