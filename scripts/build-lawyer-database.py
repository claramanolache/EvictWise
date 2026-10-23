"""Create or update the supplied SQLite organization directory (Python 3 stdlib only)."""
from pathlib import Path
import sqlite3
import json

ROOT = Path(__file__).resolve().parent.parent
DATABASE = ROOT / "data" / "lawyers.sqlite3"


def main():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    schema = (ROOT / "src/constants/lawyers_structure.sql").read_text()
    seed = (ROOT / "src/constants/lawyer data/populated_data.sql").read_text()
    with sqlite3.connect(DATABASE) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript("BEGIN IMMEDIATE;\n" + schema + "\n" + seed + "\nCOMMIT;")
        connection.row_factory = sqlite3.Row
        organizations = []
        for row in connection.execute("SELECT * FROM organizations ORDER BY name"):
            organization = dict(row)
            for table, column, field in [
                ("organization_counties", "county", "counties"),
                ("organization_services", "service", "services"),
                ("organization_representation_levels", "representation_level", "representationLevels"),
                ("organization_case_stages", "case_stage", "caseStages"),
                ("organization_languages", "language", "languages"),
            ]:
                organization[field] = [item[0] for item in connection.execute(
                    f"SELECT {column} FROM {table} WHERE organization_id = ? ORDER BY {column}",
                    (organization["id"],),
                )]
            organizations.append(organization)
        export = ROOT / "src/data/lawyers.json"
        export.parent.mkdir(parents=True, exist_ok=True)
        export.write_text(json.dumps(organizations, indent=2, ensure_ascii=False) + "\n")
        print(f"Exported {len(organizations)} organizations to {export}")
        print(f"Saved {connection.execute('SELECT COUNT(*) FROM organizations').fetchone()[0]} organizations to {DATABASE}")


if __name__ == "__main__":
    main()
