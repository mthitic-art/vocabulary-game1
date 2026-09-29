#!/usr/bin/env python3
"""Validate CVN Word World vocabulary data against the repo assets.

Checks:
- canonical June→May school-year shape
- supported CEFR values (Pre-A1, A1, A2, B1, B2)
- duplicate words inside the same month/level
- referenced image files exist in assets/
- words that have neither a real image nor emoji
- optional full-year content completeness

Usage:
    python tools/validate_vocabulary.py
    python tools/validate_vocabulary.py --require-full-year
"""
import argparse
import json
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_JSON = os.path.join(ROOT, "data", "vocabulary.json")
SCHOOL_YEAR_MONTHS = [
    "june", "july", "august", "september", "october", "november",
    "december", "january", "february", "march", "april", "may",
]
LEVELS = ["K1", "K2", "K3", "P1", "P2", "P3", "P4", "P5", "P6"]
CEFR_BANDS = {"Pre-A1", "A1", "A2", "B1", "B2"}


def validate(path, require_full_year=False):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    months = data.get("months") or {}
    errors = []
    warnings = []
    stats = Counter()

    missing_month_keys = [m for m in SCHOOL_YEAR_MONTHS if m not in months]
    if missing_month_keys:
        errors.append("missing month keys: " + ", ".join(missing_month_keys))

    available = []
    for month in SCHOOL_YEAR_MONTHS:
        levels = months.get(month, {})
        month_has_words = False
        for level in LEVELS:
            entries = levels.get(level, [])
            if not isinstance(entries, list):
                errors.append(f"{month}/{level}: expected a list")
                continue
            if entries:
                month_has_words = True

            seen = set()
            for entry in entries:
                word = str(entry.get("word", "")).strip()
                if not word:
                    errors.append(f"{month}/{level}: entry without word")
                    continue
                key = word.casefold()
                if key in seen:
                    errors.append(f"{month}/{level}: duplicate word '{word}'")
                seen.add(key)

                cefr = entry.get("cefr")
                if cefr not in CEFR_BANDS:
                    errors.append(f"{month}/{level}/{word}: invalid or missing CEFR '{cefr}'")

                image = entry.get("image")
                if image:
                    abs_image = os.path.join(ROOT, image)
                    if not os.path.isfile(abs_image):
                        errors.append(f"{month}/{level}/{word}: missing image file {image}")
                    else:
                        stats["with_image"] += 1

                if entry.get("emoji"):
                    stats["with_emoji"] += 1
                if not image and not entry.get("emoji"):
                    warnings.append(f"{month}/{level}/{word}: no image or emoji")
                    stats["no_visual"] += 1

                stats["words"] += 1

        if month_has_words:
            available.append(month)

    if require_full_year and len(available) != len(SCHOOL_YEAR_MONTHS):
        missing = [m for m in SCHOOL_YEAR_MONTHS if m not in available]
        errors.append("full-year content missing: " + ", ".join(missing))

    meta = data.get("_meta") or {}
    if meta.get("school_year_months") != SCHOOL_YEAR_MONTHS:
        warnings.append("_meta.school_year_months does not match canonical order")
    if set(meta.get("cefr_bands") or []) != CEFR_BANDS:
        warnings.append("_meta.cefr_bands does not match supported CEFR bands")

    print("Vocabulary audit")
    print("================")
    print("Available months :", ", ".join(available) or "(none)")
    print("Missing content  :", ", ".join(m for m in SCHOOL_YEAR_MONTHS if m not in available) or "(none)")
    print("Words            :", stats["words"])
    print("With image       :", stats["with_image"])
    print("With emoji       :", stats["with_emoji"])
    print("No visual        :", stats["no_visual"])
    print("Warnings         :", len(warnings))
    print("Errors           :", len(errors))

    for msg in warnings[:30]:
        print("WARN:", msg)
    if len(warnings) > 30:
        print(f"WARN: ... {len(warnings)-30} more")

    for msg in errors[:50]:
        print("ERROR:", msg)
    if len(errors) > 50:
        print(f"ERROR: ... {len(errors)-50} more")

    return 1 if errors else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json", nargs="?", default=DEFAULT_JSON)
    ap.add_argument("--require-full-year", action="store_true")
    args = ap.parse_args()
    raise SystemExit(validate(args.json, args.require_full_year))


if __name__ == "__main__":
    main()
