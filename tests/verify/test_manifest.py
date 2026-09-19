#!/usr/bin/env python3
"""Suite de ``verify/manifest.py`` — el nodo de cobertura y su presentación.

Origen: TASK-THYROX-0039, mitad "construir el manifiesto" de
``build_lecture_manifest.py`` (``NestorMonroy/ai-course-notes@717e2df6``,
``tools/scripts/``). Separada de ``test_coverage.py`` porque
``manifest.py`` y ``coverage.py`` son dos módulos con responsabilidad
única distinta — ver el docstring de ``verify/manifest.py``.

Lo que la suite mide:

1. ``Node`` es sólo datos — sin acoplarse a un formato de fuente (ni
   LaTeX, ni RST en particular).
2. ``render_manifest`` — la tabla markdown, con el ``|`` de un título
   escapado (si no se escapa, un título con pipe rompe la tabla).

El control de anulación de este módulo (retirar el escape de ``render_
manifest`` sobre el archivo real y confirmar que caen exactamente las
dos aserciones del bloque 2, no las del bloque 1) se corre y se restaura
manualmente al cerrar la tarea — no se persiste una copia mutada del
módulo dentro de la suite.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import manifest as mf  # noqa: E402

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


print("=== 1. Node es sólo datos ===")
n = mf.Node(node_id="n-001", kind="section", title="Introducción", source="doc.rst")
check("required por defecto", True, n.required)
check("campos accesibles", ("n-001", "section", "Introducción", "doc.rst"),
      (n.node_id, n.kind, n.title, n.source))

print("=== 2. render_manifest escapa el pipe ===")
with_pipe = [mf.Node("n-005", "text", "A | B", "doc.rst")]
table = mf.render_manifest(with_pipe)
check("titulo con pipe escapado", True, "A \\| B" in table)
check("titulo con pipe crudo NO aparece", False, "| A | B |" in table)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
