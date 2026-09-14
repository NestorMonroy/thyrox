#!/usr/bin/env python3
"""Mide la divergencia entre el board del cliente y la tabla ``tasks``.

La pregunta que responde: de las tarjetas que el board declara cerradas,
¿cuántas siguen ``pending`` en el store? Ése es el trabajo que un cierre
automático haría, y su tamaño es lo que decide si la pieza hace falta.

El emparejamiento es por **sujeto exacto dentro de la sesión**, no por
ordinal. El ordinal del board se reusa: en la sesión viva el ordinal 184 del
store nombra otro sujeto que la tarjeta 184 (medido en ``board_sync.py``), así
que parear por ordinal escribiría el estado de un trabajo sobre otro.

*Métrica:* cada ``<ordinal>.json`` del board comparado con las filas de
``tasks`` de la misma ``session_id``, por igualdad exacta de ``subject``.
*Ciega a:* un renombre — cambia el texto del sujeto, así que la tarjeta
renombrada se lee como sujeto nuevo y su fila anterior como huérfana. Los dos
casos caen en cubos distintos y ninguno se corrige aquí.
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import sqlite3
import sys

#: Los cubos en que cae cada tarjeta. Se declaran como tupla y no se infieren
#: del recorrido: un cubo que sólo existe cuando algo cae en él haría que un
#: reporte sin esa clase se leyera como «esa clase no ocurre».
BUCKETS = ("same", "status_drift", "absent", "ambiguous")


def load_board(board_dir: pathlib.Path) -> dict:
    """Las tarjetas del board, indexadas por su ordinal."""
    cards = {}
    for path in sorted(board_dir.glob("*.json")):
        try:
            cards[path.stem] = json.loads(path.read_text())
        except json.JSONDecodeError as err:
            # Una tarjeta ilegible NO se salta en silencio: se registra como
            # tal, porque su ausencia del conteo sería un cero falso.
            cards[path.stem] = {"subject": None, "status": None,
                                "_unreadable": str(err)}
    return cards


def classify(cards: dict, rows: list) -> dict:
    """Reparte cada tarjeta en su cubo contra las filas del store."""
    by_subject = collections.defaultdict(list)
    for task_id, subject, status, citation in rows:
        by_subject[subject].append((task_id, status, citation))

    buckets = {name: [] for name in BUCKETS}
    for ordinal, card in sorted(cards.items(), key=lambda kv: int(kv[0])):
        subject = card.get("subject")
        matches = by_subject.get(subject, [])
        if len(matches) > 1:
            buckets["ambiguous"].append((ordinal, subject, card.get("status"),
                                         [m[2] for m in matches]))
        elif not matches:
            buckets["absent"].append((ordinal, subject, card.get("status"), None))
        else:
            task_id, store_status, citation = matches[0]
            target = "status_drift" if store_status != card.get("status") else "same"
            buckets[target].append((ordinal, subject, card.get("status"),
                                    (task_id, store_status, citation)))
    return buckets


def report(buckets: dict, total: int, session_id: str) -> None:
    print(f"divergencia board <-> store  (sesion {session_id})")
    print(f"  universo: {total} tarjeta(s) del board")
    for name in BUCKETS:
        print(f"  {name:14s} {len(buckets[name]):5d}")
    covered = sum(len(buckets[n]) for n in BUCKETS)
    print(f"  {'suma':14s} {covered:5d}   "
          f"{'(cubre el universo)' if covered == total else '(NO cubre — revisar)'}")

    drift = buckets["status_drift"]
    if drift:
        print(f"\n  las {len(drift)} con estado divergente "
              f"(board -> store), que es lo que un cierre propagaria:")
        for ordinal, subject, board_status, (task_id, store_status, citation) in drift:
            print(f"    #{ordinal:<5} {citation:<18} "
                  f"{board_status:>12} -> {store_status:<12} {subject[:46]}")
        by_pair = collections.Counter(
            (b, s[1]) for _, _, b, s in drift)
        print("\n  por par (board, store):")
        for (b, s), n in by_pair.most_common():
            print(f"    {b:>12} en board, {s:<12} en store : {n}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("session_id")
    parser.add_argument("--store", required=True)
    parser.add_argument("--board", required=True)
    args = parser.parse_args(argv)

    board_dir = pathlib.Path(args.board)
    store_path = pathlib.Path(args.store)
    if not board_dir.is_dir() or not store_path.exists():
        # Rehusa sin publicar cifra: un 0 aqui no distinguiria «no hay
        # divergencia» de «no pude medir».
        print(f"REHUSA — falta el board {board_dir} o el store {store_path}",
              file=sys.stderr)
        return 2

    cards = load_board(board_dir)
    conn = sqlite3.connect(f"file:{store_path}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            "SELECT task_id, subject, status, citation_id FROM tasks "
            " WHERE session_id = ?", (args.session_id,)).fetchall()
    finally:
        conn.close()
    print(f"  filas de la sesion en el store: {len(rows)}")
    report(classify(cards, rows), len(cards), args.session_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
