"""El historial de `headless-pool`: medir una ejecución y derivar la siguiente.

El ciclo —ejecutar, medir con GNU Time, reportar, ajustar— vivía sólo en
`tsc_cycle.py`, así que quien invocaba `bin/headless-pool` directamente (un
consumidor que traduce notas, o esta misma sesión) quedaba fuera de él sin
saberlo: sin TTL decidido y con `--memfree` fijo en 3 GB cuando lo medido por
ítem fue 251–266 MB. `pool_history` lo lleva al propio pool: cada ejecución
deja una fila, y la siguiente deriva de ella lo que nadie declaró.

Contrato:
  - `record` lee los `<n>.time` de la salida y agrega UNA fila: ítems medidos,
    pared máxima y memoria pico máxima;
  - `derive` da el TTL con `choose_cache_ttl` (tres ramas) sobre la pared
    máxima, y `--memfree` como la memoria pico por un margen declarado;
  - sin historial NO inventa: no emite valores y dice por qué;
  - un `.time` de un ítem fallido se lee por su última línea con cifras.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from agents import model_catalog  # noqa: E402
from session import pool_history as ph  # noqa: E402

OK = FAILED = 0
MODEL = "claude-sonnet-5"


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}"); FAILED += 1


def run_with(times: list[str]) -> Path:
    out = Path(tempfile.mkdtemp(dir=TMP))
    for n, content in enumerate(times, start=1):
        (out / f"{n}.time").write_text(content)
    return out


catalog, reason = model_catalog.try_catalog()
if catalog is None:
    print(f"SIN MEDIR: no hay catálogo de modelos ({reason})"); raise SystemExit(2)

with tempfile.TemporaryDirectory() as raw:
    TMP = Path(raw)
    history = TMP / "historial"

    print("== 1. sin historial no se inventa nada ==")
    decision = ph.derive(history, MODEL, catalog)
    check("sin TTL", None, decision.cache_ttl)
    check("sin memfree", None, decision.memfree)
    check("y dice por qué", True, "sin ejecución previa" in decision.why)

    print("== 2. record agrega una fila con pared y memoria máximas ==")
    out = run_with(["250000 12.00 1.0 0.2\n", "266000 40.00 1.5 0.3\n"])
    ph.record(history, out)
    rows = [json.loads(l) for l in (history / "runs.jsonl").read_text().splitlines()]
    check("una fila", 1, len(rows))
    check("mide los dos ítems", 2, rows[0]["items_measured"])
    check("pared máxima", 40.0, rows[0]["max_wall_s"])
    check("memoria pico máxima", 266000, rows[0]["peak_kb"])

    print("== 3. el ítem fallido cuenta: se lee su última línea con cifras ==")
    out = run_with(["Command exited with non-zero status 124\n900000 600.00 5 1\n"])
    ph.record(history, out)
    last = json.loads((history / "runs.jsonl").read_text().splitlines()[-1])
    check("la memoria del ítem fallido entra", 900000, last["peak_kb"])

    print("== 4. derive: el TTL sigue las TRES ramas de choose_cache_ttl ==")
    for wall_s, expected in ((120.0, "5m"), (600.0, "1h"), (4000.0, "5m")):
        h = TMP / f"h-{int(wall_s)}"
        ph.record(h, run_with([f"100000 {wall_s} 1 0\n"]))
        check(f"pared {wall_s:g} s -> {expected}", expected, ph.derive(h, MODEL, catalog).cache_ttl)

    print("== 5. derive: --memfree es la memoria pico por el margen, en MiB ==")
    h = TMP / "h-mem"
    ph.record(h, run_with(["266000 10 1 0\n"]))
    check("266000 KB x 2 -> 520M", "520M", ph.derive(h, MODEL, catalog, margin=2.0).memfree)

    print("== 6. manda la ÚLTIMA ejecución, no la primera ==")
    check("la segunda fila decide", "1h", ph.derive(history, MODEL, catalog).cache_ttl)

    print("== 7. sin ningún .time medible, record no agrega fila ==")
    h = TMP / "h-vacio"
    ph.record(h, run_with(["no es una medida\n"]))
    check("sin fila", False, (h / "runs.jsonl").exists())

    print("== 8. el hogar del historial se deriva de la plantilla, no se elige ==")
    a, b = ph.history_dir(TMP, Path("/x/prompt.md")), ph.history_dir(TMP, Path("/y/prompt.md"))
    check("dos plantillas homónimas en rutas distintas no comparten historial", False, a == b)
    check("y el nombre es legible", True, a.name.startswith("prompt-"))

    print("== 9. la reserva de un vecino se SUMA a lo medido, no lo sustituye ==")
    h = TMP / "h-reserva"
    ph.record(h, run_with(["266000 10 1 0\n"]))
    check("266000 x 2 + 2 GiB -> 2568M", "2568M", ph.derive(h, MODEL, catalog, reserve_kb=2097152).memfree)

    print("== 10. sin historial, la reserva sola es la cota, y se dice ==")
    decision = ph.derive(TMP / "h-nada", MODEL, catalog, reserve_kb=2097152)
    check("memfree = la reserva", "2048M", decision.memfree)
    check("sin TTL inventado", None, decision.cache_ttl)
    check("nombra la reserva", True, "reserva" in decision.why)

print(f"\ntest_pool_history: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
