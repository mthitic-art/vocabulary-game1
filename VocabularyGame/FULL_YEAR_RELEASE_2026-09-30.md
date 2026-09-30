# Full-year vocabulary release — 2026-09-30

## Source
- Curriculum workbook analyzed: `Summary_Vocabulary_12_Months_CEFR.xlsx`
- CEFR reference: Oxford 3000 A1–B2 plus the project's Pre-A1 teaching band for kindergarten.
- Repository release snapshot: `data/full_year_content_manifest.csv`

## Result
- 12/12 school-year months populated: June → May.
- 6,567 deduplicated game entries.
- Level totals: K1 600, K2 600, K3 600, P1 1,767, P2 600, P3 600, P4 600, P5 600, P6 600.
- 33 duplicate source cells were merged within their month/level while preserving subject membership.
- CEFR validation: 0 invalid/missing values.
- Duplicate validation: 0 duplicate game entries within a month/level.
- Image-reference validation: 0 broken paths.

## Image coverage
- 1,710 entries currently match repository image assets.
- 3,649 entries have an emoji fallback inherited from existing vocabulary data.
- 2,762 entries currently have neither a dedicated image nor an inherited emoji; these are listed in `data/missing_image_manifest.csv`.
- The game still has its word-tile fallback for these entries, so missing dedicated images do not block the full-year release.

## Pipeline
`tools/excel_to_json.py` now reads the optional `CEFR_MAP` sheet and preserves per-word `Game CEFR` values. When no map entry exists it uses the project grade default.

Release gate:
```bash
python tools/validate_vocabulary.py --require-full-year
```
