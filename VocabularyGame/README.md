# CVN Word World — Vocabulary Game (K1–P6)

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

## Updating words every month

1. Get the new month's spreadsheet (same layout as `June Vocabulary.xlsx`:
   row 1 = level headers, P1 spans Go Get Maths / Science / English).
2. Run the converter:

   ```bash
   python tools/excel_to_json.py "July Vocabulary.xlsx" data/vocabulary.json
   ```

3. Re-upload `data/vocabulary.json` (and any new images). That's it —
   no code changes needed.

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


## Adding real pictures (optional)

The converter suggests an image path per word, e.g. `assets/K1/apple.png`.
Drop a matching PNG there and it appears automatically. If the file is
missing, the game falls back to an emoji (for known words) or a letter
tile. Filenames are lowercased with spaces as underscores
(`air stewards` → `air_stewards.png`).

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
