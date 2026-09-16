#!/usr/bin/env python3
"""Suite de ``verify/coverage.py`` — verificación de cobertura contra un manifiesto.

Origen: TASK-THYROX-0039, mitad "verificar cobertura" de
``check_note_coverage.py`` (``NestorMonroy/ai-course-notes@717e2df6``,
``tools/scripts/``) — hoy repetido a mano en tres reglas de consumidor:
``porte-completo-no-parcial.md`` (censo de atributos de una clase),
``principio-rector-rup-arquitectura.md`` Cláusula 4 (barrido de 8 capas),
``hallazgo-abierto-genera-sucesor.md`` (seguimiento de qué quedó sin
cerrar). Ninguna reutiliza mecanismo — cada una greppea a su manera.
Separada de ``test_manifest.py`` porque ``coverage.py`` y ``manifest.py``
son dos módulos con responsabilidad única distinta — ver el docstring de
``verify/coverage.py``.

Lo que la suite mide:

1. ``probe_candidates`` — un título que parece ruta también se busca por
   nombre de archivo y por stem (mismo comportamiento que
   ``check_note_coverage.py`` aplica a nodos ``slide``/``figure``, aquí sin
   nombrar esos dos kinds a propósito: es genérico a cualquier título con
   forma de ruta).
2. ``find_missing`` — cita el ID exacto del nodo ausente, no un conteo ni un
   porcentaje (la exigencia explícita de TASK-THYROX-0039: "el verificador
   reporta el ID exacto del nodo faltante").
3. ``find_missing`` con ``required_only=False`` también reporta opcionales
   ausentes.
4. ``coverage_report`` sobre manifiesto vacío -> ``ValueError`` (mismo
   idioma que ``job_runs.duration_distribution``: un 0 aquí no
   distinguiría "cobertura completa" de "nada que medir").
5. ``coverage_report`` — conteo completo.

El control de anulación de este módulo (retirar la guarda
``required_only`` dentro de ``find_missing`` sobre el archivo real y
confirmar que cae exactamente una aserción del bloque 3 — la que exige
que el opcional NO cuente por defecto — sin mover ninguna otra) se corre
y se restaura manualmente al cerrar la tarea, no se persiste una copia
mutada del módulo dentro de la suite.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import coverage as cv  # noqa: E402
from verify.manifest import Node  # noqa: E402

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


print("=== 1. probe_candidates ===")
plano = Node(node_id="n-002", kind="text", title="Un párrafo cualquiera", source="doc.rst")
check("título sin forma de ruta -> un solo candidato", ["Un párrafo cualquiera"],
      cv.probe_candidates(plano))
con_ruta = Node(node_id="n-003", kind="figure", title="slides-images/slide-013.jpg", source="deck.pdf")
check("título con forma de ruta -> título + nombre + stem",
      ["slides-images/slide-013.jpg", "slide-013.jpg", "slide-013"],
      cv.probe_candidates(con_ruta))

print("=== 2. find_missing cita el ID exacto ===")
nodos = [
    Node("n-001", "section", "Introducción", "doc.rst"),
    Node("n-002", "figure", "grafica-ventas.png", "doc.rst"),
    Node("n-003", "section", "Cierre", "doc.rst"),
]
artefacto = "El documento habla de Introducción y también de Cierre, sin figuras."
faltantes = cv.find_missing(nodos, artefacto)
check("un solo nodo requerido falta, citado por ID", ["n-002"], [x.node_id for x in faltantes])

print("=== 3. required_only=False agrega opcionales ausentes ===")
nodos_con_opcional = nodos + [Node("n-004", "text", "Nota al margen", "doc.rst", required=False)]
faltantes_req = cv.find_missing(nodos_con_opcional, artefacto, required_only=True)
faltantes_todos = cv.find_missing(nodos_con_opcional, artefacto, required_only=False)
check("por defecto NO cuenta el opcional ausente", ["n-002"], [x.node_id for x in faltantes_req])
check("con required_only=False SÍ lo cuenta", ["n-002", "n-004"],
      sorted(x.node_id for x in faltantes_todos))

print("=== 4. coverage_report sobre manifiesto vacío ===")
try:
    cv.coverage_report([], artefacto)
    check("manifiesto vacío -> ValueError", True, False)
except ValueError:
    check("manifiesto vacío -> ValueError", True, True)

print("=== 5. coverage_report — conteo completo ===")
reporte = cv.coverage_report(nodos, artefacto)
check("total", 3, reporte["total"])
check("required", 3, reporte["required"])
check("optional", 0, reporte["optional"])
check("covered", 2, reporte["covered"])
check("missing_ids", ["n-002"], reporte["missing_ids"])

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
