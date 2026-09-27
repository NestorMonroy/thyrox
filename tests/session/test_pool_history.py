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
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from agents import model_catalog
from session import pool_history as ph

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

    print("== 23. la cota es del BINARIO que corrió: thyrox -p no mide thyrox -p ==")
    # `headless-pool` corre sus ítems con `thyrox -p` (`HEADLESS_POOL_RUNNER=bin/cli`)
    # desde la #48. Una fila medida con `thyrox -p` es OTRO proceso: aplicarla
    # a `thyrox -p` daría una cota medida sobre algo que ya no corre.
    h = TMP / "h-runner"
    row = ph.record(h, run_with(["300000 10 1 0\n"]), runner="bin/cli")
    check("record guarda el binario", "bin/cli", row["runner"] if row else None)
    ph.record(h, run_with(["900000 10 1 0\n"]), runner="claude")
    check("derive usa la última fila DE SU binario, no la última a secas", "586M",
          ph.derive(h, MODEL, catalog, margin=2.0, runner="bin/cli").memfree)
    check("... y la del otro binario sigue siendo suya", "1758M",
          ph.derive(h, MODEL, catalog, margin=2.0, runner="claude").memfree)
    legacy = history_with("h-legacy", {"items_measured": 1, "min_wall_s": 5.0,
                                       "max_wall_s": 5.0, "peak_kb": 250000})
    d = ph.derive(legacy, MODEL, catalog, margin=2.0, runner="bin/cli")
    check("una fila sin binario no se aplica a uno declarado", (None, None), (d.memfree, d.cache_ttl))
    check("... y dice por qué", True, "bin/cli" in d.why)
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["record", str(TMP / "h-cli-runner"), str(run_with(["400000 10 1 0\n"])),
                 "--runner", "bin/cli"])
        ph.main(["derive", str(TMP / "h-cli-runner"), MODEL, "--margin", "2", "--runner", "bin/cli"])
    check("la CLI recibe --runner en las dos órdenes", "782M",
          buffer.getvalue().splitlines()[-1].split("\t")[1])

    print("== 24. la cota es del MODELO que corrió los ítems ==")
    # Una plantilla corrida con otro modelo es otra carga: su pico de RAM y de
    # VRAM no predice el de éste. Con ``item_model`` la fila lo guarda y la
    # derivación sólo usa las de ese modelo.
    h = TMP / "h-modelo"
    row = ph.record(h, run_with(["300000 10 1 0\n"]), runner="bin/cli", item_model="claude-sonnet-5")
    check("record guarda el modelo", "claude-sonnet-5", row["item_model"] if row else None)
    ph.record(h, run_with(["900000 10 1 0\n"]), runner="bin/cli", item_model="claude-opus-5")
    check("derive usa la fila de su modelo", "586M",
          ph.derive(h, MODEL, catalog, margin=2.0, runner="bin/cli", item_model="claude-sonnet-5").memfree)
    check("... y la del otro modelo es la del otro", "1758M",
          ph.derive(h, MODEL, catalog, margin=2.0, runner="bin/cli", item_model="claude-opus-5").memfree)
    d = ph.derive(h, MODEL, catalog, margin=2.0, runner="bin/cli", item_model="claude-haiku-4-5")
    check("un modelo sin filas no hereda la de otro", (None, None), (d.memfree, d.cache_ttl))
    check("... y lo nombra", True, "claude-haiku-4-5" in d.why)
    check("sin item_model se conserva la conducta anterior", "1758M",
          ph.derive(h, MODEL, catalog, margin=2.0, runner="bin/cli").memfree)
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["record", str(TMP / "h-cli-modelo"), str(run_with(["400000 10 1 0\n"])),
                 "--runner", "bin/cli", "--item-model", "claude-sonnet-5"])
        ph.main(["derive", str(TMP / "h-cli-modelo"), MODEL, "--margin", "2", "--runner", "bin/cli",
                 "--item-model", "claude-opus-5"])
    check("la CLI recibe --item-model en las dos órdenes", "-",
          buffer.getvalue().splitlines()[-1].split("\t")[1])

    print("== 25. la fila guarda la distribución, la plantilla y la fecha ==")
    # Sólo el pico no deja calcular un percentil ni separar «un ítem pesado» de
    # «todos pesados»; sin huella de plantilla ni fecha no se sabe si la fila
    # describe a la plantilla de hoy.
    out = run_with([f"{kb} 10 1 0\n" for kb in (100000, 200000, 300000, 400000, 500000,
                                                600000, 700000, 800000, 900000, 1000000)])
    for n, mib in enumerate((100, 200, 300, 400, 500, 600, 700, 800, 900, 1000), start=1):
        (out / f"{n}.gpu").write_text(f"{mib} {mib} 50 20\n")
    when = datetime(2026, 9, 27, 6, 0, 0, tzinfo=UTC)
    row = ph.record(TMP / "h-dist", out, template_digest="abc123", now=when)
    assert row is not None
    check("mediana de RAM por ítem (rango cercano)", 500000, row.get("median_kb"))
    check("p90 de RAM por ítem", 900000, row.get("p90_kb"))
    check("el pico sigue siendo el máximo", 1000000, row.get("peak_kb"))
    check("mediana de VRAM", 500, row.get("median_vram_mib"))
    check("p90 de VRAM", 900, row.get("p90_vram_mib"))
    check("la huella de la plantilla", "abc123", row.get("template_digest"))
    check("la fecha, en UTC", "2026-09-27T06:00:00Z", row.get("recorded_at"))
    prompt = TMP / "plantilla.md"
    prompt.write_text("Item: {}\n")
    check("la huella es del CONTENIDO: estable", ph.template_digest(prompt), ph.template_digest(prompt))
    other = TMP / "otra.md"
    other.write_text("Item: {} con otra instrucción\n")
    check("... y cambia si el contenido cambia", False,
          ph.template_digest(prompt) == ph.template_digest(other))

    print("== 26. calibrado exige ítems suficientes, la misma plantilla y una fila reciente ==")
    base = {**full, "items_measured": 4, "items_gpu_measured": 4, "template_digest": "abc123",
            "recorded_at": "2026-09-27T06:00:00Z"}
    now = datetime(2026, 9, 27, 8, 0, 0, tzinfo=UTC)
    def cal(row, **kw):
        return ph.vram_calibration(row, gpu_interval_s=0.5, now=now, **kw)
    check("con todo en regla: calibrado", True,
          cal(base, min_items=4, template_digest="abc123", max_age_s=3 * 3600)[0])
    few = cal(base, min_items=8)
    check("4 ítems medidos para lanzar 8 a la vez: no representa su dispersión", (False, True),
          (few[0], "4" in few[1] and "8" in few[1]))
    changed = cal(base, template_digest="zzz999")
    check("la plantilla cambió desde esa ejecución", (False, True), (changed[0], "plantilla" in changed[1]))
    unmarked = cal({k: v for k, v in base.items() if k != "template_digest"}, template_digest="abc123")
    check("una fila sin huella no describe a la plantilla de hoy", False, unmarked[0])
    old = cal(base, max_age_s=3600)
    check("una fila de hace 2 h con límite de 1 h: vieja", (False, True), (old[0], "límite" in old[1]))
    undated = cal({k: v for k, v in base.items() if k != "recorded_at"}, max_age_s=3600)
    check("una fila sin fecha no pasa un límite declarado", False, undated[0])
    check("sin límite declarado, la edad no cuenta", True, cal(base)[0])
    d = ph.derive(history_with("h-vieja", {**base, "max_wall_s": 3.0, "peak_kb": 1, "peak_vram_mib": 3200}),
                  MODEL, catalog, margin=2.0, free_vram_mib=14000, vram_reserve_mib=2000,
                  gpu_interval_s=0.5, min_items=8, now=now)
    check("derive con pocos ítems: pide la GPU entera, de a uno", (12000, 1), (d.vram_need_mib, d.width_cap))

    print("== 27. la CLI recibe la plantilla, los ítems mínimos y la edad máxima ==")
    history_cli = TMP / "h-cli-cal"
    out = run_with(["300000 10 1 0\n", "300000 10 1 0\n"])
    for n in (1, 2):
        (out / f"{n}.gpu").write_text("3000 2500 90 20\n")
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["record", str(history_cli), str(out), "--template", str(prompt)])
    stored = json.loads((history_cli / ph.HISTORY_FILE).read_text().splitlines()[-1])
    check("record --template guarda la huella", ph.template_digest(prompt), stored.get("template_digest"))
    check("... y la fecha", True, bool(stored.get("recorded_at")))
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["derive", str(history_cli), MODEL, "--margin", "1", "--free-vram-mib", "14000",
                 "--gpu-interval", "0.5", "--template", str(other), "--min-items", "2",
                 "--max-age-hours", "24"])
    check("derive --template con OTRA plantilla: la GPU entera", "14000",
          buffer.getvalue().split("\t")[3])
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ph.main(["derive", str(history_cli), MODEL, "--margin", "1", "--free-vram-mib", "14000",
                 "--gpu-interval", "0.5", "--template", str(prompt), "--min-items", "2",
                 "--max-age-hours", "24"])
    check("... con la MISMA plantilla: el pico medido", "3000", buffer.getvalue().split("\t")[3])

print(f"\ntest_pool_history: {OK} ok, {FAILED} falla(s)")
raise SystemExit(1 if FAILED else 0)
