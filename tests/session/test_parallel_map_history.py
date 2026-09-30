"""El historial de `parallel_map`: la memoria de un comando repartido.

`parallel_map` mide cada ítem con GNU Time, como los pools, y la siguiente
ejecución del MISMO comando deriva de esa medida su `--memfree` —la admisión
por memoria de GNU Parallel— y el tope de anchura por RAM. A diferencia de
`headless-pool` no hay modelo ni TTL de caché: sólo la mitad de memoria de
`pool_history.derive`, que por eso se extrae a `derive_memory` y `derive` la
reutiliza.

Contrato:
  - un historial por texto de comando, con la base declarable por entorno;
  - `derive_memory` sin historial no inventa: no emite cota y dice por qué;
  - con historial, `--memfree` es el pico medido por el margen, y el tope de
    anchura es la RAM disponible entre esa demanda;
  - `derive` sigue dando el mismo `--memfree` que antes de la extracción.
"""
from __future__ import annotations

import contextlib
import io
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from agents import model_catalog
from session import parallel_map_history as pmh
from session import pool_history as ph

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label}: esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def write_time(run: Path, n: int, kb: int, wall: float) -> None:
    run.mkdir(parents=True, exist_ok=True)
    (run / f"{n}.time").write_text(f"{kb} {wall} 0.00 0.00\n")


with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp) / "history"

    print("caso 1 — un historial por texto de comando")
    first = pmh.command_history_dir(base, "wc -l {}")
    check("el mismo comando da el mismo historial", first, pmh.command_history_dir(base, "wc -l {}"))
    check("otro comando da otro historial", False, first == pmh.command_history_dir(base, "wc -c {}"))
    check("vive bajo la base", base, first.parent)

    print("caso 2 — la base se declara por entorno")
    os.environ[pmh.HISTORY_DIR_VAR] = str(base)
    check("THYROX_PARALLEL_MAP_HISTORY_DIR gana", base, pmh.history_base())
    del os.environ[pmh.HISTORY_DIR_VAR]
    check("sin declararla cae en la caché del repo", "parallel-map", pmh.history_base().name)

    print("caso 3 — sin historial, derive_memory no inventa")
    empty = ph.derive_memory(first)
    check("sin memfree", None, empty.memfree)
    check("sin tope de RAM", None, empty.ram_cap)
    check("dice por qué", True, "sin ejecución previa" in empty.why)

    print("caso 4 — con una ejecución medida, memfree y tope de anchura")
    run = Path(tmp) / "run"
    write_time(run, 1, 100_000, 0.5)
    write_time(run, 2, 300_000, 1.5)
    ph.record(first, run)
    measured = ph.derive_memory(first, available_ram_kb=1_800_000)
    check("memfree = pico × 2, hacia arriba", "586M", measured.memfree)
    check("tope = RAM disponible / (pico × 2)", 3, measured.ram_cap)
    check("cita el pico", True, "300000" in measured.why)
    check("la reserva por ítem en kB = pico × 2", 600_000, measured.need_kb)

    print("caso 5 — derive sigue dando el mismo memfree")
    catalog = model_catalog.require_catalog()
    check("derive y derive_memory coinciden", measured.memfree,
          ph.derive(first, "claude-sonnet-5", catalog).memfree)

    print("caso 6 — la CLI: dir, record y derive por tabuladores")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = pmh.main(["derive", str(first), "--available-ram-kb", "1800000"])
    fields = out.getvalue().rstrip("\n").split("\t")
    check("sale 0", 0, code)
    check("memfree, tope y reserva en kB", ["586M", "3", "600000"], fields[:3])
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        pmh.main(["derive", str(pmh.command_history_dir(base, "otro"))])
    check("sin historial imprime campos vacíos", ["", "", ""], out.getvalue().split("\t")[:3])
    os.environ[pmh.HISTORY_DIR_VAR] = str(base)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        pmh.main(["dir", "wc -l {}"])
    check("dir imprime el historial del comando", str(first), out.getvalue().strip())
    del os.environ[pmh.HISTORY_DIR_VAR]

print(f"test_parallel_map_history: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
