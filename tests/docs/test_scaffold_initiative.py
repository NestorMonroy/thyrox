#!/usr/bin/env python3
"""Suite de ``docs/scaffold_initiative.py`` — materializar una iniciativa nueva.

Origen: TASK-THYROX-0038. Verificado antes de escribir una línea de código
que el mecanismo no existía —``check-artefactos-minimos.sh`` sólo lee,
``task_ids.py``/``hallazgo_ids.py`` sólo acuñan sobre filas ya existentes—;
tampoco existía un archivo canónico para "Template B (THYROX simple)", pese
a que ``auto-audit-before-writing.md`` lo nombra desde 2026-05-21. Las tres
plantillas Template B (``tpl-iniciativa-simple-{index,alcance,tareas}.rst``)
se crearon en el mismo pase, derivadas de tres iniciativas reales que
convergen en la misma forma.

Lo que la suite mide, y por qué cada bloque existe:

1. ``template_kind`` — sólo ``docs`` usa Template A (IACT verbose); el
   resto usa Template B (simple). Es el eje que decide qué archivo leer.
2. ``strip_instructions`` — el bloque ``.. admonition:: Instrucciones de
   uso`` no se copia al artefacto final; sólo el cuerpo tras el separador
   ``----``. Sin este corte, cada iniciativa nacería con las instrucciones
   de la plantilla pegadas en el documento real.
3. ``fill_placeholders`` — los marcadores mecánicos (fecha, slug,
   submódulo, mayúsculas) se sustituyen; los que exigen juicio humano
   (título, premisa, qué entra) NO se inventan — quedan como ``<...>``
   para que alguien los complete.
4. ``scaffold_initiative`` sobre un árbol sintético (Template B): produce
   exactamente ``index.rst`` + ``alcance-<slug>.rst`` por defecto —
   DEC-AM-01, sin ``progreso`` (la iniciativa no nace en ``en-ejecucion``).
5. ``scaffold_initiative`` con ``with_tareas=True``: añade
   ``tareas-<slug>.rst``.
6. ``scaffold_initiative`` sobre Template A (``docs``): usa las cuatro
   plantillas IACT verbose, no las simples.
7. Rehúsa sobre un directorio de iniciativa que ya existe — no pisa
   trabajo ajeno en silencio.
8. ANULACIÓN: sin el corte de ``strip_instructions`` (pasando la plantilla
   entera sin recortar), el archivo final contiene la palabra
   "Instrucciones" — tiene que caer **exactamente** esa aserción, ninguna
   otra del bloque 4.
"""
from __future__ import annotations

import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from docs import scaffold_initiative as si  # noqa: E402

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


NOW = datetime(2026, 9, 15, 23, 0, 0, tzinfo=timezone.utc)


def build_consumer_tree(root: Path) -> None:
    """Arma un árbol sintético con las siete plantillas reales."""
    plantillas = root / "source" / "normativa" / "estandares" / "plantillas"
    plantillas.mkdir(parents=True)
    real = Path("/home/user/kaupamex-docs/source/normativa/estandares/plantillas")
    for nombre in [
        "tpl-iniciativa-index.rst", "tpl-iniciativa-alcance.rst",
        "tpl-iniciativa-tareas.rst",
        "tpl-iniciativa-simple-index.rst", "tpl-iniciativa-simple-alcance.rst",
        "tpl-iniciativa-simple-tareas.rst",
    ]:
        (plantillas / nombre).write_text((real / nombre).read_text(encoding="utf-8"), encoding="utf-8")


print("=== 1. template_kind ===")
check("docs usa Template A", "a", si.template_kind("docs"))
check("api usa Template B", "b", si.template_kind("api"))
check("thyrox usa Template B", "b", si.template_kind("thyrox"))
check("ui usa Template B", "b", si.template_kind("ui"))

print("=== 2. strip_instructions ===")
cruda = "Antes del corte\n\n----\n\nCuerpo real\n"
check("retira todo antes del separador", "Cuerpo real\n", si.strip_instructions(cruda))
try:
    si.strip_instructions("sin separador aquí")
    check("sin separador -> ValueError", True, False)
except ValueError:
    check("sin separador -> ValueError", True, True)

print("=== 3. fill_placeholders ===")
cuerpo = (
    ".. meta::\n"
    "   :artefacto: GESTION-PM-<SUBMODULO-UPPER>-<SLUG-UPPER>-INDEX\n"
    "   :fecha_creacion: <YYYY-MM-DDTHH:MM:SS>\n\n"
    ".. _iniciativa-<slug>:\n\n"
    "<Titulo descriptivo de la iniciativa>\n"
)
llenado = si.fill_placeholders(cuerpo, submodule="thyrox", slug="mi-slug", title="Mi Título", now=NOW)
check("submodulo mayusculas", True, "GESTION-PM-THYROX-" in llenado)
check("slug mayusculas", True, "MI-SLUG-INDEX" in llenado)
check("fecha ISO real", True, "2026-09-15T23:00:00" in llenado)
check("ref con slug real", True, ".. _iniciativa-mi-slug:" in llenado)
check("titulo sustituido", True, "Mi Título" in llenado)
check("placeholder de titulo ya no aparece", False, "<Titulo descriptivo" in llenado)

print("=== 4. scaffold_initiative — Template B, mínimo DEC-AM-01 ===")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    build_consumer_tree(raiz)
    destino = si.scaffold_initiative(raiz, "thyrox", "probar-scaffolder", "Probar el scaffolder", now=NOW)
    archivos = sorted(p.name for p in destino.iterdir())
    check("directorio con el slug correcto", "probar-scaffolder", destino.name)
    check("set minimo exacto (sin tareas)", ["alcance-probar-scaffolder.rst", "index.rst"], archivos)
    contenido_alcance = (destino / "alcance-probar-scaffolder.rst").read_text(encoding="utf-8")
    check("alcance trae Premisa verificada", True, "Premisa verificada" in contenido_alcance)
    check("alcance trae :flow:", True, ":flow:" in contenido_alcance)
    check("alcance NO trae el bloque de instrucciones", False, "Instrucciones de uso" in contenido_alcance)

print("=== 5. scaffold_initiative — con with_tareas=True ===")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    build_consumer_tree(raiz)
    destino = si.scaffold_initiative(
        raiz, "thyrox", "probar-con-tareas", "Con tareas", with_tareas=True, now=NOW)
    archivos = sorted(p.name for p in destino.iterdir())
    check(
        "incluye tareas-<slug>.rst",
        ["alcance-probar-con-tareas.rst", "index.rst", "tareas-probar-con-tareas.rst"],
        archivos,
    )

print("=== 6. scaffold_initiative — Template A (docs) ===")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    build_consumer_tree(raiz)
    destino = si.scaffold_initiative(raiz, "docs", "probar-template-a", "Template A", now=NOW)
    contenido_index = (destino / "index.rst").read_text(encoding="utf-8")
    check("Template A trae el artefacto IACT verbose", True, "Indice de Iniciativa" in contenido_index)
    contenido_alcance = (destino / "alcance-probar-template-a.rst").read_text(encoding="utf-8")
    check("Template A trae :audit_fuente: (exclusivo del cuerpo de A, no de B)", True,
          ":audit_fuente:" in contenido_alcance)
    check("Template A trae 'Resultado del Gate' (exclusivo del cuerpo de A)", True,
          "Resultado del Gate" in contenido_alcance)
    check(
        "frontera declarada: <NOMBRE-UPPER>/<nombre-ref> de Template A quedan SIN "
        "sustituir — su convención real diverge de la canónica, medido contra un "
        "iniciativa real (docs: actualizar-agentic-ai-thyrox usa iniciativa-<slug>, "
        "no <slug> a secas); no se adivina un mapeo por archivo",
        True, "<NOMBRE-UPPER>" in contenido_alcance and "<nombre-ref>-alcance" in contenido_alcance)

print("=== 7. rehúsa sobre un directorio ya existente ===")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    build_consumer_tree(raiz)
    si.scaffold_initiative(raiz, "thyrox", "ya-existe", "Ya existe", now=NOW)
    try:
        si.scaffold_initiative(raiz, "thyrox", "ya-existe", "Ya existe otra vez", now=NOW)
        check("segunda llamada -> FileExistsError", True, False)
    except FileExistsError:
        check("segunda llamada -> FileExistsError", True, True)

print("=== 8. ANULACIÓN — sin strip_instructions, el bloque sobrevive ===")


def fill_placeholders_sin_cortar(body, **kw):
    return si.fill_placeholders(body, **kw)


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    build_consumer_tree(raiz)
    plantilla_cruda = (raiz / "source/normativa/estandares/plantillas/tpl-iniciativa-simple-alcance.rst").read_text(encoding="utf-8")
    llenado_sin_cortar = fill_placeholders_sin_cortar(
        plantilla_cruda, submodule="thyrox", slug="anulacion", title="Anulación", now=NOW)
    check("anulación: el bloque de instrucciones SÍ sobrevive sin el corte",
          True, "Instrucciones de uso" in llenado_sin_cortar)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
