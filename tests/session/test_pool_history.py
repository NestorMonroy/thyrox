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

import contextlib
import io
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

    print("== 12. la VRAM: record guarda el pico de los .gpu, y sin ellos no inventa la clave ==")
    out = run_with(["266000 10 1 0\n"])
    (out / "1.gpu").write_text("3000 2500 90 20\n")
    (out / "2.gpu").write_text("1000 800 40 20\n")
    h = TMP / "h-vram"
    row = ph.record(h, out)
    assert row is not None
    check("pico de VRAM entre ítems", 3000, row.get("peak_vram_mib"))
    no_gpu = ph.record(TMP / "h-sin-gpu", run_with(["1 1 1 1\n"]))
    assert no_gpu is not None
    check("sin .gpu no hay clave: ausente no es cero", False, "peak_vram_mib" in no_gpu)

    print("== 13. la anchura se acota por VRAM: libre / (pico x margen) ==")
    check("12000 libres / (3000 x 2) -> 2 a la vez", 2, ph.derive(h, MODEL, catalog, margin=2.0, free_vram_mib=12000).width_cap)
    check("sin VRAM libre medida, sin tope", None, ph.derive(h, MODEL, catalog, margin=2.0).width_cap)
    # Cambio deliberado (H-THYROX-192): con GPU presente y un historial SIN
    # VRAM medida no se corre sin tope, se corre de a uno hasta calibrar.
    check("sin pico de VRAM en el historial y con GPU: de a uno hasta calibrar", 1,
          ph.derive(TMP / "h-sin-gpu", MODEL, catalog, free_vram_mib=12000).width_cap)
    tight = ph.derive(h, MODEL, catalog, margin=2.0, free_vram_mib=4000)
    check("si ni uno cabe, el tope es 1 y se dice", (1, True), (tight.width_cap, "no cabe" in tight.why))

    print("== 14. el margen de seguridad se RESTA de lo libre: (14000 - 2000) / 3200 = 3 ==")
    h = TMP / "h-ejemplo"
    out = run_with(["266000 10 1 0\n"])
    (out / "1.gpu").write_text("3200 3000 90 20\n")
    ph.record(h, out)
    d = ph.derive(h, MODEL, catalog, margin=1.0, free_vram_mib=14000, vram_reserve_mib=2000)
    check("tope de VRAM", 3, d.vram_cap)

    print("== 15. anchura efectiva = min(configurada, RAM, VRAM) ==")
    d = ph.derive(h, MODEL, catalog, margin=1.0, free_vram_mib=14000, vram_reserve_mib=2000,
                  available_ram_kb=6 * 266000 + 1000)
    check("tope de RAM: MemAvailable / pico", 6, d.ram_cap)
    check("el efectivo es el menor de los topes", 3, d.width_cap)
    check("con configurada 8: min(8, 6, 3) = 3", 3, ph.effective_width(8, d))
    check("con configurada 2 manda la configurada", 2, ph.effective_width(2, d))
    check("sin ningún tope, la configurada", 8, ph.effective_width(8, ph.derive(TMP / "vacio", MODEL, catalog)))

    print("== 16. un .gpu con error o ilegible NO entra al pico: sólo lo medido ==")
    out = run_with(["266000 10 1 0\n"])
    (out / "1.gpu").write_text("error NVML: fallo\n")
    (out / "2.gpu").write_text("0 0 0 9\n")
    row = ph.record(TMP / "h-tres", out)
    assert row is not None
    check("el 0 medido es el pico; el error no cuenta", 0, row.get("peak_vram_mib"))

    print("== 17. la VRAM que pide cada ítem para ser admitido: pico x margen ==")
    check("3200 x 1.0 -> 3200", 3200, ph.derive(TMP / "h-ejemplo", MODEL, catalog, margin=1.0).vram_need_mib)
    check("sin pico de VRAM, sin admisión", None, ph.derive(TMP / "h-sin-gpu", MODEL, catalog).vram_need_mib)

    print("== 18. la CLI: ttl, memfree, anchura efectiva, VRAM por ítem y porqué ==")

    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["derive", str(TMP / "h-ejemplo"), MODEL, "--margin", "1", "--configured-width", "8",
                 "--free-vram-mib", "14000", "--vram-reserve-mib", "2000"])
    fields = buffer.getvalue().rstrip("\n").split("\t")
    check("anchura efectiva y VRAM por ítem", ["3", "3200"], fields[2:4])

    print("== 19. record guarda la cobertura de la medida: ítems con VRAM medida y pared mínima ==")
    out = run_with(["266000 10 1 0\n", "266000 0.2 1 0\n"])
    (out / "1.gpu").write_text("3000 2500 90 20\n")
    (out / "2.gpu").write_text("error NVML: fallo\n")
    row = ph.record(TMP / "h-cobertura", out)
    assert row is not None
    check("ítems con VRAM medida (el del error no cuenta)", 1, row.get("items_gpu_measured"))
    check("la pared del ítem más corto", 0.2, row.get("min_wall_s"))

    print("== 20. ¿es fiable el historial de VRAM? calibrado, o por qué no ==")
    def calibrated(rows_or_none):
        return ph.vram_calibration(rows_or_none, gpu_interval_s=0.5)
    full = {"items_measured": 2, "items_gpu_measured": 2, "min_wall_s": 3.0, "peak_vram_mib": 1200}
    check("todos medidos y largos: calibrado", True, calibrated(full)[0])
    check("sin ejecución previa", (False, True), (calibrated(None)[0], "sin ejecución" in calibrated(None)[1]))
    no_vram = {k: v for k, v in full.items() if k != "peak_vram_mib"}
    check("sin VRAM medida", False, calibrated(no_vram)[0])
    partial = {**full, "items_gpu_measured": 1}
    check("VRAM medida en 1 de 2: no fiable, y lo dice", (False, True),
          (calibrated(partial)[0], "1 de 2" in calibrated(partial)[1]))
    short = {**full, "min_wall_s": 0.6}
    check("un ítem de 0.6 s con muestras cada 0.5 s: un 0 puede ser un pico no visto", False, calibrated(short)[0])
    legacy = {"items_measured": 2, "max_wall_s": 3.0, "peak_kb": 1, "peak_vram_mib": 0}
    check("fila anterior a la calibración: no fiable", (False, True),
          (calibrated(legacy)[0], "anterior" in calibrated(legacy)[1]))

    print("== 21. lo que se pide: calibrado, piso declarado o exclusiva hasta calibrar ==")
    def history_with(name, row):
        h = TMP / name
        h.mkdir()
        (h / ph.HISTORY_FILE).write_text(json.dumps(row) + "\n")
        return h
    # Envoltorio en vez de un dict fusionado: `dict(a=14000, b=2000, c=0.5)`
    # unifica sus valores al tipo comun mas ancho (float), y `derive()` pide
    # `int` en dos de los tres — un `**kw` de funcion sí conserva el tipo de
    # cada argumento por separado.
    def with_gpu(history, **kw):
        assert catalog is not None  # ya lo verifico el `raise SystemExit` de arriba
        return ph.derive(history, MODEL, catalog, free_vram_mib=14000,
                          vram_reserve_mib=2000, gpu_interval_s=0.5, **kw)
    stale_zero = history_with("h-cero-corto", {"items_measured": 2, "items_gpu_measured": 2, "min_wall_s": 0.1,
                                               "max_wall_s": 0.1, "peak_kb": 1000, "peak_vram_mib": 0})
    d = with_gpu(stale_zero, margin=2.0)
    check("H-THYROX-192: pico 0 de ítems demasiado cortos -> pide la GPU entera", 12000, d.vram_need_mib)
    check("... y de a uno", 1, d.width_cap)
    check("... y lo dice", True, "hasta calibrar" in d.why)
    d = with_gpu(TMP / "h-nunca", margin=2.0)
    check("sin historial y con GPU: exclusiva y de a uno", (12000, 1), (d.vram_need_mib, d.width_cap))
    d = with_gpu(stale_zero, margin=2.0, vram_floor_mib=1500)
    check("con piso declarado: pide el piso", 1500, d.vram_need_mib)
    check("... y la anchura la acota el piso: 12000 / 1500 = 8", 8, d.width_cap)
    zero_ok = history_with("h-cero-fiable", {"items_measured": 2, "items_gpu_measured": 2, "min_wall_s": 5.0,
                                             "max_wall_s": 5.0, "peak_kb": 1000, "peak_vram_mib": 0})
    d = with_gpu(zero_ok, margin=2.0)
    check("pico 0 calibrado y sin piso: no pide VRAM, y lo dice", (None, True),
          (d.vram_need_mib, "pico 0" in d.why))
    check("con piso, el piso manda sobre el 0", 700,
          with_gpu(zero_ok, margin=2.0, vram_floor_mib=700).vram_need_mib)
    check("calibrado: max(pico x margen, piso)", 6400,
          with_gpu(history_with("h-cal", {**full, "max_wall_s": 3.0, "peak_kb": 1, "peak_vram_mib": 3200}),
                    margin=2.0, vram_floor_mib=700).vram_need_mib)
    d = ph.derive(TMP / "h-nunca", MODEL, catalog, margin=2.0)
    check("sin GPU no cambia nada: ni pedido ni tope", (None, None), (d.vram_need_mib, d.width_cap))

    print("== 22. la CLI recibe el intervalo y el piso ==")
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["derive", str(stale_zero), MODEL, "--margin", "2", "--configured-width", "8",
                 "--free-vram-mib", "14000", "--vram-reserve-mib", "2000", "--gpu-interval", "0.5",
                 "--vram-floor-mib", "0"])
    check("anchura 1 y la GPU entera", ["1", "12000"], buffer.getvalue().split("\t")[2:4])

print(f"\ntest_pool_history: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
