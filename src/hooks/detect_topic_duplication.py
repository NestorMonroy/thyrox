"""Detector PreToolUse: un hallazgo nuevo puede que ya viva en OTRA raíz de ``pm/``.

Origen: episodio real, no hipotético. ``H-DOCS-1266`` se publicó bajo
``pm/docs/iniciativas/actualizar-agentic-ai-thyrox/`` sin haber buscado en
``pm/thyrox/``, que llevaba dos días con la misma corrección —
``THYROX_WORKBENCH_DIR``/``THYROX_JOBS_DIR``— documentada en una iniciativa
abierta (``verificar-hogares-de-sesion-thyrox``, ``H-THYROX-01``/``02``).
Costó ``git mv``, un renombre de ID, dos commits de reubicación y una entrada
de bitácora — trabajo que la búsqueda, hecha ANTES de escribir, habría
evitado. Registrado como lección L-032
(``kaupamex-docs: source/gestion/pm/thyrox/lecciones-aprendidas/
claim-tratado-como-observation-en-una-sesion-de-documentacion-2026-09-13.rst``),
cuyo "cierra cuando" nombra exactamente este gate.

Qué mide, y por qué NO son los títulos
----------------------------------------

La primera forma que se midió —comparar el título del hallazgo nuevo contra
los títulos de los demás, por palabras compartidas— **no habría disparado en
el episodio real**: ``H-THYROX-01``, ``02`` y ``03`` tienen títulos sin una
sola palabra en común (medido). El solapamiento real estaba en el
**contenido**, y específicamente en los **identificadores** que ambos
citaban — ``THYROX_WORKBENCH_DIR`` no vive en ningún título, vive en el
cuerpo de la iniciativa (``alcance-``, ``index.rst``, ``progreso-``).

Por eso el ancla es un IDENTIFICADOR CON GUION BAJO —
``[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+``—, no una palabra suelta. Medido contra el
propio ``H-THYROX-03`` sobre el corpus real (``source/gestion/pm``, 4093
``.rst``): de los tokens en mayúscula de 5+ caracteres, los que llevan guion
bajo son exactamente los identificadores reales (``THYROX_WORKBENCH_DIR``,
``THYROX_ROOT``…) y los que NO lo llevan son la jerga del repo que aparece en
cientos de archivos y no discrimina nada (``MEDIA`` 1060, ``RESUELTO`` 1178,
``CLAUDE`` 257, ``README`` 195, ``PROVIDER`` 7, ``LITERAL`` 7). El filtro de
guion bajo separa las dos poblaciones sin necesitar una lista de palabras
prohibidas.

El tope de frecuencia — igual de necesario, medido por separado
--------------------------------------------------------------------

Incluso filtrado a identificadores con guion bajo, uno puede ser ubicuo sin
ser una duplicación: ``THYROX_ROOT`` aparece en 15 archivos fuera de la
propia iniciativa del caso real, y es un concepto transversal, no un tema
repetido. Los identificadores que SÍ señalaban la duplicación real —
``THYROX_WORKBENCH_DIR`` (2), ``THYROX_JOBS_DIR`` (1), ``THYROX_LIB_REACH``
(1), ``THYROX_LOCATOR`` (1)— están todos en ≤4. ``FREQUENCY_CAP`` separa las
dos poblaciones en el único caso real medido; no está probado sobre un
segundo caso.

Costo medido antes de proponerlo
------------------------------------

``pathlib.glob`` + ``read_text`` de los 4093 ``.rst`` bajo ``pm/``, con los
13 tokens candidatos del caso real comprobados en una sola pasada por
archivo: **0.105 s**. Mismo patrón que ya usa
``verify.check_hallazgo_submodulo`` (``RAIZ_PM.glob(...)``) — no
``subprocess``+``grep``, que sería una segunda convención de recorrido en el
mismo árbol.

Qué NO hace
-------------

No busca en el resto del multi-repo (``pm/{db,server,ui}`` fuera de este
patrón ya están cubiertos porque ``RAIZ_PM`` los incluye a todos). No mide
similitud semántica — dos hallazgos sobre el mismo tema con identificadores
distintos no se detectan. Es un aviso, no un veredicto: el juicio de si de
verdad duplica queda en quien lo recibe.
"""
from __future__ import annotations

import pathlib
import re


from verify.check_hallazgo_submodulo import RAIZ_PM  # noqa: E402

#: El mismo ancla que ``detect_finding_layer`` — capa, iniciativa, prefijo —
#: reusada en vez de recompuesta: dos copias de la misma ruta es la segunda
#: fuente de verdad que ``calibration-verified-numbers.md`` prohíbe.
from hooks.detect_finding_layer import PATTERN  # noqa: E402

#: Un identificador con guion bajo — ``THYROX_WORKBENCH_DIR``, no ``MEDIA``.
#: El filtro que separa jerga del repo (sin guion bajo, ubicua) de un
#: identificador real (con guion bajo, raro), medido arriba.
TOKEN = re.compile(r"[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+")

#: Por encima de este número de archivos fuera de la propia iniciativa, un
#: token se trata como concepto transversal, no como señal de duplicación.
#: Calibrado contra el único caso real medido (ver docstring del módulo);
#: no probado sobre un segundo caso.
FREQUENCY_CAP = 5

#: Cuántos tokens se reportan como máximo, para no saturar el presupuesto de
#: caracteres que ``pretooluse_dispatch`` reparte entre los ocho detectores.
MAX_TOKENS_REPORTED = 5


def _candidate_tokens(text: str) -> list[str]:
    """Los identificadores con guion bajo del texto, sin duplicados, en orden de aparición."""
    seen: dict[str, None] = {}
    for m in TOKEN.finditer(text):
        seen.setdefault(m.group(0), None)
    return list(seen)


def find_duplicates(
    tokens: list[str],
    root: pathlib.Path,
    exclude_dir_name: str,
) -> dict[str, list[str]]:
    """Para cada token, los ``.rst`` bajo ``root`` que lo contienen fuera de
    ``exclude_dir_name``, acotado a ``FREQUENCY_CAP``.

    Función separada de ``detect`` para que la suite la ejercite con un árbol
    sintético sin depender del cwd real — el mismo motivo por el que
    ``resolve_home`` en ``paths/reach.py`` recibe su raíz como argumento.
    """
    if not tokens:
        return {}
    hits: dict[str, list[str]] = {}
    for rst in root.glob("*/iniciativas/*/**/*.rst"):
        if exclude_dir_name in rst.parts:
            continue
        try:
            contenido = rst.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for tok in tokens:
            if tok in contenido:
                hits.setdefault(tok, []).append(str(rst))
    return {tok: files for tok, files in hits.items() if len(files) <= FREQUENCY_CAP}


def detect(payload: dict) -> str | None:
    """El aviso si el hallazgo nuevo comparte identificadores con otra iniciativa, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    content = tool_input.get("content")
    if not isinstance(content, str) or not content.strip():
        return None  # Edit no trae ``content`` -- este gate sólo mira archivos NUEVOS.

    path = str(tool_input.get("file_path") or "").replace("\\", "/")
    m = PATTERN.search(path)
    if not m:
        return None

    tokens = _candidate_tokens(content)[:40]  # tope defensivo, no medido a proposito de romperlo
    if not tokens:
        return None

    hits = find_duplicates(tokens, RAIZ_PM, exclude_dir_name=m.group("slug"))
    if not hits:
        return None

    ordenados = sorted(hits.items(), key=lambda kv: len(kv[1]))[:MAX_TOKENS_REPORTED]
    lineas = [
        f"- `{tok}` también en: " + ", ".join(f"`{f}`" for f in files)
        for tok, files in ordenados
    ]
    return (
        "GATE DE POSIBLE DUPLICACIÓN — este hallazgo comparte identificador(es) "
        "con archivos de OTRA iniciativa de `pm/`:\n\n"
        + "\n".join(lineas)
        + "\n\nAntes de publicar: leer esos archivos y confirmar si el tema ya "
          "está cubierto (y este hallazgo cruza con `:ref:` en vez de "
          "duplicar) o si es genuinamente distinto. Episodio real que origina "
          "este gate: `H-THYROX-03`, publicado sin esta búsqueda — costó "
          "`git mv`, renombre de ID y dos commits de reubicación."
    )
