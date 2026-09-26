#!/usr/bin/env python3
"""Control de `src/verify/step_report.py`: el informe por paso del lazo.

Origen: self-evolving-agents-2026, lección 2: «informar por separado la
eficiencia del sistema, la eficiencia de los datos, la capacidad final y el
costo, para evitar atribuir por completo la mejora de una sola capa». El paso
sólo publicaba su total de tsc.

Qué haría fallar a este control:
- mezclar las capas (un solo número, o el tiempo dentro de la aceptación);
- un costo que no pondere la caché releída (98 % del consumo de un agente)
  o que publique USD de lista como costo;
- un ancho completo o una cola lenta que no salgan del joblog real;
- un informe sin lotes medidos que publique ceros en vez de rehusar.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import step_report as sr

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


with tempfile.TemporaryDirectory() as tmp:
    bench = Path(tmp) / "step-9"
    (bench / "outputs").mkdir(parents=True)
    # Tres ítems a ancho 2: 1 y 2 juntos de 0 a 10; el 3 solo de 10 a 40.
    # El joblog registra los ítems en orden de TÉRMINO, no de Seq: el 3 termina
    # último pero aquí va primero, como pasa en el joblog real del paso 155.
    rows = [(3, 10.0, 30.0, 1), (1, 0.0, 10.0, 0), (2, 0.0, 10.0, 0)]
    (bench / "outputs/joblog.tsv").write_text(
        "Seq\tHost\tStarttime\tJobRuntime\tSend\tReceive\tExitval\tSignal\tCommand\n"
        + "".join(f"{n}\t:\t{1000 + s}\t{r}\t0\t0\t{e}\t0\tx\n" for n, s, r, e in rows))
    usage = {"input_tokens": 10, "cache_creation_input_tokens": 100, "cache_read_input_tokens": 1000,
             "output_tokens": 20}
    for n in (1, 2, 3):
        (bench / f"outputs/{n}.json").write_text(json.dumps({"usage": usage, "total_cost_usd": 9.99,
                                                             "is_error": n == 3}))
    pipeline = bench / "pipeline"
    for n, (before, final, outcomes) in enumerate(((50, 45, {"a": "accepted", "b": "rejected"}),
                                                  (45, 40, {"c": "accepted-partial", "d": "partial"})), 1):
        (pipeline / f"batch-0{n}").mkdir(parents=True)
        (pipeline / f"batch-0{n}/report.json").write_text(json.dumps(
            {"total_before": before, "total_final": final, "outcomes": outcomes, "tsc_runs": 2}))
    report = sr.step_report(bench, pipeline)
    assert_equal("cuatro capas separadas", ["capability", "cost", "data", "system"], sorted(report))
    assert_equal("sistema: pared del pool y fracción a ancho completo, del joblog",
                 (40.0, 0.25), (report["system"]["pool_wall_s"], report["system"]["full_width_share"]))
    assert_equal("sistema: el ítem lento frente a la mediana, y los ítems fallidos",
                 (3.0, 1), (report["system"]["straggler_ratio"], report["system"]["failed_items"]))
    assert_equal("sistema: pasadas de tsc del pipeline", 4, report["system"]["tsc_runs"])
    assert_equal("datos: propuestas, aceptadas y tasa", (4, 2, 0.5),
                 (report["data"]["proposals"], report["data"]["accepted"], report["data"]["acceptance"]))
    assert_equal("capacidad: del primer total al último", (50, 40, -10),
                 (report["capability"]["total_before"], report["capability"]["total_final"],
                  report["capability"]["delta"]))
    # 10*1 + 100*1.25 + 1000*0.1 + 20*5 = 335 por ítem, 3 ítems.
    assert_equal("costo en tokens equivalentes ponderados, y por aceptada", (1005.0, 502.5),
                 (report["cost"]["equiv_tokens"], report["cost"]["equiv_per_accepted"]))
    assert_equal("el USD de lista no se publica como costo", False, "usd" in json.dumps(report["cost"]).lower())
    assert_equal("sin archivos .time la memoria se declara no medida, no cero", {"measured": 0},
                 report["system"]["memory_kb"])
    for n, peak in ((1, 300000), (2, 900000), (3, 600000)):
        (bench / f"outputs/{n}.time").write_text(f"{peak} 12.00 3.00 1.00\n")
    (bench / "outputs/4.time").write_text("no es una medida\n")
    report = sr.step_report(bench, pipeline)
    assert_equal("la memoria pico de los items: máxima, mediana y cuántos se midieron",
                 {"measured": 3, "max": 900000, "median": 600000}, report["system"]["memory_kb"])
    assert_equal("sin modelUsage la base es la fórmula fija, declarada", {"(sin modelo)": "fija-3-15"},
                 report["cost"]["basis"])

    # El mismo uso en Opus 5.5, con la escritura a 1h: su tier lee a 0.05× y
    # escribe a 2×; 10 + 100*2 + 1000*0.05 + 20*5 = 360, no 335.
    opus_usage = {**usage, "cache_creation": {"ephemeral_1h_input_tokens": 100, "ephemeral_5m_input_tokens": 0}}
    for n in (1, 2, 3):
        (bench / f"outputs/{n}.json").write_text(json.dumps(
            {"usage": opus_usage, "modelUsage": {"claude-opus-5-5": {"inputTokens": 10}}}))
    report = sr.step_report(bench, pipeline)
    assert_equal("costo con los cocientes del tier del modelo de cada salida", (1080.0, 540.0),
                 (report["cost"]["equiv_tokens"], report["cost"]["equiv_per_accepted"]))
    assert_equal("la base de cada modelo se publica", {"claude-opus-5-5": "tier_4_20_cache_read_0_20"},
                 report["cost"]["basis"])

    empty = Path(tmp) / "empty"
    (empty / "outputs").mkdir(parents=True)
    try:
        sr.step_report(empty, empty / "pipeline")
        refused = False
    except Exception as error:  # noqa: BLE001 — la negativa tiene que ser ValueError, no otro fallo
        refused = type(error) is ValueError
    assert_equal("sin lotes medidos rehúsa en vez de publicar ceros", True, refused)

print(f"test_step_report: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
