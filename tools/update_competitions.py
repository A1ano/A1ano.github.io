from __future__ import annotations

import json
from pathlib import Path


DATA_PATH = Path("source/data/competitions.json")


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    # This placeholder keeps the scheduled update workflow non-destructive.
    # Use registration*/contest* for the current year's official dates.
    # Use referenceRegistration*/referenceContest* for 2025 dates when the
    # current year's notice has not been published yet.
    # Add official-site scrapers here as each competition's source URL is filled.
    # For now, do not change the file merely to update a timestamp.
    data.setdefault("updatedAt", "")

    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
