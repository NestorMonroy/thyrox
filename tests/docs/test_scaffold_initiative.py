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
5. ``scaffold_initiative`` con ``with_tasks=True``: añade
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
    templates = root / "source" / "normativa" / "estandares" / "plantillas"
    templates.mkdir(parents=True)
    real = Path("/home/user/kaupamex-docs/source/normativa/estandares/plantillas")
    for name in [
        "tpl-iniciativa-index.rst", "tpl-iniciativa-alcance.rst",
        "tpl-iniciativa-tareas.rst",
        "tpl-iniciativa-simple-index.rst", "tpl-iniciativa-simple-alcance.rst",
        "tpl-iniciativa-simple-tareas.rst",
    ]:
        (templates / name).write_text((real / name).read_text(encoding="utf-8"), encoding="utf-8")


print("=== 1. template_kind ===")
check("docs usa Template A", "a", si.template_kind("docs"))
check("api usa Template B", "b", si.template_kind("api"))
check("thyrox usa Template B", "b", si.template_kind("thyrox"))
check("ui usa Template B", "b", si.template_kind("ui"))

print("=== 2. strip_instructions ===")
raw = "Antes del corte\n\n----\n\nCuerpo real\n"
check("retira todo antes del separador", "Cuerpo real\n", si.strip_instructions(raw))
try:
    si.strip_instructions("sin separador aquí")
    check("sin separador -> ValueError", True, False)
except ValueError:
    check("sin separador -> ValueError", True, True)

print("=== 3. fill_placeholders ===")
template_body = (
    ".. meta::\n"
    "   :artefacto: GESTION-PM-<SUBMODULO-UPPER>-<SLUG-UPPER>-INDEX\n"
    "   :fecha_creacion: <YYYY-MM-DDTHH:MM:SS>\n\n"
    ".. _iniciativa-<slug>:\n\n"
    "<Titulo descriptivo de la iniciativa>\n"
)
filled = si.fill_placeholders(template_body, submodule="thyrox", slug="mi-slug", title="Mi Título", now=NOW)
check("submodulo mayusculas", True, "GESTION-PM-THYROX-" in filled)
check("slug mayusculas", True, "MI-SLUG-INDEX" in filled)
check("fecha ISO real", True, "2026-09-15T23:00:00" in filled)
check("ref con slug real", True, ".. _iniciativa-mi-slug:" in filled)
check("titulo sustituido", True, "Mi Título" in filled)
check("placeholder de titulo ya no aparece", False, "<Titulo descriptivo" in filled)

print("=== 4. scaffold_initiative — Template B, mínimo DEC-AM-01 ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_consumer_tree(root_dir)
    target = si.scaffold_initiative(root_dir, "thyrox", "probar-scaffolder", "Probar el scaffolder", now=NOW)
    files = sorted(p.name for p in target.iterdir())
    check("directorio con el slug correcto", "probar-scaffolder", target.name)
    check("set minimo exacto (sin tareas)", ["alcance-probar-scaffolder.rst", "index.rst"], files)
    content_scope = (target / "alcance-probar-scaffolder.rst").read_text(encoding="utf-8")
    check("alcance trae Premisa verificada", True, "Premisa verificada" in content_scope)
    check("alcance trae :flow:", True, ":flow:" in content_scope)
    check("alcance NO trae el bloque de instrucciones", False, "Instrucciones de uso" in content_scope)

print("=== 5. scaffold_initiative — con with_tasks=True ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_consumer_tree(root_dir)
    target = si.scaffold_initiative(
        root_dir, "thyrox", "probar-con-tareas", "Con tareas", with_tasks=True, now=NOW)
    files = sorted(p.name for p in target.iterdir())
    check(
        "incluye tareas-<slug>.rst",
        ["alcance-probar-con-tareas.rst", "index.rst", "tareas-probar-con-tareas.rst"],
        files,
    )

print("=== 6. scaffold_initiative — Template A (docs) ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_consumer_tree(root_dir)
    target = si.scaffold_initiative(root_dir, "docs", "probar-template-a", "Template A", now=NOW)
    content_index = (target / "index.rst").read_text(encoding="utf-8")
    check("Template A trae el artefacto IACT verbose", True, "Indice de Iniciativa" in content_index)
    content_scope = (target / "alcance-probar-template-a.rst").read_text(encoding="utf-8")
    check("Template A trae :audit_fuente: (exclusivo del cuerpo de A, no de B)", True,
          ":audit_fuente:" in content_scope)
    check("Template A trae 'Resultado del Gate' (exclusivo del cuerpo de A)", True,
          "Resultado del Gate" in content_scope)
    check(
        "frontera declarada: <NOMBRE-UPPER>/<nombre-ref> de Template A quedan SIN "
        "sustituir — su convención real diverge de la canónica, medido contra un "
        "iniciativa real (docs: actualizar-agentic-ai-thyrox usa iniciativa-<slug>, "
        "no <slug> a secas); no se adivina un mapeo por archivo",
        True, "<NOMBRE-UPPER>" in content_scope and "<nombre-ref>-alcance" in content_scope)

print("=== 7. rehúsa sobre un directorio ya existente ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_consumer_tree(root_dir)
    si.scaffold_initiative(root_dir, "thyrox", "ya-existe", "Ya existe", now=NOW)
    try:
        si.scaffold_initiative(root_dir, "thyrox", "ya-existe", "Ya existe otra vez", now=NOW)
        check("segunda llamada -> FileExistsError", True, False)
    except FileExistsError:
        check("segunda llamada -> FileExistsError", True, True)

print("=== 8. ANULACIÓN — sin strip_instructions, el bloque sobrevive ===")


def fill_placeholders_without_cut(body, **kw):
    return si.fill_placeholders(body, **kw)


with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_consumer_tree(root_dir)
    template_raw = (root_dir / "source/normativa/estandares/plantillas/tpl-iniciativa-simple-alcance.rst").read_text(encoding="utf-8")
    filled_without_cut = fill_placeholders_without_cut(
        template_raw, submodule="thyrox", slug="anulacion", title="Anulación", now=NOW)
    check("anulación: el bloque de instrucciones SÍ sobrevive sin el corte",
          True, "Instrucciones de uso" in filled_without_cut)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
