#!/usr/bin/env python3
"""Suite de ``verify/visual_qa.py`` — QA visual post-build (TASK-THYROX-0042).

Origen: generaliza ``tools/scripts/render_pdf_qa.py``
(``NestorMonroy/ai-course-notes@717e2df6``), bajo la premisa que declara —
"LaTeX 编译通过不等于 PDF 可读" ("compilar limpio no es lo mismo que legible")—
aplicada al HTML que produce Sphinx, no al PDF que produce LaTeX: nada en
``docs-design-first-rup.md``/``test-execution-protocol.md`` exige, ni
siquiera opcionalmente, un chequeo del HTML renderizado.

RESTRICCIÓN EXPLÍCITA DEL EJECUTOR, en las dos direcciones: ni el reporte
del gate usa emoji/icono, ni el gate deja pasar un emoji/icono en el
artefacto que audita.

Lo que la suite mide:

1. ``visible_text`` — sólo el ``<body>``, sin ``<script>``/``<style>``, sin
   etiquetas. Un ``<head>`` cargado de metadatos no cuenta como contenido.
2. ``find_near_empty`` — cita la RUTA del archivo, no un conteo agregado
   (caso de aceptación de TASK-THYROX-0042: "el gate lo reporta nombrando
   el archivo").
3. ``find_near_empty`` NO marca una página con contenido real.
4. ``find_emoji_or_icon`` — cita el CODEPOINT (``U+2705``), nunca el glifo
   crudo, para que el propio hallazgo no reintroduzca el emoji que denuncia.
5. ``find_emoji_or_icon`` NO marca acentos/eñes del español ni ASCII llano.
6. ``format_report`` — texto plano; NINGÚN carácter del reporte cae en el
   rango Unicode de emoji, ni siquiera al reportar una página que sí lo
   tiene.
7. ANULACIÓN: con ``min_chars=0`` (la mitad de juicio del umbral
   retirada), ``find_near_empty`` deja de marcar la página rota — el caso
   de aceptación exacto de TASK-THYROX-0042 ("sobre el mismo build sin la
   página rota, el gate no reporta nada" invertido: sin umbral, tampoco
   reporta la rota).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import visual_qa as vqa  # noqa: E402

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


PAGE_NORMAL = """
<html><head><title>SOLO-EN-HEAD-NO-DEBE-APARECER</title><script>var x=1;</script>
<style>.a{color:red}</style></head>
<body>
<h1>Guia de instalacion</h1>
<p>Este documento explica paso a paso como instalar el proyecto en un
entorno limpio, incluyendo dependencias y verificacion post-instalacion.</p>
</body></html>
"""

PAGE_BROKEN = """
<html><head><title>Guia</title></head>
<body>
<h1>Guia</h1>
</body></html>
"""

PAGE_WITH_EMOJI = """
<html><head><title>Estado</title></head>
<body>
<h1>Estado del build</h1>
<p>Todo funciona correctamente. ✅ Compilacion exitosa.</p>
</body></html>
"""

print("=== 1. visible_text — sólo <body>, sin script/style/etiquetas ===")
text = vqa.visible_text(PAGE_NORMAL)
check("no incluye el título del <head>", False, "SOLO-EN-HEAD-NO-DEBE-APARECER" in text)
check("no incluye el contenido del <script>", False, "var x=1" in text)
check("sí incluye el párrafo del body", True, "paso a paso" in text)

print("=== 2. find_near_empty cita la ruta ===")
pages = {"build/html/guia.html": PAGE_NORMAL, "build/html/rota.html": PAGE_BROKEN}
findings = vqa.find_near_empty(pages, min_chars=40)
check("una sola página rota, citada por ruta", ["build/html/rota.html"], [h.path for h in findings])
check("el tipo de hallazgo es near_empty", "near_empty", findings[0].kind)

print("=== 3. find_near_empty no marca la página normal ===")
check("la página normal no aparece", True, "build/html/guia.html" not in [h.path for h in findings])

print("=== 4. find_emoji_or_icon cita el CODEPOINT, no el glifo ===")
findings_emoji = vqa.find_emoji_or_icon({"build/html/estado.html": PAGE_WITH_EMOJI})
check("un hallazgo, citado por ruta", ["build/html/estado.html"], [h.path for h in findings_emoji])
check("el detalle cita el codepoint", True, "U+2705" in findings_emoji[0].detail)
check("el detalle NO contiene el glifo crudo", False, "✅" in findings_emoji[0].detail)

print("=== 5. find_emoji_or_icon no marca español/ASCII llano ===")
without_emoji = vqa.find_emoji_or_icon({"build/html/guia.html": PAGE_NORMAL})
check("sin hallazgos sobre texto llano con acentos", [], without_emoji)

print("=== 6. format_report — ningún carácter del reporte es emoji ===")
every = vqa.find_near_empty(pages, min_chars=40) + findings_emoji
report = vqa.format_report(every)
EMOJI_SPAN = range(0x1F300, 0x1FB00)
check("ningún carácter del reporte cae en el rango de emoji", True,
      all(ord(c) not in EMOJI_SPAN for c in report))
check("el reporte sí nombra la ruta de cada hallazgo", True,
      "build/html/rota.html" in report and "build/html/estado.html" in report)

print("=== 7. ANULACIÓN — min_chars=0 apaga el chequeo ===")
without_threshold = vqa.find_near_empty(pages, min_chars=0)
check("con min_chars=0, la página rota deja de marcarse", [], without_threshold)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
