"""Noveno detector de ``pretooluse_dispatch.py`` — continuidad narrativa entre secciones.

TASK-THYROX-0041. Generaliza ``weak_section_openers()``
(``NestorMonroy/ai-course-notes@717e2df6``, ``tools/scripts/
check_note_coverage.py``) — con una corrección de diseño, no una copia.

## Por qué NO es un léxico de palabras-puente

La referencia marca una sección débil si su apertura no contiene una
palabra-puente (本节/因此/回到/为了…). Medido cruzando
``kaist-cs492d/lecture01.tex`` contra su ``.en.srt``: el profesor dice, fuera
de guion, *"everything here is basically all about the statistics"*, y ese
encuadre SÍ aterriza en el ``.tex`` (``\\begin{importantbox}{生成模型的统计视角}``)
sin ningún marcador de "voz del profesor". Un contador de etiqueta reporta
0 aunque el traspaso de contenido ocurrió — es el sub-patrón A/C de
``metrica-decide-la-conclusion.md``: medir el significante y concluir sobre
el significado.

Este detector verifica contra la FUENTE en vez de contra un léxico: los
términos citados entre backticks dobles (```` `` ````, la convención RST
para nombrar un símbolo o concepto preciso) de la sección anterior SON su
manifiesto de nodos (TASK-THYROX-0039, aplicado a un solo archivo). Una
apertura que referencia al menos uno de esos términos tiene continuidad
real, tenga o no una palabra de transición clásica.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

#: La longitud, en caracteres, de la ventana de "apertura" de una sección.
OPENING_WINDOW = 400

_HEADING_UNDERLINE = re.compile(r"^[=\-^~\"]{3,}$")
_TERM = re.compile(r"``([^`]+)``")


@dataclass
class Section:
    """Una sección del artefacto — título, cuerpo, línea de arranque."""

    title: str
    body: str
    start_line: int


def distinctive_terms(body: str) -> set[str]:
    """Los términos citados entre backticks dobles — el vocabulario preciso del cuerpo."""
    return set(_TERM.findall(body))


def opens_with_continuity(section: Section, previous: Section, *, window: int = OPENING_WINDOW) -> bool:
    """¿La apertura de ``section`` referencia al menos un término distintivo de ``previous``?"""
    apertura = section.body[:window]
    terminos = distinctive_terms(previous.body)
    return any(t in apertura for t in terminos)


def weak_openers(sections: list[Section], *, window: int = OPENING_WINDOW) -> list[Section]:
    """Las secciones (salvo la primera) cuya apertura no referencia la anterior."""
    return [
        seccion for indice, seccion in enumerate(sections)
        if indice > 0 and not opens_with_continuity(seccion, sections[indice - 1], window=window)
    ]


def split_sections(text: str) -> list[Section]:
    """Parte ``text`` en secciones por encabezado RST real (título + subrayado)."""
    lineas = text.splitlines()
    encabezados: list[tuple[int, str]] = []
    for indice in range(len(lineas) - 1):
        titulo, subrayado = lineas[indice], lineas[indice + 1]
        if not titulo.strip() or titulo.strip().startswith("."):
            continue
        if _HEADING_UNDERLINE.match(subrayado) and len(subrayado.rstrip()) >= len(titulo.rstrip()):
            encabezados.append((indice, titulo.strip()))

    secciones: list[Section] = []
    for posicion, (linea_inicio, titulo) in enumerate(encabezados):
        cuerpo_desde = linea_inicio + 2
        cuerpo_hasta = encabezados[posicion + 1][0] if posicion + 1 < len(encabezados) else len(lineas)
        cuerpo = "\n".join(lineas[cuerpo_desde:cuerpo_hasta])
        secciones.append(Section(title=titulo, body=cuerpo, start_line=linea_inicio + 1))
    return secciones


def detect(payload: dict) -> str | None:
    """El aviso si el artefacto RST tiene una sección que abre sin continuidad real, o ``None``."""
    tool_input = payload.get("tool_input") or {}
    content = tool_input.get("content")
    if not isinstance(content, str) or not content.strip():
        return None  # Edit no trae `content` — este gate sólo mira archivos nuevos completos.

    path = str(tool_input.get("file_path") or "")
    if not path.endswith(".rst"):
        return None

    secciones = split_sections(content)
    if len(secciones) < 2:
        return None

    debiles = weak_openers(secciones)
    if not debiles:
        return None

    titulos = ", ".join(f"`{s.title}`" for s in debiles)
    return (
        "AVISO DE CONTINUIDAD NARRATIVA — la apertura de estas secciones no "
        f"referencia ningún término citado (```` `` ````) de la sección anterior: "
        f"{titulos}. No es un léxico de palabras-puente: se verifica contra el "
        "contenido real. Si la transición existe con otras palabras, este aviso "
        "es un falso positivo — juicio de quien escribe, no bloqueo."
    )
