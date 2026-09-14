#!/usr/bin/env python3
"""Vuelca el tablero de tareas de la sesion viva y lo mide contra el store.

El tablero del cliente vive fuera del arbol —un archivo por tarea bajo
``<TASKS_ROOT>/<session>/NNN.json``— y por tanto es tan durable como el
contenedor: el nivel 4 de ``niveles-de-retencion.md``, completitud percibida sin
persistencia. Este instrumento lo copia al banco y publica su corte.

La forma se adapta de ``kaupamex-docs: .claude/eventos/
tareas-pendientes-y-dependencias-20260907T210900``, que hizo el mismo volcado
para el consumidor. Aqui vive en el PROVEEDOR y bajo la forma de ``workbench``:
manifiesto de cinco claves en ingles, ``outputs/`` y ``README.md``.

Metrica: los ``NNN.json`` del tablero de ESTA sesion, cruzados por ``subject``
contra la tabla ``tasks`` del store.
Ciega a: una tarea cuyo sujeto se renombro tras acunar su cita —el cruce por
texto la lee como ausente— y a la dependencia que solo vive en la cabeza de
quien escribio la tarea, que ningun instrumento ve.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
OPEN_STATES = ("pending", "in_progress")
#: El ordinal citado en prosa: `#123`, la forma que el tablero usa de verdad.
PROSE_REF = re.compile(r"#(\d{1,4})\b")


def board_root() -> pathlib.Path:
    """El hogar del tablero del cliente. Declarado gana; si no, el unico."""
    declared = os.environ.get("THYROX_BOARD_DIR")
    if declared:
        return pathlib.Path(declared)
    base = pathlib.Path.home() / ".claude" / "tasks"
    sessions = sorted(p for p in base.glob("*") if p.is_dir())
    if len(sessions) != 1:
        raise SystemExit(
            f"ERROR - {len(sessions)} sesion(es) bajo {base}; declara "
            "THYROX_BOARD_DIR. NO se emite conteo: un 0 aqui seria un verde falso."
        )
    return sessions[0]


def store_path() -> pathlib.Path:
    return HERE.parents[2] / "agent-results" / "agent_store.sqlite3"


def load_board(root: pathlib.Path) -> list[dict]:
    cards = []
    for entry in root.glob("*.json"):
        try:
            cards.append(json.loads(entry.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            print(f"  ILEGIBLE {entry.name}: {exc}", file=sys.stderr)
    cards.sort(key=lambda c: int(c.get("id", 0)))
    return cards


def declares_dependency(card: dict) -> tuple[bool, bool]:
    """(en el campo, en la prosa). Son ejes distintos y se cuentan aparte."""
    in_field = bool(card.get("blockedBy") or card.get("blocks"))
    text = f"{card.get('subject', '')} {card.get('description', '')}"
    in_prose = bool(PROSE_REF.search(text))
    return in_field, in_prose


def main(out_dir: pathlib.Path | None = None) -> int:
    # `out_dir` existe para el CONTROL, no para el uso: bajo anulacion del guard
    # `main()` sigue adelante con 0 tarjetas y sobreescribe `outputs/summary.json`
    # con ceros — medido. O sea que la ausencia del guard no solo deja de rehusar:
    # PUBLICA un cero, que es justo el verde falso que el guard existe para
    # impedir. Con el destino inyectable, el control se puede repetir sin que el
    # experimento contamine la evidencia que mide.
    out_dir = out_dir or (HERE / "outputs")
    root = board_root()
    cards = load_board(root)
    if not cards:
        print(f"ERROR - 0 tarjetas bajo {root}. NO se emite conteo.",
              file=sys.stderr)
        return 2

    out = out_dir / "board"
    out.mkdir(parents=True, exist_ok=True)
    for card in cards:
        (out / f"{card['id']}.json").write_text(
            json.dumps(card, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")

    db = store_path()
    subjects: set[str] = set()
    cited: dict[str, str] = {}
    if db.is_file():
        con = sqlite3.connect(db)
        for subject, citation in con.execute(
                "select subject, citation_id from tasks"):
            subjects.add(subject)
            if citation:
                cited[subject] = citation
        con.close()
    else:
        print(f"AVISO - store ausente en {db}: el eje de cobertura NO se mide.",
              file=sys.stderr)

    by_status: dict[str, int] = {}
    for card in cards:
        by_status[card.get("status", "?")] = by_status.get(
            card.get("status", "?"), 0) + 1

    open_cards = [c for c in cards if c.get("status") in OPEN_STATES]
    in_store = [c for c in open_cards if c.get("subject") in subjects]
    field = [c for c in open_cards if declares_dependency(c)[0]]
    prose = [c for c in open_cards if declares_dependency(c)[1]
             and not declares_dependency(c)[0]]
    silent = [c for c in open_cards if not any(declares_dependency(c))]

    resumen = {
        "board_dir": str(root),
        "cards_total": len(cards),
        "by_status": dict(sorted(by_status.items())),
        "open_total": len(open_cards),
        "open_in_store": len(in_store),
        "open_absent_from_store": len(open_cards) - len(in_store),
        "open_with_durable_citation": sum(
            1 for c in open_cards if c.get("subject") in cited),
        "dependency_in_field": len(field),
        "dependency_only_in_prose": len(prose),
        "dependency_undeclared": len(silent),
        "store": str(db),
        "store_task_rows": len(subjects),
    }
    (out_dir / "summary.json").write_text(
        json.dumps(resumen, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")

    for key, value in resumen.items():
        print(f"  {key:<28} {value}")
    print(f"OK: {len(cards)} tarjeta(s) volcadas "
          f"(alcance medido: {root})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
