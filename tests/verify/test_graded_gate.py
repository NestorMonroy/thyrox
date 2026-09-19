#!/usr/bin/env python3
"""Suite de ``verify/graded_gate.py`` — gate de calidad graduado, multi-eje.

Origen: TASK-THYROX-0040. Generaliza ``tools/scripts/check_quality.sh``
(``NestorMonroy/ai-course-notes@717e2df6``): varios ejes, cada uno con
umbral nombrado, y un veredicto GRADUADO (no sólo pasa/no pasa) — la
referencia usa tres niveles de estrella; aquí SIN glifos decorativos, texto
plano, mismo idioma que ``check_veredicto_de_gate.py``
(``OK``/``WARN``/``ERROR``).

Lo que la suite mide:

1. ``failing_axes`` — cita el eje, su umbral y su valor medido; no un
   conteo. Es el "reporta ambos fallos con su umbral" del caso de
   aceptación de TASK-THYROX-0040.
2. ``grade`` con tiers ascendentes — cada tier exige un CONJUNTO de ejes,
   no un conteo total; dos artefactos con el mismo número de ejes en
   verde pueden calificar distinto si no son los mismos ejes.
3. ``grade`` sobre resultados vacíos -> ``ValueError`` (mismo idioma que
   ``coverage.coverage_report`` y ``job_runs.duration_
   distribution``: no hay con qué graduar).
4. ``format_report`` — texto plano, sin ningún carácter fuera de ASCII
   imprimible salvo el contenido citado; nunca un glifo de estrella u
   otro emoji/icono decorativo (restricción explícita del ejecutor,
   aplicada aquí también, no sólo en TASK-THYROX-0042).
5. ANULACIÓN: bajar el umbral de un eje reprobado al mínimo posible debe
   hacer desaparecer EXACTAMENTE ese fallo del reporte, sin tocar los
   otros — el caso de aceptación textual de TASK-THYROX-0040.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import graded_gate as gg  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def axis(name, measured, threshold, reason="sin razon declarada"):
    return gg.AxisResult(name=name, measured=measured, threshold=threshold,
                          passed=measured >= threshold, reason=reason)


print("=== 1. failing_axes cita eje + umbral + medido ===")
results = [
    axis("boxes", 3, 5, "cinco cajas minimas por leccion"),
    axis("prose_per_fig", 300, 260, "260 caracteres por figura"),
    axis("figs", 2, 3, "tres figuras minimas"),
]
failures = gg.failing_axes(results)
check("dos ejes fallan, citados por nombre", ["boxes", "figs"], [f.name for f in failures])
check("cada fallo trae su umbral y su valor medido", (5, 3), (failures[0].threshold, failures[0].measured))

print("=== 2. grade con tiers ascendentes por CONJUNTO de ejes ===")
TIERS = [
    ("BASICO", frozenset({"boxes"})),
    ("ESTANDAR", frozenset({"boxes", "figs"})),
    ("EXCELENTE", frozenset({"boxes", "figs", "prose_per_fig"})),
]
only_boxes_failure = [axis("boxes", 2, 5), axis("figs", 10, 3), axis("prose_per_fig", 300, 260)]
check("BASICO exige boxes; boxes falla -> ningun tier",
      None, gg.grade(only_boxes_failure, TIERS)["tier"])

every_minus_prose = [axis("boxes", 10, 5), axis("figs", 10, 3), axis("prose_per_fig", 100, 260)]
check("boxes y figs pasan, prosa no -> ESTANDAR, no EXCELENTE",
      "ESTANDAR", gg.grade(every_minus_prose, TIERS)["tier"])

every_passes = [axis("boxes", 10, 5), axis("figs", 10, 3), axis("prose_per_fig", 300, 260)]
check("los tres pasan -> EXCELENTE (el tier mas alto)",
      "EXCELENTE", gg.grade(every_passes, TIERS)["tier"])

print("=== 3. grade sobre resultados vacíos ===")
try:
    gg.grade([], TIERS)
    check("vacío -> ValueError", True, False)
except ValueError:
    check("vacío -> ValueError", True, True)

print("=== 4. format_report — texto plano, sin glifos decorativos ===")
report = gg.format_report(results)
check("sin caracteres fuera de ASCII imprimible", True,
      all(32 <= ord(c) <= 126 or c in "\n\táéíóúñÁÉÍÓÚÑ"
          for c in report))
check("idioma OK/FAIL, no emoji", True, "OK" in report and "FAIL" in report)
check("el eje reprobado nombra su umbral", True, "5" in report and "boxes" in report)

print("=== 5. ANULACIÓN — bajar UN umbral cambia SOLO ese fallo ===")
results_fixed = [
    axis("boxes", 3, 3, "cinco cajas minimas por leccion — bajado a 3 para la prueba"),
    axis("prose_per_fig", 300, 260, "260 caracteres por figura"),
    axis("figs", 2, 3, "tres figuras minimas"),
]
failures_after_lower = gg.failing_axes(results_fixed)
check("con el umbral de boxes bajado, sólo figs sigue fallando — nada más cambió",
      ["figs"], [f.name for f in failures_after_lower])

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
