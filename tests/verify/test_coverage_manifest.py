#!/usr/bin/env python3
"""Suite de ``verify/coverage_manifest.py`` — censo de nodos + verificación de cobertura.

Origen: TASK-THYROX-0039. Generaliza el patrón de
``build_lecture_manifest.py``/``check_note_coverage.py`` (repositorio de
referencia ``NestorMonroy/ai-course-notes@717e2df6``, ``tools/scripts/``),
hoy repetido a mano en tres reglas de consumidor: ``porte-completo-no-
parcial.md`` (censo de atributos de una clase), ``principio-rector-rup-
arquitectura.md`` Cláusula 4 (barrido de 8 capas), ``hallazgo-abierto-genera-
sucesor.md`` (seguimiento de qué quedó sin cerrar). Ninguna reutiliza
mecanismo — cada una greppea a su manera.

Lo que la suite mide:

1. ``Node`` es sólo datos — sin acoplarse a un formato de fuente (ni LaTeX,
   ni RST en particular). El módulo trabaja sobre CUALQUIER lista de nodos
   que el llamador construya.
2. ``probe_candidates`` — un título que parece ruta también se busca por
   nombre de archivo y por stem (mismo comportamiento que
   ``check_note_coverage.py`` aplica a nodos ``slide``/``figure``, aquí sin
   nombrar esos dos kinds a propósito: es genérico a cualquier título con
   forma de ruta).
3. ``find_missing`` — cita el ID exacto del nodo ausente, no un conteo ni un
   porcentaje (la exigencia explícita de TASK-THYROX-0039: "el verificador
   reporta el ID exacto del nodo faltante").
4. ``find_missing`` con ``required_only=False`` también reporta opcionales
   ausentes — es el control de anulación de la distinción
   required/optional: si al retirarla el reporte no cambia, la distinción
   no se estaba usando.
5. ``coverage_report`` sobre manifiesto vacío -> ``ValueError`` (mismo
   idioma que ``job_runs.duration_distribution``: un 0 aquí no
   distinguiría "cobertura completa" de "nada que medir").
6. ``render_manifest`` — la tabla markdown, con el ``|`` de un título
   escapado (si no se escapa, un título con pipe rompe la tabla).
7. ANULACIÓN: quitando el `required_only` de `find_missing` (siempre
   ``False``), la aserción 4 sigue viendo lo mismo — pero la aserción del
   caso de aceptación de TASK-THYROX-0039 (bloque 8, "el nodo opcional NO
   cuenta como faltante por defecto") cae. Se mide exactamente eso, no una
   caída genérica.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import coverage_manifest as cm  # noqa: E402

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
n = cm.Node(node_id="n-001", kind="section", title="Introducción", source="doc.rst")
check("required por defecto", True, n.required)
check("campos accesibles", ("n-001", "section", "Introducción", "doc.rst"),
      (n.node_id, n.kind, n.title, n.source))

print("=== 2. probe_candidates ===")
plano = cm.Node(node_id="n-002", kind="text", title="Un párrafo cualquiera", source="doc.rst")
check("título sin forma de ruta -> un solo candidato", ["Un párrafo cualquiera"],
      cm.probe_candidates(plano))
con_ruta = cm.Node(node_id="n-003", kind="figure", title="slides-images/slide-013.jpg", source="deck.pdf")
check("título con forma de ruta -> título + nombre + stem",
      ["slides-images/slide-013.jpg", "slide-013.jpg", "slide-013"],
      cm.probe_candidates(con_ruta))

print("=== 3. find_missing cita el ID exacto ===")
nodos = [
    cm.Node("n-001", "section", "Introducción", "doc.rst"),
    cm.Node("n-002", "figure", "grafica-ventas.png", "doc.rst"),
    cm.Node("n-003", "section", "Cierre", "doc.rst"),
]
artefacto = "El documento habla de Introducción y también de Cierre, sin figuras."
faltantes = cm.find_missing(nodos, artefacto)
check("un solo nodo requerido falta, citado por ID", ["n-002"], [x.node_id for x in faltantes])

print("=== 4. required_only=False agrega opcionales ausentes ===")
nodos_con_opcional = nodos + [cm.Node("n-004", "text", "Nota al margen", "doc.rst", required=False)]
faltantes_req = cm.find_missing(nodos_con_opcional, artefacto, required_only=True)
faltantes_todos = cm.find_missing(nodos_con_opcional, artefacto, required_only=False)
check("por defecto NO cuenta el opcional ausente", ["n-002"], [x.node_id for x in faltantes_req])
check("con required_only=False SÍ lo cuenta", ["n-002", "n-004"],
      sorted(x.node_id for x in faltantes_todos))

print("=== 5. coverage_report sobre manifiesto vacío ===")
try:
    cm.coverage_report([], artefacto)
    check("manifiesto vacío -> ValueError", True, False)
except ValueError:
    check("manifiesto vacío -> ValueError", True, True)

print("=== 5b. coverage_report — conteo completo ===")
reporte = cm.coverage_report(nodos, artefacto)
check("total", 3, reporte["total"])
check("required", 3, reporte["required"])
check("optional", 0, reporte["optional"])
check("covered", 2, reporte["covered"])
check("missing_ids", ["n-002"], reporte["missing_ids"])

print("=== 6. render_manifest escapa el pipe ===")
con_pipe = [cm.Node("n-005", "text", "A | B", "doc.rst")]
tabla = cm.render_manifest(con_pipe)
check("titulo con pipe escapado", True, "A \\| B" in tabla)
check("titulo con pipe crudo NO aparece", False, "| A | B |" in tabla)

print("=== 7. ANULACIÓN — required_only ignorado, el caso de aceptación cae ===")


def find_missing_sin_distincion(nodes, artifact_text, *, required_only=True):
    # Anulación: la distinción required/optional deja de aplicarse.
    return cm.find_missing(nodes, artifact_text, required_only=False)


faltantes_anulado = find_missing_sin_distincion(nodos_con_opcional, artefacto, required_only=True)
check(
    "anulación: sin la distinción, el opcional SÍ se marca aunque se pidió required_only=True "
    "(cae el caso de aceptación de TASK-THYROX-0039)",
    ["n-002", "n-004"], sorted(x.node_id for x in faltantes_anulado),
)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
