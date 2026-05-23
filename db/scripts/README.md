# 🐍 Database ETL & Audit Scripts

[← Back to Root README](../../README.md) | [Read Architecture](../../docs/ARCHITECTURE_AND_PIPELINE.md)

This folder contains the Python scripts responsible for the **ETL (Extract, Transform, Load)** pipeline. Because repack titles are notoriously messy, we use heavy Regex and smart PostgreSQL matching to normalize the data and link repacks to official games.

## 📜 Scripts Overview

### Database Building & Initialization

- `import_all_gamedb.py`: Imports raw JSON dumps from GameDB into raw JSONB Postgres tables.
- `build_database.py`: Shreds the raw JSONB tables, extracts the One-to-Many and Many-to-Many relationships, and inserts them into our highly-normalized, relational Postgres schema.

### Title Normalization & Matching

- `db_sync.py`: The workhorse. It reads `patterns.json`, strips repack jargon from titles, updates the `normalized_title` in the DB, and uses Postgres `pg_trgm` (Trigram similarity) to automatically link repacks to official games. _Runs in multi-processing mode for speed._
- `patterns.json`: A dictionary of known release groups, jargon (e.g., "repack", "crackfix"), and edition strings used by the normalization engine.

### Auditing & Analytics

- `analyze_titles.py`: Analyzes over 500k+ repack titles to find the most common bracket tags, parentheses, and leftover garbage to help us improve `patterns.json`.
- `smart_audit.py`: Cross-references stripped repack titles against a dictionary of valid words from official game titles. Helps identify "False Positives" (words we accidentally deleted) and "False Negatives" (garbage we missed).
- `test_normalization.py`: Dumps an SQLite database showing exactly what our normalization regex removed from every single title, allowing easy inspection in an SQL IDE.
- `db_full_report.py`: Generates a massive `.txt` schema dump of your Postgres database, including row counts, indexes, and constraints.

## 🚀 Usage

To run any script, ensure you have your Postgres credentials updated inside the script's `DB_PARAMS` dictionary.

1. Install dependencies:
   ```bash
   pip install psycopg2-binary
   ```
2. Run a script:
   ```bash
   python db_sync.py
   ```
