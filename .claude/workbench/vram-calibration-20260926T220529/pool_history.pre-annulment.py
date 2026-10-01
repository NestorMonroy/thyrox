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
from session import gpu_monitor
from cache.paths import cache_dir

HISTORY_FILE = "runs.jsonl"
DEFAULT_MARGIN = 2.0
#: El intervalo de muestreo de VRAM del pool, el mismo de `gpu_monitor watch`.
DEFAULT_GPU_INTERVAL_S = gpu_monitor.DEFAULT_INTERVAL_S
_MEASURE = re.compile(r"^\s*(\d+)\s+([0-9.]+)\s+[0-9.]+\s+[0-9.]+\s*$")


@dataclass(frozen=True)
class Decision:
    cache_ttl: str | None
    memfree: str | None
    why: str
    #: El menor de los topes medidos; ``None`` si no hubo ninguno.
    width_cap: int | None = None
    #: Cuántos ítems caben a la vez en la RAM disponible y en la VRAM libre.
    ram_cap: int | None = None
    vram_cap: int | None = None
    #: La VRAM libre que un ítem espera antes de arrancar (pico × margen): la
    #: admisión que ``--memfree`` hace para la RAM y Parallel no hace para la GPU.
    vram_need_mib: int | None = None


def effective_width(configured: int, decision: Decision) -> int:
    """La anchura con que se lanza: la configurada, acotada por cada tope
    medido — ``min(configurada, RAM, VRAM)``."""
    return min(configured, decision.width_cap) if decision.width_cap else configured


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


def _gpu_peak(gpu_file: Path) -> int | None:
    """El pico de VRAM de un ``<n>.gpu`` MEDIDO —el cero incluido—; ``None``
    si el archivo es un error o está ausente: los tres estados de
    ``gpu_monitor.read_gpu_file``, sin colapsar."""
    reading = gpu_monitor.read_gpu_file(gpu_file)
    return reading.summary.peak_mib if reading.state == "measured" else None


def record(history: Path, out_dir: Path) -> dict | None:
    """Agrega la fila de la ejecución cuya salida es ``out_dir``; ``None`` si
    ningún ``.time`` fue medible (no se escribe una fila de ceros).

    Sin ``shared_lock``, a propósito: es UN ``write`` en modo añadir de una
    línea de menos de 4 KB, que Linux escribe entera; no hay leer-comprobar-
    añadir como en ``step_setup.register``, así que dos pools concurrentes
    dejan dos filas enteras y el lock no tendría caso que lo discrimine."""
    measures = [m for m in (_last_measure(p) for p in sorted(Path(out_dir).glob("*.time"))) if m]
    if not measures:
        return None
    row = {
        "items_measured": len(measures),
        "max_wall_s": max(wall for _, wall in measures),
        "min_wall_s": min(wall for _, wall in measures),
        "peak_kb": max(kb for kb, _ in measures),
    }
    vram = [p for p in (_gpu_peak(g) for g in Path(out_dir).glob("*.gpu")) if p is not None]
    if vram:
        row["peak_vram_mib"] = max(vram)
    # La cobertura de la medida de VRAM: los ítems con `.time` cuyo `.gpu` del
    # mismo número es una MEDIDA. Sin ella un pico 0 no distingue «ningún ítem
    # usó GPU» de «a la mitad no se les midió» (H-THYROX-192).
    row["items_gpu_measured"] = sum(
        1 for t in Path(out_dir).glob("*.time")
        if _last_measure(t) and _gpu_peak(t.with_suffix(".gpu")) is not None)
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


def _cap(label: str, unit: str, free: int | None, reserve: int, peak: int | None,
         margin: float) -> tuple[int | None, str]:
    """Cuántos ítems caben a la vez: ``(libre − reserva) / (pico × margen)``.
    La reserva se RESTA de lo libre —lo que queda para el resto del sistema—
    y el margen multiplica el pico medido. Sin pico o sin libre medido, no hay
    tope; un pico de 0 (el ítem no usó el recurso) tampoco lo acota."""
    if not peak or free is None:
        return None, ""
    usable = free - reserve
    fits = int(usable // (peak * margin))
    if fits < 1:
        return 1, (f"; {label}: {usable} {unit} utilizables y el ítem pide {peak} × {margin:g}, "
                   f"no cabe ni uno: anchura 1")
    return fits, f"; {label}: ({free} − {reserve}) / ({peak} × {margin:g}) -> {fits}"


#: Muestras mínimas de VRAM por ítem para creer su pico: un ítem más corto que
#: dos intervalos puede terminar sin que el monitor lo vea asignar.
MIN_GPU_SAMPLES = 2


def vram_calibration(row: dict | None, gpu_interval_s: float) -> tuple[bool, str]:
    """¿Describe el historial la VRAM de los ítems que se van a lanzar? Sólo
    si la última ejecución midió la VRAM de TODOS sus ítems y cada uno duró lo
    bastante para ser visto. Un 0 medido es una medida; como predicción sólo
    vale con esa cobertura (H-THYROX-192)."""
    if row is None:
        return False, "sin ejecución previa de esta plantilla"
    if "peak_vram_mib" not in row:
        return False, "la última ejecución no midió VRAM"
    if "items_gpu_measured" not in row or "min_wall_s" not in row:
        return False, "fila anterior a la calibración: sin cobertura de la medida"
    if row["items_gpu_measured"] < row["items_measured"]:
        return False, f"VRAM medida en {row['items_gpu_measured']} de {row['items_measured']} ítems"
    if row["min_wall_s"] < MIN_GPU_SAMPLES * gpu_interval_s:
        return False, (f"el ítem más corto duró {row['min_wall_s']:g} s, menos de {MIN_GPU_SAMPLES} "
                       f"muestras de {gpu_interval_s:g} s: un 0 puede ser un pico no visto")
    return True, "calibrado"


def vram_request(row: dict | None, calibrated: bool, margin: float, floor_mib: int,
                 exclusive_mib: int) -> tuple[int | None, str]:
    """Lo que pide cada ítem para ser admitido. Calibrado: el pico por el
    margen, nunca menos que el piso declarado. Sin calibrar: el piso si se
    declaró; si no, la GPU entera —exclusiva a través del registro, así que
    protege también entre pools— hasta que una ejecución la calibre."""
    if calibrated:
        need = max(math.ceil(row["peak_vram_mib"] * margin), floor_mib)
        if need == 0:
            return None, "pico 0 calibrado y sin piso: no pide VRAM"
        return need, f"pide {need} MiB (pico × {margin:g}, piso {floor_mib})"
    if floor_mib:
        return floor_mib, f"pide el piso declarado, {floor_mib} MiB"
    return exclusive_mib, f"pide la GPU entera ({exclusive_mib} MiB), de a uno hasta calibrar"


def _vram_decision(row: dict | None, free_vram_mib: int | None, vram_reserve_mib: int, margin: float,
                   floor_mib: int, gpu_interval_s: float) -> tuple[int | None, int | None, str]:
    """(tope, pedido, porqué) de VRAM. Sin GPU medida, lo de siempre: el pico
    del historial, sin tope ni política."""
    if free_vram_mib is None:
        peak = (row or {}).get("peak_vram_mib")
        return None, (math.ceil(peak * margin) if peak else None), ""
    calibrated, why_cal = vram_calibration(row, gpu_interval_s)
    need, why_need = vram_request(row, calibrated, margin, floor_mib, max(free_vram_mib - vram_reserve_mib, 0))
    if calibrated:
        cap, why_cap = _cap("VRAM", "MiB", free_vram_mib, vram_reserve_mib, row["peak_vram_mib"], margin)
    elif floor_mib:
        cap, why_cap = _cap("VRAM", "MiB", free_vram_mib, vram_reserve_mib, floor_mib, 1.0)
    else:
        cap, why_cap = 1, ""
    return cap, need, f"; VRAM {why_cal}: {why_need}{why_cap}"


def derive(history: Path, model: str, catalog: dict, margin: float = DEFAULT_MARGIN,
           reserve_kb: int = 0, free_vram_mib: int | None = None, vram_reserve_mib: int = 0,
           available_ram_kb: int | None = None, vram_floor_mib: int = 0,
           gpu_interval_s: float = DEFAULT_GPU_INTERVAL_S) -> Decision:
    """TTL y ``--memfree`` desde la última ejecución medida de esta plantilla.

    ``reserve_kb`` es la memoria de un VECINO que corre junto al pool (el
    ``tsc`` del pipeline, en ``tsc_cycle``): se suma a lo medido del ítem,
    porque la admisión de Parallel tiene que dejar sitio a los dos."""
    reserve_note = f" + reserva {reserve_kb} KB" if reserve_kb else ""
    row = _last_row(history)
    vram_cap, need, vram_why = _vram_decision(row, free_vram_mib, vram_reserve_mib, margin,
                                              vram_floor_mib, gpu_interval_s)
    if row is None:
        if reserve_kb:
            return Decision(None, _mebibytes(reserve_kb),
                            f"sin ejecución previa de esta plantilla: la cota es sólo la reserva {reserve_kb} KB"
                            + vram_why, vram_cap, None, vram_cap, need)
        return Decision(None, None, "sin ejecución previa de esta plantilla: nada que derivar" + vram_why,
                        vram_cap, None, vram_cap, need)
    ttl, ttl_why = model_catalog.choose_cache_ttl(catalog, model, row["max_wall_s"] / 60)
    memfree = _mebibytes(row["peak_kb"] * margin + reserve_kb)
    why = (f"última ejecución: {row['items_measured']} ítems, pared máx {row['max_wall_s']:g} s, "
           f"pico {row['peak_kb']} KB × {margin:g}{reserve_note} -> {memfree}; TTL {ttl}: {ttl_why}")
    ram_cap, ram_why = _cap("RAM", "KB", available_ram_kb, reserve_kb, row.get("peak_kb"), margin)
    caps = [c for c in (ram_cap, vram_cap) if c is not None]
    return Decision(ttl, memfree, why + ram_why + vram_why, min(caps) if caps else None, ram_cap, vram_cap, need)


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
    p_der.add_argument("--configured-width", type=int, default=None)
    p_der.add_argument("--free-vram-mib", type=int, default=None)
    p_der.add_argument("--vram-reserve-mib", type=int, default=0)
    p_der.add_argument("--available-ram-kb", type=int, default=None)
    p_der.add_argument("--gpu-interval", type=float, default=DEFAULT_GPU_INTERVAL_S)
    p_der.add_argument("--vram-floor-mib", type=int, default=0)
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
    decision = derive(Path(args.history), args.model, catalog, args.margin, args.reserve_kb,
                      free_vram_mib=args.free_vram_mib, vram_reserve_mib=args.vram_reserve_mib,
                      available_ram_kb=args.available_ram_kb, vram_floor_mib=args.vram_floor_mib,
                      gpu_interval_s=args.gpu_interval)
    width = effective_width(args.configured_width, decision) if args.configured_width else decision.width_cap
    # `-` y no vacío: `read` con IFS de tabulador colapsa dos tabuladores
    # seguidos, y un campo vacío corre al siguiente a su lugar.
    print(f"{decision.cache_ttl or '-'}\t{decision.memfree or '-'}\t{width or '-'}\t"
          f"{decision.vram_need_mib or '-'}\t{decision.why}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
