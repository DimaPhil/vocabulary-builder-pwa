# English CEFR B1–C2 dataset (English → Russian)

This folder contains a reproducible, locally stored learning dataset for CEFR B1, B2, C1, and C2. It combines level assignments from CEFR-J/Octanove with open dictionary and teacher-reviewed sentence sources.

## Layout

- `canonical/vocabulary.jsonl`: rich canonical records; one JSON object per CEFR headword/POS entry.
- `canonical/B1.jsonl` … `C2.jsonl`: canonical records split by level.
- `canonical/stats.json`: generated coverage report.
- `app-import/B1.json` … `C2.json`: files accepted by the app's Admin JSON importer.
- `app-import/all.json`: all levels in one app-compatible import.
- `media/`: freely licensed Wikimedia Commons thumbnails and their attribution manifest, when available.
- `sources/cache/`: downloaded source snapshots (intentionally ignored by Git because the Wiktionary snapshot is several gigabytes).
- `sources/wiktionary-selected.jsonl.gz`: only the Wiktionary records used by this dataset.
- `sources/manifest.json`: source URLs, licenses, sizes, hashes, and download time.

## Rebuild

```bash
python3 scripts/build_cefr_dataset.py download
python3 scripts/build_cefr_dataset.py build --images
python3 scripts/build_cefr_dataset.py validate
```

Use `--skip-wiktionary` on both download and build for a much smaller, faster build based on FreeDict, Open English WordNet, and Tatoeba only.
Use `build --download-images` to mirror up to 500 licensed thumbnails locally; the metadata-only build still stores the image URL, license, artist, credit, and description page. The downloader is resumable and preserves already completed files.

## Record model

Canonical records retain CEFR level, part of speech, Russian translations, English definitions/hints, synonyms, antonyms, semantic topics, pronunciations, audio links, monolingual examples, attributed bilingual examples, optional image metadata, and field-level provenance. App imports flatten the same information to the app's existing schema without changing application code.

CEFR does not define a finite vocabulary for any level, especially C2. This is therefore a broad teaching profile, not “every English word.” The level source contributes exactly 7,360 headword/POS records: B1 2,446; B2 2,778; C1 1,111; C2 1,025.

## Quality and licensing

Definitions and translations can be sense-dependent. Automated matching prefers the requested part of speech, excludes obsolete/archaic senses from learner hints, preserves multiple translations, and marks exact provenance. Wikipedia images are accepted only when Commons reports a CC, CC0, or public-domain license; attribution is retained in `media/manifest.json`.

See [SOURCES.md](SOURCES.md) before redistributing the combined dataset. Because it includes ShareAlike sources, redistribute the combined data under compatible ShareAlike terms and retain attribution.
