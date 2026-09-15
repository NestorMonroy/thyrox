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

import pathlib
import re
from datetime import datetime, timezone

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
    if destino.exists():
        raise FileExistsError(f"la iniciativa ya existe: {destino}")
    destino.mkdir(parents=True)

    kind = template_kind(submodule)
    piezas = ["index", "alcance"] + (["tareas"] if with_tareas else [])
    for pieza in piezas:
        _write_piece(plantillas_dir, destino, kind, pieza,
                     submodule=submodule, slug=slug, title=title, now=momento)
    return destino
