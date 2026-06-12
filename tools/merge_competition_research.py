from __future__ import annotations

import argparse
import json
from pathlib import Path


DATA_PATH = Path("source/data/competitions.json")
DEFAULT_RESULTS_DIR = Path("tools/competition-research")

DATE_FIELDS = (
    "registrationStart",
    "registrationEnd",
    "contestStart",
    "contestEnd",
    "referenceRegistrationStart",
    "referenceRegistrationEnd",
    "referenceContestStart",
    "referenceContestEnd",
)

EXTRA_FIELDS = (
    "officialUrl",
    "evidenceUrl",
    "sourceType",
    "confidence",
    "notes",
)


def has_current_dates(item: dict) -> bool:
    return any(item.get(key) for key in ("registrationStart", "registrationEnd", "contestStart", "contestEnd"))


def has_reference_dates(item: dict) -> bool:
    return any(
        item.get(key)
        for key in (
            "referenceRegistrationStart",
            "referenceRegistrationEnd",
            "referenceContestStart",
            "referenceContestEnd",
        )
    )


def status_for(item: dict) -> str:
    if has_current_dates(item):
        return "confirmed-2026"
    if has_reference_dates(item):
        return "reference-2025"
    return "pending-official-date"


def merge_record(target: dict, update: dict) -> bool:
    changed = False
    for key in (*DATE_FIELDS, *EXTRA_FIELDS):
        value = update.get(key)
        if value and target.get(key) != value:
            target[key] = value
            changed = True

    new_status = status_for(target)
    if target.get("status") != new_status:
        target["status"] = new_status
        changed = True

    return changed


def load_updates(results_dir: Path) -> list[dict]:
    updates: list[dict] = []
    for path in sorted(results_dir.glob("batch-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError(f"{path} must contain a JSON array")
        for item in data:
            item["_source_file"] = path.name
            updates.append(item)
    return updates


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    competitions = data.get("competitions", [])
    by_number = {item.get("number"): item for item in competitions}

    changed_numbers: list[int] = []
    skipped: list[dict] = []
    for update in load_updates(args.results_dir):
        number = update.get("number")
        target = by_number.get(number)
        if not target:
            skipped.append(update)
            continue
        if merge_record(target, update):
            changed_numbers.append(number)

    summary = {
        "changed": sorted(set(changed_numbers)),
        "skipped": [item.get("number") for item in skipped],
        "total": len(competitions),
        "confirmed_2026": sum(1 for item in competitions if status_for(item) == "confirmed-2026"),
        "reference_2025": sum(1 for item in competitions if status_for(item) == "reference-2025"),
        "pending": sum(1 for item in competitions if status_for(item) == "pending-official-date"),
    }

    if not args.dry_run:
        DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
