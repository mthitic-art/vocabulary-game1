# CVN Word World — Vocabulary Game (K1–P6, CEFR-ready to B2)

A kindergarten-to-primary vocabulary game. Words load from a JSON file
that is generated automatically from your monthly Excel sheet.

## Folder structure

```
VocabularyGame/
├── index.html              ← open this (must be served over http/https)
├── css/style.css           ← all styles
├── data/vocabulary.json    ← generated from Excel (do not edit by hand)
├── js/
│   ├── vocabulary.js       ← loads JSON + data accessors
│   ├── audio.js            ← pronunciation + sound effects
│   ├── progress.js         ← localStorage save, spaced repetition, badges
│   └── game.js             ← visuals, game modes, dashboard
├── assets/                 ← optional images: assets/<LEVEL>/<word>.png
│   ├── K1/ K2/ K3/ P1/ ... P6/
└── tools/
    └── excel_to_json.py    ← Excel → vocabulary.json converter
```

## Running it (IMPORTANT)

This game loads `data/vocabulary.json` with `fetch()`, so it must be
served over **http/https** — double-clicking `index.html` (file://) will
be blocked by the browser.

Pick one:

- **Host it** (recommended): upload the whole `VocabularyGame` folder to
  GitHub Pages or Netlify. Done.
- **Test locally**: from inside the folder run
  `python -m http.server 8000` then open `http://localhost:8000`.

## Updating words across the school year

The canonical school-year order is **June → May**. The app always knows all 12
months; a month stays locked until its sheet contains authoritative vocabulary.

1. Update `Summary_Vocabulary.xlsx` using one sheet per month. Supported sheet
   names include JUNE/JUN, JULY/JUL, AUGUST/AUG, SEPTEMBER/SEP, OCTOBER/OCT,
   NOVEMBER/NOV, DECEMBER/DEC, JANUARY/JAN, FEBRUARY/FEB, MARCH/MAR,
   APRIL/APR and MAY.
2. Regenerate the canonical multi-month JSON:

   ```bash
   python tools/excel_to_json.py Summary_Vocabulary.xlsx data/vocabulary.json
   ```

3. Audit before publishing:

   ```bash
   python tools/validate_vocabulary.py
   # release gate once all 12 months have source data:
   python tools/validate_vocabulary.py --require-full-year
   ```

The full-year release now contains authoritative vocabulary for all 12 months.
`data/full_year_content_manifest.csv` is the text snapshot used to audit the
generated JSON, while `Summary_Vocabulary_12_Months_CEFR.xlsx` is the maintained
workbook used for curriculum editing. Do not create vocabulary from asset filenames
or memory; source vocabulary and CEFR data must come from the maintained curriculum files.

## Adding NEW words (beyond the monthly sheet)

Two ways:

**A) Add them to the Excel sheet, then re-run the converter** (recommended —
keeps Excel as the single source of truth). Add the word to the right level
column, run `python tools/excel_to_json.py ... data/vocabulary.json`, re-upload
the JSON.

**B) Edit `data/vocabulary.json` directly on GitHub** for a quick one-off.
Open the file, click the pencil icon, and add an entry to the level array:

```json
{ "word": "dolphin", "image": "assets/K2/dolphin.png", "emoji": "🐬" }
```

`image` is optional (falls back to emoji), `emoji` is optional (falls back to a
letter tile). Commit and it's live in 1–2 minutes. The number of answer choices
per level adjusts automatically; no code change needed.


## Vocabulary images

Images live at `assets/<LEVEL>/<slug>.<ext>`. The converter scans real files
and writes an `image` field only when a matching file exists; supported image
types include WebP, JPEG, JPG, PNG, AVIF and GIF. The game falls back to emoji
or a word tile if needed. Filenames are lowercased with spaces as underscores
(`air stewards` → `air_stewards.webp`).

For K1–K3, keep an emoji fallback even when a real image exists. Run
`tools/validate_vocabulary.py` to detect broken image references.

## How progress is saved

All scores, stars, mastery, badges, streak and unlocks are stored in the
browser via **localStorage** (per device/browser). There is no server and
no `progress.json` file — browsers cannot write files back to disk.
"Reset All Progress" on the dashboard clears it.

## Levels & difficulty

Levels unlock in order (K1 → K2 → K3 → P1 → … → P6); reaching ~60% average
mastery on a level opens the next. Answer choices scale with level:
K1 = 2, K2 = 4, K3 = 6, primary grades 4–6 choices.

## Game modes

Word Quiz (listen & pick), Flashcards (flip & hear), Adventure (staged
quiz), Memory Match (word↔picture pairs), and Review Words (only the words
you've missed, via spaced repetition).


## CEFR data model

Each vocabulary entry may carry a standard `cefr` value: `Pre-A1`, `A1`,
`A2`, `B1`, or `B2`. The converter now reads the workbook's optional
`CEFR_MAP` sheet and preserves per-word `Game CEFR` values; grade defaults are
used only when no mapped value exists. The current full-year progression reaches B2
in the upper-primary extension content.

See `AUDIT_2026-09-29.md` for the source-of-truth audit and remaining
October–May content gap.


## Full-year release snapshot — 2026-09-30

- 12/12 months populated (June → May).
- 6,567 deduplicated game entries.
- 1,710 entries currently match real image assets in the repository.
- `data/missing_image_manifest.csv` lists vocabulary that still needs a dedicated
  repository image; the runtime continues to use emoji/word-tile fallback.
- Run `python tools/validate_vocabulary.py --require-full-year` before release.
