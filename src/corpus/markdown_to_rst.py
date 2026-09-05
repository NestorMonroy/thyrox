#!/usr/bin/env python3
"""Convierte un capítulo markdown a RST publicable en ``source/``.

Existe porque ``source/`` sólo acepta ``.rst`` y **la dirección
markdown → RST no tiene salida en el stack instalado**. Sin instrumento, la
única alternativa era transcribir a mano — y una transcripción manual de un
capítulo de medio millar de líneas no es reproducible ni auditable.

Por qué docutils no lo hace, aunque esté instalado
===================================================

El árbol sí trae ``docutils`` (0.23 en el intérprete del sistema, 0.21.2 en
el ``.venv``) y ``sphinx`` 8.2.3. Lo que falta no es el paquete: es **la
mitad de escritura**. Medido en este contenedor, con un control positivo que
prueba que la sonda sabe acertar::

    get_writer_class('rst')             -> ImportError
    get_writer_class('restructuredtext')-> ImportError
    get_writer_class('markdown')        -> ImportError
    get_writer_class('html5')           -> OK          # el control positivo

No es una omisión del entorno: ``docutils/writers/`` declara html4css1,
html5_polyglot, latex2e, manpage, odf_odt, pep_html, s5_html, xetex,
docutils_xml, pseudoxml y null — **ninguno escribe RST**. Sus once
ejecutables lo dicen igual de claro: ``rst2html``, ``rst2latex``,
``rst2man``, ``rst2odt``, ``rst2xml``… RST es siempre la **entrada**, nunca
la salida. Un ``*2rst`` no existe.

Y la mitad de lectura tampoco está: ``parsers/commonmark_wrapper.py`` es un
selector, no un parser — delega en ``pycmark``, ``myst`` o ``recommonmark``,
y las tres están ausentes tanto del intérprete del sistema como del
``.venv``. Pedirlo levanta ``ImportError: Parsing "CommonMark" requires one
of the packages ('pycmark', 'myst', 'recommonmark')``.

Esto **no** reabre la tarea #363, que prohíbe validar RST con docutils
pelado: aquélla habla de un docutils que no conoce las directivas de Sphinx;
ésta, de una dirección de conversión que docutils no implementa. Son
capacidades distintas.

.. note::

   La redacción anterior decía *"este árbol no tiene conversor: ni
   ``pandoc`` ni ``m2r2`` están instalados"*. Las dos cifras eran correctas
   y la conclusión no se seguía de ellas — se midió la ausencia de dos
   literales y se concluyó sobre el espacio entero de capacidades, que es
   el sub-patrón **C** de ``metrica-decide-la-conclusion.md``. El veredicto
   sobrevivió la corrección; su justificación no. Ver :ref:`h-docs-257`.

Alcance declarado
=================

Cubre los constructos que un capítulo de prosa técnica usa de verdad:
encabezados, cercas de código, tablas de tubería, listas, citas, enlaces y
markup en línea. **No** es un conversor markdown general: no hay listas
anidadas, ni imágenes, ni HTML embebido, ni notas al pie. Si el fuente los
trae, el conversor los deja pasar como texto plano — no los inventa.

Dos decisiones que valen la pena declarar:

- **El markup anidado se aplana.** RST no admite ``**texto con ``código``**``
  — no hay anidamiento de markup en línea. Un ``**bold con `code`**`` del
  fuente sale como ``**bold con code**``: se conserva el énfasis y se pierde
  el literal interno. Es la pérdida mínima que produce RST válido.
- **La regla horizontal se descarta.** El ``---`` de markdown separa
  secciones que en RST ya separa el encabezado; una transición RST suelta
  antes de un título es un error de sintaxis.

Uso
===

    python3 .claude/scripts/corpus/markdown_to_rst.py <entrada.md> [--salida <x.rst>]

Sin ``--salida`` escribe a la salida estándar.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

# Nivel de encabezado -> carácter de subrayado. El título del documento lleva
# sobrelínea y sublínea; los demás sólo sublínea, que en RST son estilos
# distintos y por tanto niveles distintos.
UNDERLINE = {1: "=", 2: "=", 3: "-", 4: "~", 5: "^", 6: '"'}

# Lenguajes que Pygments reconoce y que este corpus usa. Cualquier otro cae a
# `text` — un lexer inexistente convierte el build en un warning por bloque.
KNOWN_LANGUAGES = {
    "python", "typescript", "javascript", "json", "bash", "shell", "sh",
    "diff", "rst", "yaml", "sql", "html", "css", "text",
}

PLACEHOLDER = "\x00CODE{}\x00"

# Centinela para la línea en blanco que pertenece al CUERPO de un bloque de
# código. El colapso final no puede distinguirla de la que la conversión
# introduce entre bloques, y una transcripción verbatim que pierde renglones
# deja de serlo.
BLANK_IN_CODE = "\x00BLANK\x00"

# Apertura o cierre de etiqueta HTML al principio del renglón. Es deliberadamente
# estrecho —nombre de etiqueta, no cualquier `<`— para no confundir un literal
# como `<slug>` en prosa con un bloque HTML.
HTML_BLOCK = re.compile(r"^</?[A-Za-z][A-Za-z0-9]*(\s|>|/>)")


def _markup_abierto(row: str) -> bool:
    """¿El renglón deja una marca en línea sin cerrar?"""
    return row.count("`") % 2 == 1 or row.count("**") % 2 == 1


def _join_wrapped_inline_markup(lines: list[str]) -> list[str]:
    """Recompone el markup en línea que el fuente partió en dos renglones.

    ``convert_inline`` opera **por renglón**, así que un ```…``` o un ``**…**``
    que cruza un salto de línea le llega partido: la marca de apertura queda
    huérfana en el primero y la de cierre empareja con lo que encuentre en el
    segundo. El resultado es RST **válido** que dice otra cosa que el fuente, y
    por eso ningún gate de sintaxis lo ve.

    Alcanza a las dos marcas porque las dos se rompen igual, y el defecto se
    midió con una de cada una en el mismo documento (:ref:`h-docs-377`). El
    renglón resultante queda más largo que el del fuente: RST no es sensible al
    ancho, y reflowear el párrafo cambiaría renglones que el defecto no tocó.
    """
    rows: list[str] = []
    in_fence = False
    for row in lines:
        if row.startswith("```"):
            in_fence = not in_fence
            rows.append(row)
            continue
        # Una cita continúa a una cita, y sólo a ella: unir un ``>`` al párrafo
        # que lo precede fundiría dos bloques distintos. Al unir se retira el
        # prefijo del segundo renglón, que ya lo aporta el primero.
        cita = row.lstrip().startswith(">")
        cita_previa = bool(rows) and rows[-1].lstrip().startswith(">")
        continua = (
            not in_fence
            and rows
            and row.strip()
            and not row.startswith(("```", "#", "|"))
            and (cita_previa if cita else not cita_previa)
            and not re.match(r"^\s*>?\s*(-|\d+\.)\s", row)
            and _markup_abierto(rows[-1])
        )
        if continua:
            cola = row.lstrip()
            if cita:
                cola = cola[1:].lstrip()
            rows[-1] = f"{rows[-1].rstrip()} {cola}"
        else:
            rows.append(row)
    return rows


def _protect_code_spans(text: str) -> tuple[str, list[str]]:
    """Aparta los literales en línea para que el resto del markup no los toque."""
    spans: list[str] = []

    def take(match: re.Match[str]) -> str:
        # RST exige que la marca de apertura vaya pegada a texto: un literal
        # que empieza por espacio (`` *``, «espacio más comodín») produce
        # "Inline emphasis start-string without end-string". Se recorta el
        # borde; el fuente ya explica el espacio en prosa cuando importa.
        spans.append(match.group(1).strip() or match.group(1))
        return PLACEHOLDER.format(len(spans) - 1)

    return re.sub(r"`([^`]+)`", take, text), spans


def _flatten_bold(text: str, spans: list[str]) -> str:
    """Aplana el markup anidado: dentro de ``**…**`` el literal pierde su marca."""

    def flatten(match: re.Match[str]) -> str:
        inner = re.sub(
            r"\x00CODE(\d+)\x00",
            lambda m: spans[int(m.group(1))],
            match.group(1),
        )
        return f"**{inner}**"

    return re.sub(r"\*\*(.+?)\*\*", flatten, text, flags=re.S)


def _restore_code_span(match: re.Match[str], spans: list[str]) -> str:
    # RST exige que la marca de cierre ``…`` vaya seguida de espacio o de un
    # signo de puntuacion; pegada a un caracter de palabra produce "Inline
    # literal start-string without end-string" y el parrafo entero se pierde.
    # El caso vivo es el plural en español: `Package Description`s. La forma
    # canonica es un espacio escapado, que docutils elide al renderizar, asi
    # que el texto sale igual y el RST queda valido.
    cuerpo = spans[int(match.group(1))]
    siguiente = match.group(2)
    if siguiente:
        return f"``{cuerpo}``\\ {siguiente}"
    return f"``{cuerpo}``"


def convert_inline(text: str) -> str:
    """Convierte el markup en línea de una línea de prosa."""
    text, spans = _protect_code_spans(text)
    text = _flatten_bold(text, spans)
    # Enlace markdown -> referencia externa RST.
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"`\1 <\2>`_", text)
    text = re.sub(
        r"\x00CODE(\d+)\x00(\w?)",
        lambda m: _restore_code_span(m, spans),
        text,
    )
    return text


def _heading(line: str, out: list[str]) -> None:
    level = len(line) - len(line.lstrip("#"))
    title = convert_inline(line.lstrip("#").strip())
    # El ancho se mide en caracteres, no en bytes: las vocales acentuadas y el
    # em-dash cuentan uno, y un subrayado corto rompe el build.
    rule = UNDERLINE.get(level, '"') * max(len(title), 3)
    out.append("")
    if level == 1:
        out.append(rule)
    out.append(title)
    out.append(rule)
    out.append("")


_PIPE_SENTINEL = "\x00"


def _split_row(line: str) -> list[str]:
    """Parte una fila de tabla por sus tuberias SEPARADORAS.

    Una tuberia escapada (``\\|``) es contenido de la celda, no un separador:
    es la forma en que markdown deja escribir una alternancia dentro de una
    tabla (``.envrc\\|.env``, ``Write\\|Edit``). Partir por ella produce una
    fila con una celda de mas, y la ``list-table`` resultante ya no es
    rectangular — el error que docutils reporta como *"row N does not contain
    the same number of items as row 1"*.

    Se sustituye por un centinela antes de partir y se restituye como tuberia
    literal despues, que es lo que el escape denota.
    """
    protegida = line.replace("\\|", _PIPE_SENTINEL)
    return [cell.strip().replace(_PIPE_SENTINEL, "|")
            for cell in protegida.strip().strip("|").split("|")]


def _table(rows: list[str], out: list[str]) -> None:
    """Emite una tabla de tubería como ``list-table`` (lo que exige el gate)."""
    parsed = [_split_row(row) for row in rows]
    # La segunda fila es el separador (`|---|---|`) y no lleva contenido.
    header, body = parsed[0], parsed[2:]
    out.append("")
    out.append(".. list-table::")
    out.append("   :header-rows: 1")
    out.append("")
    for record in [header, *body]:
        for index, cell in enumerate(record):
            marker = "*" if index == 0 else " "
            value = convert_inline(cell) or "—"
            out.append(f"   {marker} - {value}")
    out.append("")


def convert(source: str) -> str:
    lines = _join_wrapped_inline_markup(source.splitlines())
    out: list[str] = []
    index = 0

    while index < len(lines):
        line = lines[index]

        # --- cerca de código ---
        fence = re.match(r"^```(\w*)\s*$", line)
        if fence:
            language = fence.group(1).lower()
            if language not in KNOWN_LANGUAGES:
                language = "text"
            body: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                body.append(lines[index])
                index += 1
            index += 1  # consume la cerca de cierre
            out.append("")
            out.append(f".. code-block:: {language}")
            out.append("")
            # La línea en blanco de DENTRO del bloque va marcada: el colapso
            # final no puede distinguirla de la que la conversión introduce, y
            # una transcripción verbatim que pierde renglones deja de serlo.
            out.extend(f"   {row}" if row.strip() else BLANK_IN_CODE for row in body)
            out.append("")
            continue

        # --- bloque HTML crudo ---
        # Markdown admite HTML tal cual; RST no. Emitido sin envolver, docutils
        # lee `<p align="right">` como lista de definición y el bloque indentado
        # que sigue queda mal ("Definition list ends without a blank line").
        # `.. raw:: html` es su forma canónica: preserva el bloque verbatim y
        # deja que cada constructor de salida decida si lo emite.
        if HTML_BLOCK.match(line):
            html: list[str] = []
            while index < len(lines) and lines[index].strip():
                html.append(lines[index])
                index += 1
            out.append("")
            out.append(".. raw:: html")
            out.append("")
            out.extend(f"   {row}" for row in html)
            out.append("")
            continue

        # --- encabezado ---
        if line.startswith("#"):
            _heading(line, out)
            index += 1
            continue

        # --- tabla de tubería ---
        if line.startswith("|"):
            rows: list[str] = []
            while index < len(lines) and lines[index].startswith("|"):
                rows.append(lines[index])
                index += 1
            if len(rows) >= 2 and re.match(r"^\|[\s:|-]+\|$", rows[1]):
                _table(rows, out)
            else:  # no es una tabla: pasa como prosa
                out.extend(convert_inline(row) for row in rows)
            continue

        # --- regla horizontal: se descarta (ver el docstring) ---
        if re.match(r"^-{3,}$", line.strip()):
            index += 1
            continue

        # --- cita: RST la expresa con sangría ---
        if line.startswith(">"):
            quote: list[str] = []
            while index < len(lines) and lines[index].startswith(">"):
                quote.append(lines[index].lstrip(">").strip())
                index += 1
            out.append("")
            out.extend(f"   {convert_inline(row)}" if row else "" for row in quote)
            out.append("")
            continue

        # --- prosa, listas y líneas en blanco ---
        converted = convert_inline(line)
        if re.match(r"^(-|\d+\.)\s", line) and out and out[-1].strip():
            # RST exige línea en blanco antes de una lista.
            if not re.match(r"^\s*(-|\d+\.)\s", out[-1]):
                out.append("")
        out.append(converted)
        index += 1

    # Colapsa las líneas en blanco consecutivas que la conversión introduce.
    # La marcada como interior de bloque se restituye sin pasar por el colapso.
    result: list[str] = []
    for row in out:
        if row == BLANK_IN_CODE:
            result.append("")
            continue
        if not row.strip() and result and not result[-1].strip():
            continue
        result.append(row.rstrip())
    return "\n".join(result).strip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entrada", type=pathlib.Path)
    parser.add_argument("--salida", type=pathlib.Path)
    args = parser.parse_args()

    rst = convert(args.entrada.read_text(encoding="utf-8"))
    if args.salida:
        args.salida.write_text(rst, encoding="utf-8")
        print(f"escrito: {args.salida} ({len(rst.splitlines())} lineas)")
    else:
        sys.stdout.write(rst)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
