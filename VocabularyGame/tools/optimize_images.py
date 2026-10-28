# -*- coding: utf-8 -*-
"""
optimize_images.py — ย่อภาพทั้งหมดเป็น WebP

ทำไมต้องย่อ:
  ภาพต้นฉบับเฉลี่ย ~511 KB/ไฟล์ แต่การ์ดในเกมกว้างแค่ ~150 px บนมือถือ
  รวม 1,606 ไฟล์ = 801 MB ขณะที่ GitHub Pages จำกัด site ไว้ที่ 1 GB
  ย่อเป็น WebP กว้าง 640 px เหลือราว 40-60 KB/ไฟล์ (ลด ~90%)

วิธีทำงาน:
  - รันซ้ำได้ปลอดภัย (resumable) ไฟล์ที่แปลงแล้วจะถูกข้าม
  - ลบต้นฉบับก็ต่อเมื่อไฟล์ WebP เขียนสำเร็จและเปิดอ่านได้จริง
  - ถ้า WebP ออกมาใหญ่กว่าต้นฉบับ จะเก็บต้นฉบับไว้ (ไม่ทำให้แย่ลง)

ใช้งาน:
    python tools/optimize_images.py --dry-run     # ดูผลก่อน ไม่แตะไฟล์
    python tools/optimize_images.py               # แปลงทั้งหมด
    python tools/optimize_images.py --limit 200   # แปลงทีละ 200 ไฟล์
    python tools/optimize_images.py --keep        # แปลงแต่ไม่ลบต้นฉบับ
"""
import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

SRC_EXTS = (".png", ".jpg", ".jpeg")
MAX_SIDE = 640          # ด้านยาวสุดหลังย่อ (px)
QUALITY = 80            # คุณภาพ WebP
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(HERE, "assets")

# ภาพที่ HTML/JS อ้างด้วยชื่อไฟล์ตรง ๆ — แปลงได้ แต่ต้องแก้ที่อ้างถึงด้วย
PINNED = {"logo.png", "questy.png", "detective_banner.png"}


def human(n):
    return "%.1f MB" % (n / 1048576) if n >= 1048576 else "%.0f KB" % (n / 1024)


def collect():
    jobs = []
    for root, _dirs, files in os.walk(ASSETS):
        for f in files:
            if not f.lower().endswith(SRC_EXTS):
                continue
            src = os.path.join(root, f)
            dst = os.path.splitext(src)[0] + ".webp"
            if os.path.exists(dst):          # แปลงไปแล้ว
                continue
            jobs.append((src, dst))
    return sorted(jobs)


def convert(job, keep=False):
    src, dst = job
    before = os.path.getsize(src)
    tmp = dst + ".tmp"
    try:
        with Image.open(src) as im:
            im.load()
            if im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            w, h = im.size
            longest = max(w, h)
            if longest > MAX_SIDE:           # ย่อเท่านั้น ไม่ขยาย
                scale = MAX_SIDE / longest
                im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))),
                               Image.LANCZOS)
            im.save(tmp, "WEBP", quality=QUALITY, method=6)
        with Image.open(tmp) as chk:         # ยืนยันว่าไฟล์ใหม่เปิดได้จริง
            chk.load()
        after = os.path.getsize(tmp)
    except Exception as exc:
        if os.path.exists(tmp):
            os.remove(tmp)
        return ("error", src, before, 0, str(exc))

    if after >= before:                      # ไม่ได้เล็กลง → ไม่ต้องเปลี่ยน
        os.remove(tmp)
        return ("skipped", src, before, before, "webp ไม่เล็กกว่าต้นฉบับ")

    os.replace(tmp, dst)
    if not keep:
        try:
            os.remove(src)
        except OSError as exc:
            return ("kept-src", src, before, after, str(exc))
    return ("ok", src, before, after, "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--keep", action="store_true", help="ไม่ลบไฟล์ต้นฉบับ")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()

    jobs = collect()
    if a.limit:
        jobs = jobs[:a.limit]

    if not jobs:
        print("ไม่มีไฟล์ที่ต้องแปลงแล้ว — เสร็จครบทุกไฟล์")
        return

    total_before = sum(os.path.getsize(s) for s, _ in jobs)
    print("ไฟล์ที่จะแปลง : %d ไฟล์  (%s)" % (len(jobs), human(total_before)))
    if a.dry_run:
        print("[--dry-run] ไม่ได้แตะไฟล์ใด ๆ")
        for s, _ in jobs[:5]:
            print("   ตัวอย่าง:", os.path.relpath(s, HERE))
        return

    done = err = skip = 0
    sum_b = sum_a = 0
    errors = []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for status, src, before, after, msg in ex.map(lambda j: convert(j, a.keep), jobs):
            if status == "ok":
                done += 1
                sum_b += before
                sum_a += after
            elif status == "skipped":
                skip += 1
            else:
                err += 1
                errors.append("%s: %s" % (os.path.relpath(src, HERE), msg))

    print("แปลงสำเร็จ    : %d ไฟล์" % done)
    print("ข้าม (ไม่เล็กลง): %d ไฟล์" % skip)
    print("ผิดพลาด       : %d ไฟล์" % err)
    if done:
        print("ขนาด          : %s  →  %s   (ลดลง %.0f%%)"
              % (human(sum_b), human(sum_a), (1 - sum_a / sum_b) * 100))
        print("เฉลี่ยต่อไฟล์  : %s  →  %s" % (human(sum_b / done), human(sum_a / done)))
    for e in errors[:10]:
        print("  !", e)
    remaining = len(collect())
    if remaining:
        print("\nเหลืออีก %d ไฟล์ — รันคำสั่งเดิมซ้ำได้เลย" % remaining)
    else:
        print("\nครบทุกไฟล์แล้ว")
        print("ขั้นต่อไป: python tools/fix_vocabulary.py  (ให้ JSON ชี้ไฟล์ .webp)")
        if PINNED:
            print("อย่าลืม: ภาพที่ HTML อ้างตรง ๆ (%s) ต้องแก้ที่อ้างถึงด้วย"
                  % ", ".join(sorted(PINNED)))


if __name__ == "__main__":
    main()
