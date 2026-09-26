"""El historial de `headless-pool`: medir una ejecución y derivar la siguiente.

El ciclo —ejecutar, medir con GNU Time, reportar, ajustar— vivía sólo en
`verify/tsc_cycle.py`; quien invocaba `bin/headless-pool` directamente quedaba
fuera de él. Este módulo lo lleva al pool:

- ``record`` lee los ``<n>.time`` que el pool deja (``%M %e %U %S``) y agrega
  UNA fila a ``runs.jsonl``: ítems medidos, pared máxima, memoria pico máxima;
- ``derive`` decide, desde la ÚLTIMA fila, el TTL de caché con
  ``choose_cache_ttl`` —la pared máxima de un ítem es el mayor hueco que la
  caché tiene que atravesar— y ``--memfree`` como la memoria pico por un margen.

Sin historial no inventa: devuelve ``None`` y lo dice. Lo declarado a mano
gana siempre; esa precedencia la aplica el pool, no este módulo.

Métrica: memoria residente pico y pared por ítem, de GNU Time.
Ciega a: la memoria de los hijos que el proceso medido no espera, y a un ítem
cuyo ``.time`` no llegó a escribirse (murió GNU Time con él).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from agents import model_catalog
from cache.paths import cache_dir

HISTORY_FILE = "runs.jsonl"
DEFAULT_MARGIN = 2.0
_MEASURE = re.compile(r"^\s*(\d+)\s+([0-9.]+)\s+[0-9.]+\s+[0-9.]+\s*$")


@dataclass(frozen=True)
class Decision:
    cache_ttl: str | None
    memfree: str | None
    why: str


#: El hogar de los historiales, parámetro del consumidor. Sin él, bajo el
#: caché del repo en el que corre el pool (`cache.paths.cache_dir`).
HISTORY_DIR_VAR = "HEADLESS_POOL_HISTORY_DIR"


def history_base() -> Path:
    declared = os.environ.get(HISTORY_DIR_VAR)
    if declared:
        return Path(declared)
    return cache_dir() / "headless-pool"


def history_dir(base: Path, prompt_path: Path) -> Path:
    """Un historial por plantilla: nombre legible más un hash de su ruta
    absoluta, para que dos plantillas homónimas no compartan filas."""
    resolved = str(Path(prompt_path).resolve())
    digest = hashlib.sha256(resolved.encode()).hexdigest()[:12]
    return Path(base) / f"{Path(prompt_path).stem}-{digest}"


def _last_measure(time_file: Path) -> tuple[int, float] | None:
    """La última línea con cifras: sin ``-q``, un ítem fallido antepone
    «Command exited with non-zero status N»."""
    try:
        lines = time_file.read_text(errors="replace").splitlines()
    except OSError:
        return None
    for line in reversed(lines):
        match = _MEASURE.match(line)
        if match:
            return int(match.group(1)), float(match.group(2))
    return None


def record(history: Path, out_dir: Path) -> dict | None:
    """Agrega la fila de la ejecución cuya salida es ``out_dir``; ``None`` si
    ningún ``.time`` fue medible (no se escribe una fila de ceros)."""
    measures = [m for m in (_last_measure(p) for p in sorted(Path(out_dir).glob("*.time"))) if m]
    if not measures:
        return None
    row = {
        "items_measured": len(measures),
        "max_wall_s": max(wall for _, wall in measures),
        "peak_kb": max(kb for kb, _ in measures),
    }
    history = Path(history)
    history.mkdir(parents=True, exist_ok=True)
    with open(history / HISTORY_FILE, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")
    return row


def _last_row(history: Path) -> dict | None:
    path = Path(history) / HISTORY_FILE
    if not path.is_file():
        return None
    rows = [line for line in path.read_text().splitlines() if line.strip()]
    return json.loads(rows[-1]) if rows else None


def _mebibytes(kb: float) -> str:
    """Hacia arriba: una cota de admisión que redondea hacia abajo reserva
    menos de lo medido."""
    return f"{math.ceil(kb / 1024)}M"


def derive(history: Path, model: str, catalog: dict, margin: float = DEFAULT_MARGIN,
           reserve_kb: int = 0) -> Decision:
    """TTL y ``--memfree`` desde la última ejecución medida de esta plantilla.

    ``reserve_kb`` es la memoria de un VECINO que corre junto al pool (el
    ``tsc`` del pipeline, en ``tsc_cycle``): se suma a lo medido del ítem,
    porque la admisión de Parallel tiene que dejar sitio a los dos."""
    reserve_note = f" + reserva {reserve_kb} KB" if reserve_kb else ""
    row = _last_row(history)
    if row is None:
        if reserve_kb:
            return Decision(None, _mebibytes(reserve_kb),
                            f"sin ejecución previa de esta plantilla: la cota es sólo la reserva {reserve_kb} KB")
        return Decision(None, None, "sin ejecución previa de esta plantilla: nada que derivar")
    ttl, ttl_why = model_catalog.choose_cache_ttl(catalog, model, row["max_wall_s"] / 60)
    memfree = _mebibytes(row["peak_kb"] * margin + reserve_kb)
    why = (f"última ejecución: {row['items_measured']} ítems, pared máx {row['max_wall_s']:g} s, "
           f"pico {row['peak_kb']} KB × {margin:g}{reserve_note} -> {memfree}; TTL {ttl}: {ttl_why}")
    return Decision(ttl, memfree, why)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p_dir = sub.add_parser("dir", help="imprime el historial de una plantilla")
    p_dir.add_argument("prompt")
    p_rec = sub.add_parser("record", help="agrega la fila de una ejecución")
    p_rec.add_argument("history"); p_rec.add_argument("out_dir")
    p_der = sub.add_parser("derive", help="imprime TTL, memfree y porqué, separados por tabulador")
    p_der.add_argument("history"); p_der.add_argument("model")
    p_der.add_argument("--margin", type=float, default=DEFAULT_MARGIN)
    p_der.add_argument("--reserve-kb", type=int, default=0)
    args = parser.parse_args(argv)

    if args.command == "dir":
        print(history_dir(history_base(), Path(args.prompt)))
        return 0
    if args.command == "record":
        row = record(Path(args.history), Path(args.out_dir))
        print(json.dumps(row) if row else "historial: ningún .time medible, sin fila")
        return 0
    catalog, reason = model_catalog.try_catalog()
    if catalog is None:
        print(f"ERROR — sin catálogo de modelos ({reason}); no se deriva nada", file=sys.stderr)
        return 2
    decision = derive(Path(args.history), args.model, catalog, args.margin, args.reserve_kb)
    # `-` y no vacío: `read` con IFS de tabulador colapsa dos tabuladores
    # seguidos, y un campo vacío corre al siguiente a su lugar.
    print(f"{decision.cache_ttl or '-'}\t{decision.memfree or '-'}\t{decision.why}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
