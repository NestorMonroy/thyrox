#!/usr/bin/env python3
"""El rol ``:doc:`` de un RST — su patron, su aritmetica y su contenedor.

Origen: TASK-DOCS-0546. El mecanismo vivia en el CONSUMIDOR, dentro de un
directorio de evento **fechado** (``kaupamex-docs:
.claude/eventos/reparto-de-iniciativas-por-dominio-*/move_initiative.py``),
y un gate del proveedor que lo importara invertiria DEC-04. Este modulo es el
levantamiento del patron y de la aritmetica; lo que reescribe la cita al mover
una iniciativa sigue siendo del consumidor, porque eso es una transformacion
de SU corpus.

Tres piezas, y la tercera es la que el censo anterior no tenia:

``DOC_ROLE``        el patron, con sus DOS formas — destino desnudo y titulado
``resolve_target``  absoluto (cuelga de la raiz) contra relativo (se normaliza
                    contra el directorio del citante)
``iter_citations``  el recorrido que **salta** las citas dentro de un literal

La tercera importa porque Sphinx no resuelve un rol dentro de ``...`` ni
dentro de un bloque literal: contarlas como enlaces rotos mide un fenomeno
que no ocurre. El censo de TASK-GEN-0635 lo declaro en su ``Ciega a`` y nadie
lo midio — son **5** de sus 85: cuatro son prosa que CITA la forma de un
enlace, y la quinta es un marcador de plantilla (``tpl-ventana``,
``/backend/adr/adr-NNN-...``) dentro de un bloque literal.

El salto no reimplementa la deteccion de literal: reusa ``literal_spans`` y
``block_spans`` de ``verify/check_vocabulario_prosa.py``, que ya la tienen
medida (5.6 % en linea, 18.4 % en bloque). Una segunda copia seria la segunda
fuente de verdad que ``calibration-verified-numbers.md`` prohibe.

*Metrica:* ocurrencias del rol ``:doc:`` en el texto dado, con su renglon.
*Ciega a:* un literal partido en dos renglones y un bloque con sangria
inconsistente — las dos cegueras que ``literal_spans``/``block_spans`` ya
declaran, heredadas al reusarlas. Es una cota inferior de las menciones, asi
que un enlace contado de mas es posible y uno de menos no.
"""
from __future__ import annotations

import posixpath
import re
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:  # pragma: no cover — el clon esta roto si esto ocurre
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_HERE}")

from verify import check_vocabulario_prosa as _prosa  # noqa: E402

#: Las dos formas del rol. El grupo ``target_in_title`` cubre
#: ``:doc:`Titulo <ruta>``` y ``target`` el destino desnudo. Verbatim del
#: mecanismo del consumidor, para que el levantamiento no introduzca deriva.
DOC_ROLE = re.compile(r":doc:`(?:[^`<]*<(?P<target_in_title>[^>`]+)>|(?P<target>[^`<>]+))`")

#: El literal en linea que CONTIENE un rol, que es el caso que
#: ``check_vocabulario_prosa.INLINE_LITERAL`` no puede ver — y no por descuido:
#: su patron es ``` ``[^`\n]+`` ```, que prohibe **cualquier** acento grave
#: dentro, y un ``:doc:`x``` siempre lleva dos. Medido sobre los tres renglones
#: reales de ``progreso-revisar-pendientes-docs.rst``: 0 tramos con aquel
#: patron, 3 con este.
#:
#: Aqui el contenido admite un acento grave aislado — ``` `(?!`) ``` — que es
#: como RST cierra el literal en el primer par. NO se corrige el patron del
#: gate hermano: aquel mide formas vetadas en prosa y ensancharlo cambiaria su
#: cifra sobre un corpus entero por una necesidad de otro instrumento.
ROLE_INLINE_LITERAL = re.compile(r"``(?:[^`\n]|`(?!`))+``")


def role_literal_spans(text: str) -> list[tuple[int, int]]:
    """Los tramos de literal en linea que pueden contener un rol."""
    return [m.span() for m in ROLE_INLINE_LITERAL.finditer(text)]


#: Las directivas cuyo cuerpo ES literal. Se reusa el patron del gate hermano
#: —`code-block`, `literalinclude`, `parsed-literal`— en vez de copiarlo.
_LITERAL_DIRECTIVE = _prosa.DIRECTIVA_LITERAL

#: Una linea que ABRE una directiva cualquiera: `.. <nombre>::`. Es el
#: discriminador que `check_vocabulario_prosa.block_spans` no hace y que aqui
#: es obligatorio.
_DIRECTIVE_OPENING = re.compile(r"^\s*\.\.\s+[A-Za-z0-9_-]+::")

#: Un parrafo que termina en `::` abre un bloque literal — salvo que sea la
#: apertura de una directiva, que abre un cuerpo NORMAL.
_TRAILING_DOUBLE_COLON = re.compile(r"::\s*$")


def role_block_spans(text: str) -> list[tuple[int, int]]:
    """Los bloques LITERALES de verdad — no todo cuerpo sangrado tras `::`.

    `check_vocabulario_prosa.block_spans` abre un tramo ante **cualquier**
    renglon terminado en `::`, incluida la apertura de una directiva. Para
    aquel gate eso es una exencion conservadora —exime de mas, y su docstring
    lo declara «cota inferior»—; aqui seria un **falso negativo**, porque un
    `:doc:` dentro de un `.. list-table::` o un `.. seealso::` es un enlace
    vivo que Sphinx resuelve.

    Medido sobre `kaupamex-docs: source/` al escribir esto: de las 1415 citas
    que aquel detector saltaba, **1414** vivian en el cuerpo de una directiva
    —712 `seealso`, 604 `list-table`, 78 `note`, 10 `warning`, 8 `important`,
    1 `attention`— y **1** en un `code-block` real. Reusarlo habria publicado
    78 citas rotas midiendo el 59 % del corpus, sin que la cifra lo dijera: el
    sub-patron D de `metrica-decide-la-conclusion.md` con este gate de sujeto.

    NO se corrige `block_spans`: aquel mide formas vetadas en prosa sobre un
    corpus entero, y estrecharlo cambiaria su cifra por una necesidad de otro
    instrumento. Son dos preguntas distintas sobre el mismo texto.
    """
    lines = text.splitlines(keepends=True)
    starts, offset = [], 0
    for line in lines:
        starts.append(offset)
        offset += len(line)
    starts.append(offset)

    spans, i = [], 0
    while i < len(lines):
        line = lines[i]
        is_directive = _DIRECTIVE_OPENING.match(line) is not None
        opens = (_LITERAL_DIRECTIVE.match(line) is not None
                or (not is_directive
                    and _TRAILING_DOUBLE_COLON.search(line)
                    and line.strip() != ""))
        if not opens:
            i += 1
            continue
        base_indent = len(line) - len(line.lstrip())
        j, last = i + 1, i
        while j < len(lines):
            current = lines[j]
            if current.strip() == "":
                j += 1
                continue
            if len(current) - len(current.lstrip()) <= base_indent:
                break
            last = j
            j += 1
        if last > i:
            spans.append((starts[i + 1], starts[last + 1]))
        i = max(j, i + 1)
    return spans


#: Los contenedores que hacen que un rol NO sea un enlace. Es una tupla de
#: funciones ``texto -> [(inicio, fin)]`` para que la ANULACION del salto sea
#: una linea del test: vaciarla y comprobar que vuelven exactamente las citas
#: que dependian de ella.
LITERAL_SPANNERS = (role_literal_spans, _prosa.literal_spans, role_block_spans)


def targets_in(text: str) -> list[str]:
    """Los destinos del rol en el texto, sin mirar su contenedor."""
    return [(m.group("target_in_title") or m.group("target")).strip()
            for m in DOC_ROLE.finditer(text)]


def resolve_target(target: str, citing: str) -> str:
    """El ``docname`` al que apunta la cita.

    Un destino que empieza por ``/`` cuelga de la raiz del arbol; el resto se
    normaliza contra el directorio del citante. Es la aritmetica que el mover
    del consumidor ya ejercia, no una invencion de este modulo.
    """
    clean = target.strip()
    if clean.startswith("/"):
        return clean.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(citing), clean))


def _line_starts(text: str) -> list[int]:
    starts, offset = [], 0
    for line in text.splitlines(keepends=True):
        starts.append(offset)
        offset += len(line)
    return starts


def _line_of(offset: int, starts: list[int]) -> int:
    lo, hi = 0, len(starts) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if starts[mid] <= offset:
            lo = mid
        else:
            hi = mid - 1
    return lo + 1


def iter_citations(text: str, citing: str) -> list[tuple[str, int]]:
    """Los enlaces ``:doc:`` VIVOS del texto, con su renglon.

    ``citing`` se acepta para que la firma sea la del sitio de uso —el gate
    resuelve enseguida con ``resolve_target``— aunque el filtro de literal no
    dependa de el.
    """
    spans = [t for spanner in LITERAL_SPANNERS for t in spanner(text)]
    starts = _line_starts(text)
    live = []
    for m in DOC_ROLE.finditer(text):
        if any(a <= m.start() < b for a, b in spans):
            continue
        target = (m.group("target_in_title") or m.group("target")).strip()
        live.append((target, _line_of(m.start(), starts)))
    return live
