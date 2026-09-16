"""QA visual post-build — "compilar limpio no es lo mismo que legible".

TASK-THYROX-0042. Generaliza ``tools/scripts/render_pdf_qa.py``
(``NestorMonroy/ai-course-notes@717e2df6``), adaptado al HTML que produce
Sphinx en vez del PDF que produce LaTeX. Cierra el hueco que
``docs-design-first-rup.md``/``test-execution-protocol.md`` dejan: ``make
html`` es opcional, y hoy no hay NINGÚN chequeo del HTML renderizado — ni
siquiera opcional.

Restricción explícita del ejecutor, en las dos direcciones: el reporte de
este módulo nunca contiene un emoji/icono (se cita por codepoint, no por
glifo), y el módulo detecta un emoji/icono en el artefacto que audita como
hallazgo — no basta con que el propio gate se abstenga de producirlos.

Este módulo no sabe construir el HTML ni recorrer un directorio: recibe un
``dict[ruta, html]`` que el llamador arma (glob sobre ``build/html/*.html``)
y responde sobre ESE contenido.
"""
from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass

#: Mínimo de caracteres visibles en el <body> para no contar como "casi vacío".
#: Punto de partida sin calibrar contra un corpus real — el llamador lo ajusta.
DEFAULT_MIN_CHARS = 40

_BODY = re.compile(r"<body[^>]*>(.*)</body>", re.S | re.I)
_SCRIPT_OR_STYLE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)
_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")

#: Emoji e iconos decorativos — mismo rango usado para auditar los propios
#: artefactos de esta iniciativa (banderas regionales incluidas).
_EMOJI_OR_ICON = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)


@dataclass
class PageFinding:
    """Un hallazgo sobre una página — sólo datos."""

    path: str
    kind: str
    detail: str


def visible_text(html: str) -> str:
    """El texto visible del ``<body>`` — sin script/style, sin etiquetas.

    Un ``<head>`` cargado de metadatos no cuenta como contenido: sólo el
    ``<body>`` es lo que un lector ve.
    """
    cuerpo = _BODY.search(html)
    if not cuerpo:
        return ""
    texto = _SCRIPT_OR_STYLE.sub(" ", cuerpo.group(1))
    texto = _TAG.sub(" ", texto)
    return _WHITESPACE.sub(" ", texto).strip()


def find_near_empty(
    pages: Mapping[str, str], *, min_chars: int = DEFAULT_MIN_CHARS,
) -> list[PageFinding]:
    """Las páginas cuyo ``<body>`` visible tiene menos de ``min_chars``.

    Citadas por RUTA — no un conteo agregado. Con ``min_chars=0`` el chequeo
    queda apagado (ninguna página puede tener menos de 0 caracteres).
    """
    hallazgos = []
    for ruta, html in pages.items():
        longitud = len(visible_text(html))
        if longitud < min_chars:
            hallazgos.append(PageFinding(
                path=ruta, kind="near_empty",
                detail=f"cuerpo visible de {longitud} caracteres (umbral {min_chars})"))
    return hallazgos


def find_emoji_or_icon(pages: Mapping[str, str]) -> list[PageFinding]:
    """Las páginas con un emoji/icono decorativo, citado por CODEPOINT, no por glifo."""
    hallazgos = []
    for ruta, html in pages.items():
        vistos: dict[str, None] = {}
        for m in _EMOJI_OR_ICON.finditer(html):
            vistos.setdefault(f"U+{ord(m.group(0)):04X}", None)
        if vistos:
            hallazgos.append(PageFinding(
                path=ruta, kind="emoji_or_icon",
                detail="carácter(es) fuera de la convención del proyecto: "
                       + ", ".join(vistos)))
    return hallazgos


def audit_pages(
    pages: Mapping[str, str], *, min_chars: int = DEFAULT_MIN_CHARS,
) -> list[PageFinding]:
    """Los dos chequeos combinados."""
    return find_near_empty(pages, min_chars=min_chars) + find_emoji_or_icon(pages)


def format_report(findings: list[PageFinding]) -> str:
    """Texto plano — la ruta y el detalle de cada hallazgo, sin ningún emoji."""
    return "\n".join(f"WARN {f.kind} {f.path}: {f.detail}" for f in findings)
