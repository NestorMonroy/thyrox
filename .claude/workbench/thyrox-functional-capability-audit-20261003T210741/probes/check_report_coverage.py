"""Comprueba que la reestructuración no perdió identificadores.

Todo H-THYROX-NNN y TASK-THYROX-NNNN del snapshot previo tiene que seguir
referenciado por outputs/REPORT.md o por alguna fuente durable (capabilities/,
findings/, decisions/, evidence/). Todo experimento de experiments/ tiene que
aparecer en REPORT.md. Sale 1 nombrando lo perdido.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

BENCH = Path(__file__).resolve().parents[1]
SNAPSHOT = BENCH / "snapshots/report-20261003T232604Z-pre-structured-audit.md"
IDS = re.compile(r"\b(?:H|TASK)-THYROX-\d+\b")


def corpus() -> str:
    parts = [(BENCH / "outputs/REPORT.md").read_text(encoding="utf-8")]
    for folder in ("capabilities", "findings", "decisions", "evidence"):
        parts += [p.read_text(encoding="utf-8", errors="replace") for p in (BENCH / folder).rglob("*") if p.is_file() and p.suffix in (".md", ".json", ".tsv")]
    return "\n".join(parts)


def main() -> int:
    before = set(IDS.findall(SNAPSHOT.read_text(encoding="utf-8")))
    after = set(IDS.findall(corpus()))
    lost = sorted(before - after)
    report = (BENCH / "outputs/REPORT.md").read_text(encoding="utf-8")
    missing_experiments = sorted(d.name for d in (BENCH / "experiments").iterdir() if d.is_dir() and d.name not in report)
    print(f"ids en el snapshot: {len(before)} · preservados: {len(before) - len(lost)} · perdidos: {lost}")
    print(f"experimentos sin referencia en REPORT.md: {missing_experiments}")
    return 1 if lost or missing_experiments else 0


if __name__ == "__main__":
    sys.exit(main())
