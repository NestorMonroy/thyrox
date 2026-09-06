#!/usr/bin/env python3
"""El generador de un evento no toma el instante del reloj.

Nuestros generadores de evento derivan el instante del ``RUN_ID`` —el nombre
del directorio— para que una segunda ejecución reproduzca el artefacto byte a
byte. Eso era **convención**: nada impedía que el siguiente llamara al reloj, y
nadie se enteraría hasta que alguien intentara reproducirlo y obtuviera un
archivo distinto — momento en el que la evidencia ya se citó como reproducible.

El precedente es del propio cliente. Claude Code **rechaza en el parseo** un
guion de workflow que use el reloj, y declara su motivo::

    workflow scripts must be deterministic: Date.now()/Math.random()/new Date()
    are unavailable (breaks resume). Stamp results after the workflow returns,
    or pass timestamps via args.

Su remedio prescrito —*«pass timestamps via args»*— es el nuestro: el instante
entra por fuera. La diferencia era que lo suyo es un gate y lo nuestro una
convención. Esto la cierra. Ver :ref:`h-docs-490`.

El universo: quien ESCRIBE el artefacto, no quien mide
------------------------------------------------------

El defecto es que el **artefacto versionado** deje de reproducirse. Por eso el
universo no es «todo ejecutable de evento» sino **el generador**: el que escribe
bajo ``source/``. Una sonda que imprime un cronómetro a stdout no rompe nada
—su salida no se versiona— y marcarla sería el sub-patrón A de
``metrica-decide-la-conclusion.md``: medir una población y concluir sobre otra.

El gate publica su denominador al correr; esta prosa no lo transcribe —una
cifra que vive en código no se copia a un comentario, porque el árbol crece y
el comentario no se entera (``calibration-verified-numbers.md``).

Lo que sí es evidencia fechada, porque mide una **relación** y no un tamaño: al
cablearlo, el universo ancho (todo `.py`/`.sh` de evento) daba doce marcas y
**once eran sondas, fixtures o árboles de terceros**. Sólo el universo estrecho
—el generador— separa el defecto del ruido.

Uso::

    python3 .claude/scripts/gates/check_generator_determinism.py
    python3 .claude/scripts/gates/check_generator_determinism.py --strict
"""

import argparse
import ast
import os
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

# El instante o el azar tomados del entorno. Las formas salen de medir el árbol,
# no de memoria: `datetime.now(timezone.utc)` vive en flujo-de-tiempo-*,
# `time.time()` en spread_del_tiempo.py, `$(date …)` en los guiones de shell.
# El azar y el instante, tomados del entorno. En `.py` NO se detectan con una
# expresión regular sino con el AST, y la diferencia no es de estilo: las tres
# formas que un regex marcaba en el árbol limpio vivían dentro de una CADENA —
# el docstring que explica «el instante sale del RUN_ID, no de ``date(1)``», y
# un `ejemplo_hook="""...""" que muestra un hook de telemetría. El regex ve
# el significante; el AST ve la llamada. Es el sub-patrón C de
# `metrica-decide-la-conclusion.md` aplicado al propio instrumento.
CLOCK_CALLS = {
    ('datetime', 'now'), ('datetime', 'utcnow'), ('date', 'today'),
    ('time', 'time'), ('time', 'monotonic'), ('time', 'monotonic_ns'),
    ('random', 'random'), ('random', 'randint'), ('random', 'choice'),
    ('random', 'shuffle'), ('random', 'uniform'),
}

# En shell no hay AST disponible; el regex es lo que hay, y su ceguera se declara.
SHELL_FORMS = re.compile(r'\$\(date\b|`date\b')

# Escribe el artefacto versionado. Un generador toca `source/` y usa una vía de
# escritura; las dos condiciones juntas, no una sola.
WRITES = re.compile(r"write_text\(|open\([^)]*['\"][wa]|>\s*\S*source/")

VENDORED = '/extraido/'


def event_root() -> pathlib.Path:
    """La raíz de eventos. `EVENTS_ROOT` la desvía para poder probar el guard."""
    override = os.environ.get('EVENTS_ROOT')
    if override:
        return pathlib.Path(override)
    # El hogar de los eventos es del CONSUMIDOR. Era `parents[2]/'eventos'`,
    # que valía desde `kaupamex-docs/.claude/scripts/gates/` —parents[2] era
    # `.claude`— y desde `thyrox/src/gates/` da `thyrox/eventos`.
    return reach.consumer_root() / '.claude' / 'eventos'


def require_root(root: pathlib.Path) -> pathlib.Path:
    """Precondición declarada: sin raíz NO se emite conteo.

    Un 0 aquí no distinguiría «ningún generador viola» de «no pude medir», que
    es el sub-patrón D de ``metrica-decide-la-conclusion.md``.
    """
    if not root.is_dir():
        print(f'ERROR — la raíz de eventos {root} no existe. NO se emite un '
              'conteo: un 0 sería un verde falso.', file=sys.stderr)
        raise SystemExit(2)
    return root


def generators(root: pathlib.Path):
    """Los ejecutables de evento que escriben bajo `source/`."""
    for path in sorted(root.rglob('*')):
        if path.suffix not in ('.py', '.sh') or not path.is_file():
            continue
        if VENDORED in f'/{path.as_posix()}/' or '__pycache__' in path.parts:
            continue
        try:
            text = path.read_text(errors='ignore')
        except OSError:
            continue
        if 'source/' in text and WRITES.search(text):
            yield path, text


def clock_calls_in(text: str):
    """Llamadas al reloj o al azar en un `.py`, por AST — nunca por cadena."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        base = node.func.value
        # `datetime.now(...)` y `datetime.datetime.now(...)` son la misma llamada.
        owner = base.attr if isinstance(base, ast.Attribute) else (
            base.id if isinstance(base, ast.Name) else None)
        if owner and (owner, node.func.attr) in CLOCK_CALLS:
            yield node.lineno, f'{owner}.{node.func.attr}('


def offenders(root: pathlib.Path):
    total = 0
    found = []
    for path, text in generators(root):
        total += 1
        lines = text.splitlines()
        if path.suffix == '.py':
            hits = list(clock_calls_in(text))
        else:
            hits = [(n, m.group(0))
                    for n, line in enumerate(lines, 1)
                    if (m := SHELL_FORMS.search(line))]
        for number, form in hits:
            found.append((path, number, form, lines[number - 1].strip()))
    return total, found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si algún generador toma el instante del reloj')
    args = parser.parse_args()

    root = require_root(event_root())
    total, found = offenders(root)

    for path, number, form, line in found:
        rel = path.relative_to(root.parent.parent) if root.parent.parent in path.parents else path
        print(f'{rel}:{number}: toma el instante del reloj con `{form}`')
        print(f'    {line}')
        print('    → deriva el instante del RUN_ID, o pásalo por argumento.')

    print(f'check-generator-determinism: {len(found)} generador(es) que toman '
          f'el instante del reloj (alcance medido: {total} generadores — '
          'ejecutables de evento que escriben bajo source/)')
    return 1 if (found and args.strict) else 0


if __name__ == '__main__':
    sys.exit(main())
