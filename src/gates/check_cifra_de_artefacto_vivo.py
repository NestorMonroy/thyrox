#!/usr/bin/env python3
"""Una cifra que es propiedad de un artefacto vivo no se transcribe a prosa.

El corolario de ``calibration-verified-numbers.md`` distingue dos usos de un
número, y sólo uno driftea:

- **evidencia fechada de un episodio** — *"se desambiguó con un control: 27 de
  27 casos aciertan"*. Válido: es una ``Observation`` de un momento, y el
  momento no cambia.
- **propiedad de un artefacto vivo** — *"``test-x.sh`` — 17 aserciones"*.
  Prohibido: el guion gana aserciones y la prosa no se entera.

Este gate cubre las dos formas de la segunda clase que resultaron **medibles
sin ambigüedad**. Cada una lleva su razón, porque un patrón sin razón se
convierte en ruido en cuanto alguien lo hereda.

Ceguera declarada, y no es un olvido
------------------------------------
El **ordinal de gate suelto** (``gate #10``) NO se detecta. Medido sobre
``.claude/rules`` y ``source``: la forma mezcla dos referentes —la posición
del gate en su array y el **ID de tarea** que el gate cierra (``gate #334``,
``gate #529``)— y colisiona justo en el rango bajo, donde ``#7``, ``#9``,
``#10`` y ``#13`` son a la vez ordinales válidos e IDs de tarea válidos. Es
el sub-patrón A de ``metrica-decide-la-conclusion.md``: un rótulo que nombra
una cosa y contiene dos. Cablearlo produciría ruido, así que aquí sólo se
detecta el ordinal **citado junto a su script**, que sí desambigua.

La otra mitad del grifo no es este gate: es que el productor no numere. Un
``thyrox-audit.sh`` sin ordinales en sus comentarios no da nada que citar.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

#: El árbol medido por defecto es el del consumidor; `--raiz` lo sobreescribe.
RAIZ_DEFECTO = reach.consumer_root()
BASELINE = pathlib.Path(__file__).with_name('cifra_de_artefacto_vivo_baseline.txt')

# (nombre, patrón, razón) — la razón se imprime junto al hallazgo.
PATRONES: list[tuple[str, re.Pattern[str], str]] = [
    (
        'aserciones',
        re.compile(r'\b\d+ aserciones?\b'),
        'la suite gana aserciones y la prosa no se entera; nombra el comando, '
        'que publica su conteo al correr',
    ),
    (
        'ordinal-de-gate',
        # El `\*{0,2}` tolera el énfasis RST/Markdown alrededor del número.
        # Sin él, «Gate **18** de ``thyrox-audit.sh``» pasaba sin marcar — un
        # falso negativo REAL, encontrado al correr el gate contra el índice
        # de hallazgos del propio pase que lo escribió.
        re.compile(
            r'\bgate \*{0,2}#?\d+\*{0,2} del? [`*.\w/-]*'
            r'(?:thyrox-audit|pre-commit|pre-push|post-merge|\.sh|\.py)',
            re.I,
        ),
        'insertar un gate antes desplaza el ordinal y la cita queda mintiendo; '
        'el gate se identifica por su script, que es un nombre estable',
    ),
]

SUFIJOS = ('.md', '.rst', '.sh', '.py')
SUBRAICES = ('.claude/rules', '.claude/scripts', 'source')
EXCLUIR = ('node_modules', '.venv', 'venv', '__pycache__', 'build', 'dist')


def cargar_baseline() -> set[str]:
    if not BASELINE.is_file():
        return set()
    return {
        línea.strip()
        for línea in BASELINE.read_text(encoding='utf-8').splitlines()
        if línea.strip() and not línea.startswith('#')
    }


def archivos(raiz: pathlib.Path):
    for sub in SUBRAICES:
        base = raiz / sub
        if not base.is_dir():
            continue
        for f in base.rglob('*'):
            if f.suffix in SUFIJOS and not any(p in EXCLUIR for p in f.parts):
                yield f


INLINE_LITERAL = re.compile(r'``[^`\n]+``')

#: El literal en linea es la otra forma de citar verbatim, y por el mismo
#: motivo que el bloque: dentro va un token transcrito, no una afirmacion de
#: la prosa. Un hallazgo que cita la salida `test-x: 31 aserciones OK` para
#: explicar POR QUE esa cifra era un falso positivo se marcaba a si mismo.
#: Mismo arreglo que en `check_vocabulario_prosa.py` (:ref:`h-docs-442`).

DIRECTIVA_LITERAL = re.compile(r'^(\s*)\.\.\s+(code-block|literalinclude|parsed-literal)::')
CIERRE_DOS_PUNTOS = re.compile(r'::\s*$')

#: La forma-EPISODIO que la regla bendice explicitamente. `N de N aserciones`
#: —«20 de 20 aserciones pasan»— no afirma una propiedad del guion: afirma el
#: resultado de una corrida fechada, y ese resultado no cambia porque la suite
#: crezca. `calibration-verified-numbers.md` la distingue en su tabla: la
#: evidencia fechada de un episodio es **valida**; la propiedad de un artefacto
#: vivo, prohibida. El gate marcaba las dos.
FORMA_EPISODIO = re.compile(r'\b\d+\s+de\s+\d+\s+aserciones?\b', re.I)


def lineas_de_bloque_literal(texto: str) -> set[int]:
    """Los numeros de linea (1-based) que caen dentro de un bloque literal.

    Un bloque literal contiene la salida real de un comando: una cifra ahi es
    la transcripcion de una corrida, no una afirmacion de la prosa sobre el
    guion. Marcarla obliga a falsear la evidencia para pasar el gate, que es lo
    contrario de lo que el gate persigue.

    *Metrica:* renglones sangrados por debajo de una apertura ``::`` o de una
    directiva ``code-block``.
    *Ciega a:* un bloque con sangria inconsistente. Cota inferior.
    """
    lineas = texto.splitlines()
    dentro: set[int] = set()
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        abre = DIRECTIVA_LITERAL.match(linea) is not None or (
            CIERRE_DOS_PUNTOS.search(linea) and linea.strip() != ''
        )
        if not abre:
            i += 1
            continue
        sangria_base = len(linea) - len(linea.lstrip())
        j = i + 1
        while j < len(lineas):
            actual = lineas[j]
            if actual.strip() == '':
                j += 1
                continue
            if len(actual) - len(actual.lstrip()) <= sangria_base:
                break
            dentro.add(j + 1)
            j += 1
        i = max(j, i + 1)
    return dentro


def scan(raiz: pathlib.Path) -> tuple[list[tuple[str, int, str, str]], int]:
    """Devuelve (hallazgos, total de archivos medidos).

    Cada hallazgo es ``(clave, línea, forma, razón)``. La clave es
    ``<ruta relativa>::<forma>`` — nunca la forma sola: la misma cifra puede
    ser la CITA del anti-patrón en la regla que lo prohíbe, y congelarla
    globalmente la autorizaría en un documento nuevo.
    """
    propio = pathlib.Path(__file__).resolve()
    hallazgos: list[tuple[str, int, str, str]] = []
    total = 0
    for f in archivos(raiz):
        if f.resolve() == propio:      # el gate cita sus propias formas
            continue
        total += 1
        try:
            texto = f.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        rel = f.relative_to(raiz).as_posix()
        citadas = lineas_de_bloque_literal(texto)
        for n, línea in enumerate(texto.splitlines(), 1):
            if n in citadas:           # salida de comando transcrita, no prosa
                continue
            episodios = [m.span() for m in FORMA_EPISODIO.finditer(línea)]
            episodios += [m.span() for m in INLINE_LITERAL.finditer(línea)]
            for _nombre, patrón, razón in PATRONES:
                for m in patrón.finditer(línea):
                    if any(a <= m.start() and m.end() <= b for a, b in episodios):
                        continue       # `N de N aserciones` — evidencia fechada
                    hallazgos.append((f'{rel}::{m.group(0)}', n, m.group(0), razón))
    return hallazgos, total


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz', nargs='?', default=str(RAIZ_DEFECTO))
    ap.add_argument('--strict', action='store_true', help='exit 1 si hay nuevos')
    ap.add_argument('--quiet', action='store_true', help='sólo el conteo')
    ap.add_argument('--no-baseline', action='store_true',
                    help='ignora el baseline — mide el universo entero')
    ap.add_argument('--write-baseline', action='store_true')
    args = ap.parse_args()

    raiz = pathlib.Path(args.raiz).resolve()
    hallazgos, total = scan(raiz)

    if args.write_baseline:
        claves = sorted({h[0] for h in hallazgos})
        BASELINE.write_text(
            '# Deuda heredada de cifras-propiedad, congelada — NO es una lista\n'
            '# de formas autorizadas. La clave es <ruta>::<forma> a propósito:\n'
            '# la misma cifra puede ser la CITA del anti-patrón en la regla que\n'
            '# lo prohíbe. Se paga al tocar el archivo.\n'
            + '\n'.join(claves) + '\n', encoding='utf-8')
        print(f'baseline escrito: {len(claves)} clave(s)')
        return 0

    base = set() if args.no_baseline else cargar_baseline()
    nuevos = [h for h in hallazgos if h[0] not in base]

    if args.quiet:
        print(len(nuevos))
    else:
        for clave, n, forma, razón in nuevos:
            ruta = clave.split('::', 1)[0]
            print(f'{ruta}:{n}: «{forma}» — {razón}')
        print(f'\n{len(nuevos)} cifra(s)-propiedad nueva(s) '
              f'(alcance medido: {total} archivo(s) bajo '
              f'{"/".join(s.rsplit("/", 1)[-1] for s in SUBRAICES)})')

    return 1 if (args.strict and nuevos) else 0


if __name__ == '__main__':
    sys.exit(main())
