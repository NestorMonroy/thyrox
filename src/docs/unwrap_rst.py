#!/usr/bin/env python3
"""Une las líneas de un párrafo RST en una sola línea, con la gramática de docutils.

Origen: directiva del ejecutor 2026-08-11 — *"cuando escribas los archivos .rst
tienes que asegurarte de escribirlos correctos, si es un párrafo que el párrafo
no tenga un salto de línea"*; y su corrección del mismo día: *"analiza los
binarios de Sphinx, para analizar, documentar y aplicar la forma correcta"*.

**No traduce la gramática RST: la importa.** ``docutils.parsers.rst.states.Body``
lleva la tabla de patrones con la que el parser real decide qué es cada línea
(``states.py:1139-1151``). Este script usa **esa misma tabla**, así que un
constructo que docutils reconoce, aquí también — sin una segunda gramática que
mantener en paralelo. Es la aplicación directa de ``porte-completo-no-parcial.md``:
si el stack ya trae el mecanismo, se copia, no se reimplementa.

La primera versión sí la reimplementaba con regex propias, y **corrompía cuatro
constructos** (medido sobre un archivo de casos, 2026-08-11):

===================  ==========================================================
Constructo           Qué hacía la versión de regex propias
===================  ==========================================================
lista de opciones    ``-v  modo`` + ``--long  otra`` unidos en una línea
bloque doctest       ``>>> foo()`` + ``>>> bar()`` unidos
enumerador           ``(1)``/``(2)``, ``a.``, ``iv.`` unidos — sólo veía ``1.``
viñeta unicode       ``•``/``‣``/``⁃`` no reconocidas como viñeta
tabla grid           ``+---+---+`` sobrevivía **por casualidad**, no por diseño
===================  ==========================================================

Qué toca y qué no
-----------------

Une los párrafos de prosa, **incluido el cuerpo de un ítem de lista**. Deja
intacto, por construcción: el contenido de toda directiva (``..``) —ahí viven
los ``code-block`` y las ``list-table``, donde un salto de línea es
significativo—, los bloques literales que siguen a ``::``, las listas de campos
(``:clave: valor``), las tablas, los subrayados de título y las transiciones.

**Lo que este script NO hace:** no une prosa dentro de una directiva, ni
siquiera cuando sería deseable (``.. note::`` con un párrafo envuelto). Es una
renuncia deliberada: distinguir una directiva de prosa de una de contenido
literal exige el registro de directivas de Sphinx, y equivocarse ahí destruye un
``code-block``. El costo de no unir es cosmético; el de unir de más, no.

Uso::

    .venv/bin/python scripts/unwrap_rst.py <archivo.rst> [...]    # sólo reporta
    .venv/bin/python scripts/unwrap_rst.py --apply <archivo.rst>  # reescribe

Sin ``--apply`` no escribe: imprime el conteo de líneas antes y después. Requiere
el intérprete del entorno (``make sync`` crea ``.venv``), porque importa docutils.
"""
import re
import sys

try:
    from docutils.parsers.rst.states import Body
except ImportError:                                     # pragma: no cover
    sys.exit('unwrap_rst: falta docutils — usar .venv/bin/python (make sync)')

# La tabla de patrones del parser real. Todo lo que NO es 'text' es un
# constructo con estructura propia: si una línea lo empieza, no es prosa
# continuable. Se compilan tal cual salen de docutils — sin reescribirlos.
CONSTRUCTS = tuple(
    re.compile(pattern if isinstance(pattern, str) else pattern.pattern)
    for name, pattern in Body.patterns.items() if name != 'text'
)
def _compiled(name):
    """El patrón de docutils, venga como cadena o ya compilado."""
    pattern = Body.patterns[name]
    return re.compile(pattern if isinstance(pattern, str) else pattern.pattern)


# 'line' cubre a la vez el subrayado de un título y una transición: cualquier
# carácter de puntuación ASCII repetido hasta el fin de línea.
LINE = _compiled('line')
# Los dos constructos cuyo marcador SÍ abre un párrafo que se une con sus
# continuaciones — a diferencia de una tabla o una lista de campos.
BULLET = _compiled('bullet')
ENUMERATOR = _compiled('enumerator')


def starts_construct(stripped):
    """¿Esta línea abre un constructo RST (no prosa continuable)?"""
    return any(pattern.match(stripped) for pattern in CONSTRUCTS)


def indent_of(line):
    return len(line) - len(line.lstrip())


def unwrap(text):
    lines = text.split('\n')
    output = []
    i = 0
    skip_indent = None          # dentro de directiva o bloque literal

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # --- contenido de directiva o bloque literal: se copia verbatim ------
        if skip_indent is not None:
            if not stripped or indent_of(line) > skip_indent:
                output.append(line)
                i += 1
                continue
            skip_indent = None                  # dedentó: el bloque terminó

        if not stripped:
            output.append(line)
            i += 1
            continue

        indent = indent_of(line)

        # --- una directiva abre un bloque que no se toca ---------------------
        if stripped.startswith('..'):
            output.append(line)
            skip_indent = indent
            i += 1
            continue

        # --- un título: su subrayado viene en la línea siguiente -------------
        following = lines[i + 1] if i + 1 < len(lines) else ''
        if LINE.match(following.strip()) and not starts_construct(stripped):
            output.append(line)
            i += 1
            continue

        # --- constructos que NO se unen: tablas, campos, transiciones --------
        # Las viñetas y los enumeradores son la excepción: su marcador abre un
        # párrafo, y ese párrafo sí se une con sus líneas de continuación.
        if starts_construct(stripped):
            if not (BULLET.match(stripped) or ENUMERATOR.match(stripped)):
                output.append(line)
                if stripped.endswith('::'):
                    skip_indent = indent
                i += 1
                continue

        # --- párrafo: unir con sus continuaciones ----------------------------
        # Una continuación es una línea no vacía, que no abre constructo, y cuya
        # indentación no dedenta por debajo de la del párrafo. Para un ítem de
        # lista la continuación va MÁS indentada que el marcador; para un
        # párrafo suelto va a la misma.
        parts = [line.rstrip()]
        j = i + 1
        while j < len(lines):
            candidate = lines[j]
            candidate_stripped = candidate.strip()
            if not candidate_stripped:
                break
            if indent_of(candidate) < indent:
                break
            if starts_construct(candidate_stripped):
                break
            after = lines[j + 1] if j + 1 < len(lines) else ''
            if LINE.match(after.strip()):       # la siguiente es un título
                break
            parts.append(candidate_stripped)
            j += 1

        joined = ' '.join(parts)
        output.append(joined)
        if joined.rstrip().endswith('::'):
            skip_indent = indent
        i = j
    return '\n'.join(output)


if __name__ == '__main__':
    apply_changes = '--apply' in sys.argv
    # Filtrar los flags: sin esto ``--apply`` se consumía como ruta de archivo.
    paths = [arg for arg in sys.argv[1:] if not arg.startswith('--')]
    for path in paths:
        with open(path, encoding='utf-8') as handle:
            original = handle.read()
        rewritten = unwrap(original)
        if apply_changes:
            with open(path, 'w', encoding='utf-8') as handle:
                handle.write(rewritten)
            print(f'APLICADO {path}: {len(original.splitlines())} -> '
                  f'{len(rewritten.splitlines())} líneas')
        else:
            print(f'--- {path}: {len(original.splitlines())} -> '
                  f'{len(rewritten.splitlines())} líneas')
