#!/usr/bin/env python3
"""Suite de ``docs/initiative_placement.py`` — ¿la iniciativa ya existe, y dónde?

Origen: directiva del ejecutor — *«se valide que esta no existe, pero el que
no existe, ahora no solo depende del lugar del dominio … si no te vas a
preguntar que la iniciativa no exista en todo ``source/gestion/**``»*.

El hueco estaba confirmado por conducta, no por nombre: ``scaffold_initiative``
comprueba la existencia con un solo ``destino.exists()``
(``scaffold_initiative.py:152``), o sea **únicamente el lugar del dominio**.
Una iniciativa alojada bajo otra raíz es invisible para esa comprobación, y el
scaffolder crea un duplicado sin decirlo.

El control positivo NO es fabricado: ``construir-harness-propio`` vivió en
``pm/docs/iniciativas/`` y su entregable es el proveedor, así que su hogar era
``pm/thyrox/`` — se movió con ``git mv`` a mano, que es exactamente el trabajo
que este módulo mecaniza. El árbol sintético reproduce esa forma.

Lo que la suite mide, y por qué cada bloque existe:

1. ``survey_initiative`` sobre un árbol SIN la iniciativa: cero hallazgos y
   recorrido completo. Es el caso que autoriza a crear.
2. ``survey_initiative`` con la iniciativa en su lugar canónico: un hallazgo,
   con la raíz derivada de la ruta.
3. ``survey_initiative`` con la iniciativa FUERA de ``pm/<raiz>/iniciativas/``
   —bajo otra rama de ``source/gestion/``—: la encuentra igual, y declara que
   no pudo derivarle raíz. Es el eje que un ``destino.exists()`` no tiene.
4. ``decide_placement`` da los tres desenlaces: ABSENT · IN_PLACE · ELSEWHERE.
5. **Un recorrido TRUNCADO no es ABSENT.** Si la cota de ``bounded_scan``
   muerde, el veredicto se rehúsa con ``SurveyTruncatedError`` en vez de
   publicar «no existe». Sin este caso, un árbol grande produciría un
   duplicado con la bendición del instrumento — sub-patrón D de
   ``metrica-decide-la-conclusion.md`` con el propio mecanismo de sujeto.
6. ``extension_note`` cita la raíz de origen con un ``:doc:``, para que
   ``check_doc_citations`` la verifique sin instrumento nuevo.
7. ANULACIÓN: restringido el recorrido al lugar del dominio —que es la
   conducta de hoy— tienen que caer **exactamente** los casos de ELSEWHERE,
   ninguno de ABSENT ni de IN_PLACE.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from docs import initiative_placement as ip  # noqa: E402

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


def place_initiative(root: Path, relative: str, slug: str) -> Path:
    """Siembra un directorio de iniciativa con su ``index.rst`` obligatorio."""
    target = root / relative / slug
    target.mkdir(parents=True)
    (target / "index.rst").write_text(f".. _iniciativa-{slug}:\n", encoding="utf-8")
    return target


def build_management_tree(root: Path) -> None:
    """El esqueleto mínimo de ``source/gestion/`` con sus seis raíces."""
    for root_dir in ("api", "db", "docs", "server", "ui", "thyrox"):
        (root / "source" / "gestion" / "pm" / root_dir / "iniciativas").mkdir(parents=True)
    (root / "source" / "gestion" / "decisiones").mkdir(parents=True)


print("=== 1. survey_initiative — el árbol no la tiene ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    survey = ip.survey_initiative(root_dir, "construir-harness-propio")
    check("cero hallazgos", 0, len(survey.hits))
    check("recorrido completo", False, survey.truncated)

print("=== 2. survey_initiative — está en su lugar canónico ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    place_initiative(root_dir, "source/gestion/pm/thyrox/iniciativas", "construir-harness-propio")
    survey = ip.survey_initiative(root_dir, "construir-harness-propio")
    check("un hallazgo", 1, len(survey.hits))
    check("raíz derivada de la ruta", "thyrox", survey.hits[0].submodule)

print("=== 3. survey_initiative — FUERA de pm/<raiz>/iniciativas/ ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    place_initiative(root_dir, "source/gestion/decisiones", "construir-harness-propio")
    survey = ip.survey_initiative(root_dir, "construir-harness-propio")
    check("la encuentra fuera del lugar canónico", 1, len(survey.hits))
    check("declara que no pudo derivar raíz", None, survey.hits[0].submodule)

print("=== 4. decide_placement — los tres desenlaces ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    empty = ip.survey_initiative(root_dir, "construir-harness-propio")
    check("sin hallazgos -> ABSENT", ip.ABSENT,
          ip.decide_placement(empty, "thyrox").verdict)

    place_initiative(root_dir, "source/gestion/pm/docs/iniciativas", "construir-harness-propio")
    found = ip.survey_initiative(root_dir, "construir-harness-propio")
    check("en la raíz pedida -> IN_PLACE", ip.IN_PLACE,
          ip.decide_placement(found, "docs").verdict)
    verdict = ip.decide_placement(found, "thyrox")
    check("en OTRA raíz -> ELSEWHERE", ip.ELSEWHERE, verdict.verdict)
    check("nombra la raíz de origen", "docs", verdict.extends_from)

print("=== 5. un recorrido TRUNCADO no es ABSENT ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    truncated = ip.survey_initiative(root_dir, "construir-harness-propio", max_entries=1)
    check("el recorrido se declara truncado", True, truncated.truncated)
    try:
        ip.decide_placement(truncated, "thyrox")
        check("truncado -> SurveyTruncatedError", True, False)
    except ip.SurveyTruncatedError:
        check("truncado -> SurveyTruncatedError", True, True)

print("=== 6. extension_note — cita la raíz de origen con :doc: ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    place_initiative(root_dir, "source/gestion/pm/docs/iniciativas", "construir-harness-propio")
    found = ip.survey_initiative(root_dir, "construir-harness-propio")
    note = ip.extension_note(ip.decide_placement(found, "thyrox"))
    check("nombra la raíz de origen", True, "pm/docs" in note)
    check("lleva una cita :doc: verificable", True, ":doc:" in note)
    check("nombra el slug", True, "construir-harness-propio" in note)

print("=== 7. ANULACIÓN — acotado al lugar del dominio, ELSEWHERE deja de verse ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    place_initiative(root_dir, "source/gestion/pm/docs/iniciativas", "construir-harness-propio")
    # La conducta de HOY: mirar sólo pm/<intended>/iniciativas/<slug>.
    only_domain = (root_dir / "source/gestion/pm/thyrox/iniciativas/construir-harness-propio").exists()
    check("anulación: el lugar del dominio NO la ve (y por eso duplicaría)",
          False, only_domain)
    complete = ip.decide_placement(
        ip.survey_initiative(root_dir, "construir-harness-propio"), "thyrox")
    check("anulación: el recorrido completo SÍ la ve", ip.ELSEWHERE, complete.verdict)

print("=== 8. INTEGRACIÓN — scaffold_initiative escribe la mención en ELSEWHERE ===")
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from docs import scaffold_initiative as si  # noqa: E402

REAL = Path("/home/user/kaupamex-docs/source/normativa/estandares/plantillas")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    templates = root_dir / "source" / "normativa" / "estandares" / "plantillas"
    templates.mkdir(parents=True)
    for name in ("tpl-iniciativa-simple-index.rst", "tpl-iniciativa-simple-alcance.rst"):
        (templates / name).write_text((REAL / name).read_text(encoding="utf-8"),
                                         encoding="utf-8")
    place_initiative(root_dir, "source/gestion/pm/docs/iniciativas", "construir-harness-propio")

    target = si.scaffold_initiative(root_dir, "thyrox", "construir-harness-propio",
                                     "Construir el harness propio")
    index = (target / "index.rst").read_text(encoding="utf-8")
    check("crea en la raíz pedida", True, target.parts[-3] == "thyrox")
    check("el index lleva la mención de extensión", True, "Se extiende de otra raíz" in index)
    check("la mención nombra la raíz de origen", True, "pm/docs" in index)
    check("la mención es una cita :doc: verificable", True,
          ":doc:`/gestion/pm/docs/iniciativas/construir-harness-propio/index`" in index)

    # Y la iniciativa de origen NO se toca: su evidencia fechada no se reescribe.
    source = root_dir / "source/gestion/pm/docs/iniciativas/construir-harness-propio/index.rst"
    check("la de origen queda intacta", ".. _iniciativa-construir-harness-propio:\n",
          source.read_text(encoding="utf-8"))

print("=== 9. INTEGRACIÓN — IN_PLACE sigue rehusando (no pisa trabajo ajeno) ===")
with tempfile.TemporaryDirectory() as tmp:
    root_dir = Path(tmp)
    build_management_tree(root_dir)
    place_initiative(root_dir, "source/gestion/pm/thyrox/iniciativas", "construir-harness-propio")
    try:
        si.scaffold_initiative(root_dir, "thyrox", "construir-harness-propio", "T")
        check("IN_PLACE -> FileExistsError", True, False)
    except FileExistsError:
        check("IN_PLACE -> FileExistsError", True, True)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
