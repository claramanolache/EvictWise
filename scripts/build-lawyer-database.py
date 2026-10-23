"""Create or update the supplied SQLite organization directory (Python 3 stdlib only)."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent.parent
DATABASE = ROOT / "data" / "lawyers.sqlite3"


def main():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    schema = (ROOT / "src/constants/lawyers_structure.sql").read_text()
    seed = (ROOT / "src/constants/lawyer data/populated_data.sql").read_text()
    with sqlite3.connect(DATABASE) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript("BEGIN IMMEDIATE;\n" + schema + "\n" + seed + "\nCOMMIT;")
        print(f"Saved {connection.execute('SELECT COUNT(*) FROM organizations').fetchone()[0]} organizations to {DATABASE}")


if __name__ == "__main__":
    main()
