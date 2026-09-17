"""Scaffolder de iniciativas — materializa ``pm/<submodulo>/iniciativas/<slug>/``.

TASK-THYROX-0038. El hueco estaba confirmado por conducta, no por nombre: se
leyó completo cada candidato —``verify/check-artefactos-minimos.sh`` sólo
hace ``ls``; ``task/task_ids.py`` y ``hallazgo/hallazgo_ids.py`` sólo acuñan
IDs sobre filas ya existentes— y ninguno escribe un directorio de iniciativa.

Este módulo tampoco inventa el contenido de una iniciativa: lee las
plantillas del consumidor (DEC-04, vía ``reach.root``), retira el bloque de
instrucciones que no se copia al documento final, y sustituye sólo los
marcadores MECÁNICOS —fecha, slug, submódulo, mayúsculas, la ruta del
``:ref:``—. Los marcadores que exigen juicio humano —título real, "Premisa
verificada", "Qué entra"— quedan como ``<...>`` en el archivo escrito; el
scaffolder produce el ESQUELETO conforme a DEC-AM-01, no la iniciativa.

## Frontera declarada: Template A tiene un marcador sin resolver

``<NOMBRE-UPPER>`` y ``<nombre-ref>`` sólo existen en Template A. Se midieron
contra una iniciativa real (``pm/docs/iniciativas/actualizar-agentic-ai-thyrox``,
``.. _iniciativa-actualizar-agentic-ai-thyrox:``) y la convención real —
``iniciativa-<slug>`` para el índice, ``alcance-<slug>`` para el alcance— NO
coincide con lo que ``<nombre-ref>`` produciría literalmente (``<slug>`` a
secas, y ``<slug>-alcance`` con el sufijo invertido). El canon de Template A
diverge de la práctica real, y corregir el canon no es el trabajo de este
módulo. Por eso ``fill_placeholders`` NO sustituye estos dos marcadores —
quedan literales en el archivo, igual que "Premisa verificada" o "Qué entra":
frontera declarada, no bug escondido.

## Dos plantillas, no una

``auto-audit-before-writing.md`` distingue Template A (IACT verbose, sólo
``docs``) de Template B (THYROX simple, el resto). Sólo Template A tenía
archivo canónico (``tpl-iniciativa-{index,alcance,tareas,progreso}.rst``);
Template B se nombraba en prosa desde 2026-05-21 sin que ningún archivo la
respaldara — cada iniciativa Template B se reconstruía a mano por
precedente. Los tres archivos ``tpl-iniciativa-simple-*.rst`` cierran ese
hueco en el mismo pase que este módulo, porque sin ellos no había qué leer.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from docs import initiative_placement as ip  # noqa: E402
from paths import reach  # noqa: E402

#: Codigos de salida del guion, alineados con los de ``bounded_scan``.
EXIT_OK = 0
EXIT_REFUSED = 2

#: Único submódulo que usa Template A (IACT verbose). El resto usa Template B.
TEMPLATE_A_SUBMODULES = frozenset({"docs"})

#: Nombre de archivo de plantilla, por (kind, pieza).
TEMPLATE_FILES = {
    "a": {"index": "tpl-iniciativa-index.rst",
          "alcance": "tpl-iniciativa-alcance.rst",
          "tareas": "tpl-iniciativa-tareas.rst"},
    "b": {"index": "tpl-iniciativa-simple-index.rst",
          "alcance": "tpl-iniciativa-simple-alcance.rst",
          "tareas": "tpl-iniciativa-simple-tareas.rst"},
}

#: Nombre de archivo final, por pieza. ``index`` no lleva el slug en el nombre.
OUTPUT_FILE_NAMES = {
    "index": "index.rst",
    "alcance": "alcance-{slug}.rst",
    "tareas": "tareas-{slug}.rst",
}

_SEPARATOR = "\n----\n"


def template_kind(submodule: str) -> str:
    """``"a"`` para el submódulo que usa el template IACT verbose; ``"b"`` para el resto."""
    return "a" if submodule in TEMPLATE_A_SUBMODULES else "b"


def strip_instructions(template_text: str) -> str:
    """Retira el bloque ``.. admonition:: Instrucciones de uso``.

    Las siete plantillas comparten la misma forma: instrucciones para quien
    copia, un separador ``----`` de línea propia, y el cuerpo real. Sin este
    corte, el documento final nacería con las instrucciones de la plantilla
    pegadas dentro — el defecto que esta función existe para impedir.
    """
    idx = template_text.find(_SEPARATOR)
    if idx == -1:
        raise ValueError(
            "plantilla sin separador '----': no se puede distinguir "
            "instrucciones de cuerpo")
    return template_text[idx + len(_SEPARATOR):].lstrip("\n")


def fill_placeholders(
    body: str, *, submodule: str, slug: str, title: str, now: datetime,
) -> str:
    """Sustituye sólo los marcadores mecánicos; deja los de juicio humano intactos.

    Mecánicos: fecha, slug, submódulo (llano y en mayúsculas), la ruta del
    ``:ref:``. NO se intenta deducir un ``<SLUG-UPPER>`` "bonito" que omita
    un sufijo de submódulo redundante (p. ej. ``-thyrox``) — eso exigiría
    una heurística que adivina, y adivinar es exactamente lo que este módulo
    evita. El resultado puede verse redundante; sigue siendo correcto y
    editable a mano después.
    """
    sustituciones = {
        "<YYYY-MM-DDTHH:MM:SS>": now.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", ""),
        "<SUBMODULO-UPPER>": submodule.upper(),
        "<SLUG-UPPER>": slug.upper(),
        "<submodulo>": submodule,
        "<slug>": slug,
        "<Titulo descriptivo de la iniciativa>": title,
        "<Titulo de la iniciativa>": title,
    }
    resultado = body
    for marcador, valor in sustituciones.items():
        resultado = resultado.replace(marcador, valor)
    return resultado


def _write_piece(
    plantillas_dir: pathlib.Path, destino: pathlib.Path, kind: str, pieza: str,
    *, submodule: str, slug: str, title: str, now: datetime,
) -> None:
    ruta_plantilla = plantillas_dir / TEMPLATE_FILES[kind][pieza]
    cruda = ruta_plantilla.read_text(encoding="utf-8")
    cuerpo = strip_instructions(cruda)
    llenado = fill_placeholders(cuerpo, submodule=submodule, slug=slug, title=title, now=now)
    nombre = OUTPUT_FILE_NAMES[pieza].format(slug=slug)
    (destino / nombre).write_text(llenado, encoding="utf-8")


def scaffold_initiative(
    consumer_root: pathlib.Path,
    submodule: str,
    slug: str,
    title: str,
    *,
    with_tareas: bool = False,
    now: datetime | None = None,
) -> pathlib.Path:
    """Materializa ``pm/<submodulo>/iniciativas/<slug>/`` y devuelve su ruta.

    Set mínimo por defecto (DEC-AM-01, iniciativa recién nacida en
    ``en-definicion``): ``index.rst`` + ``alcance-<slug>.rst``. ``progreso``
    no se materializa —sólo es obligatorio en ``en-ejecucion``, que una
    iniciativa recién creada no es—. ``tareas`` es condicional a que el
    llamador declare que ya hay tareas que registrar (``with_tareas``).

    Rehúsa si el directorio ya existe: no pisa trabajo ajeno en silencio.
    """
    momento = now or datetime.now(timezone.utc)
    plantillas_dir = pathlib.Path(consumer_root) / "source" / "normativa" / "estandares" / "plantillas"
    destino = (pathlib.Path(consumer_root) / "source" / "gestion" / "pm"
               / submodule / "iniciativas" / slug)

    veredicto = _placement_verdict(consumer_root, submodule, slug)
    if veredicto.verdict == ip.IN_PLACE:
        raise FileExistsError(f"la iniciativa ya existe: {destino}")
    destino.mkdir(parents=True)

    kind = template_kind(submodule)
    piezas = ["index", "alcance"] + (["tareas"] if with_tareas else [])
    for pieza in piezas:
        _write_piece(plantillas_dir, destino, kind, pieza,
                     submodule=submodule, slug=slug, title=title, now=momento)

    if veredicto.verdict == ip.ELSEWHERE:
        _append_extension_note(destino, veredicto)
    return destino


def _append_extension_note(destino: pathlib.Path, veredicto) -> None:
    """Apenda al ``index`` la mencion de la raiz de la que se extiende.

    Va en el ``index`` y no en el ``alcance`` porque el ``index`` es el unico
    artefacto que DEC-AM-01 exige siempre: una iniciativa recien nacida puede
    no tener alcance todavia, y la mencion no puede depender de eso.
    """
    indice = destino / OUTPUT_FILE_NAMES["index"]
    with indice.open("a", encoding="utf-8") as manija:
        manija.write("\n" + ip.extension_note(veredicto))


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada. ``generate_bin`` lo descubre por el guard ``__main__``."""
    parser = argparse.ArgumentParser(
        description="Materializa pm/<submodulo>/iniciativas/<slug>/ tras verificar "
                    "que el slug no existe en NINGUNA raiz de source/gestion/.")
    parser.add_argument("submodule", help="la raiz de trabajo: api|db|docs|server|ui|thyrox")
    parser.add_argument("slug", help="el slug kebab-case, estable (I-004)")
    parser.add_argument("title", help="el titulo descriptivo de la iniciativa")
    parser.add_argument("--with-tareas", action="store_true",
                        help="ademas del set minimo, materializa tareas-<slug>.rst")
    parser.add_argument("--consumer", default=None,
                        help="raiz del clon consumidor (por defecto, la que reach resuelva)")
    args = parser.parse_args(argv)

    raiz = pathlib.Path(args.consumer) if args.consumer else reach.consumer_root()
    try:
        destino = scaffold_initiative(
            raiz, args.submodule, args.slug, args.title, with_tareas=args.with_tareas)
    except ip.SurveyTruncatedError as corte:
        print(f"REHUSA: {corte}", file=sys.stderr)
        return EXIT_REFUSED
    except FileExistsError as existe:
        print(f"REHUSA: {existe}", file=sys.stderr)
        return EXIT_REFUSED

    print(destino)
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())


def _placement_verdict(consumer_root, submodule: str, slug: str):
    """El veredicto de ubicacion, con el arbol sin ``source/gestion/`` declarado.

    Un consumidor sin ``source/gestion/`` no es una ceguera del instrumento:
    es un arbol que no contiene NINGUNA iniciativa, asi que la ausencia es
    cierta. Se distingue del recorrido truncado —que SI es ceguera y por eso
    sube como excepcion— porque colapsarlos devolveria el defecto que
    ``initiative_placement`` existe para cerrar.
    """
    try:
        survey = ip.survey_initiative(consumer_root, slug)
    except ip.GestionRootError:
        survey = ip.SurveyResult(slug=slug, hits=(), truncated=False)
    return ip.decide_placement(survey, submodule)
