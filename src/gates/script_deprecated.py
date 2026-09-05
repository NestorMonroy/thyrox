#!/usr/bin/env python3
"""Un script deprecado declara su motivo Y aplica su guard — las dos mitades.

Un artefacto con un defecto medido no se barre: se queda como evidencia, se
marca desactivado y la versión nueva vive al lado. La convención existía en
``.rst`` (``:estado: Historico`` más un aviso con fecha, motivo y sucesor) y
para código que no se ejecuta. Para un **script que sí se ejecuta** no había
nada, y ése es el hueco que este gate cierra.

Las dos mitades se exigen juntas porque cada una sin la otra es inútil:

- **Cabecera sin guard** — una declaración que nadie hace cumplir. El script
  sigue corriendo en silencio y el marcador sólo lo ve quien abre el archivo.
- **Guard sin cabecera** — un rechazo que nadie puede explicar. Quien lo recibe
  no sabe desde cuándo, por qué, ni qué usar en su lugar.

La cabecera son tres líneas, greppeables por prefijo::

    # DEPRECATED: <fecha ISO> — <motivo medido>
    # SUCESOR: <qué usar en su lugar>
    # HALLAZGO: <ID que lo mide>

Lo que este gate NO decide
---------------------------

**Qué merece deprecarse.** Eso es juicio, y depende de una medición que ningún
patrón sintáctico alcanza: un script puede estar roto sin declararlo, y este
gate lo dará por limpio. Su cero significa «ninguna declaración está a medias»,
no «no queda deuda».

**Qué llamador tiene derecho a la excepción.** El guard exige
``ACCEPT_DEPRECATED=<nombre>`` en quien invoque; que ese sitio sea el legítimo lo
decide quien lo escribe, no un check.

El alcance: TODAS las raíces, no un clon
-----------------------------------------

Sin argumentos recorre el **conjunto resuelto** de ``paths.reach.require_all()``,
que **rehúsa** si alguna raíz falta en vez de devolver un conjunto corto. Con
argumentos mide sólo los que se le nombren — un clon suelto sigue siendo
medible, y el denominador lo dice.

Procedencia
-----------
Adaptación de ``kaupamex-docs: .claude/scripts/gates/check_script_deprecated.py``,
portado a THYROX en P5. Su propio docstring difería la opción (c) —portarlo—
a la tarea #90; esto es esa opción.

*Métrica:* scripts ``*.sh`` y ``*.py`` bajo las raíces de ``ROOTS``, en cada
repositorio del conjunto medido, con al menos un marcador de deprecación
—cabecera o guard— cuya declaración está incompleta.
*Ciega a:* un script deprecado que no lo declara de ninguna forma; todo archivo
fuera de esas raíces; y un clon que exista en disco sin estar declarado en
``REACH_ROOTS`` — el conjunto es una decisión, no un descubrimiento.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from paths import reach  # noqa: E402

ROOTS = ('.claude/scripts', '.claude/hooks', 'scripts')
EXCLUDE = ('node_modules', '.venv', 'venv', '__pycache__', 'build', 'dist')

HEADER_KEYS = {
    'DEPRECATED': re.compile(r'^# (?:DEPRECATED|OBSOLETE): *\S', re.M),
    'SUCESOR': re.compile(r'^# SUCESOR: *\S', re.M),
    'HALLAZGO': re.compile(r'^# HALLAZGO: *\S', re.M),
}
# La llamada, no el `source`: un script puede cargar el guard y no aplicarlo.
# Las dos grafías, una por lenguaje.
GUARD = re.compile(r'^\s*(deprecated_guard|_?\w*\.?deprecated_guard)\b', re.M)

#: Son el mecanismo, no scripts deprecados: medirlos daría un infractor
#: permanente que nadie puede arreglar.
GUARD_FILES = ('deprecated.sh', 'deprecated.py')


def review(text: str) -> list[str]:
    """Devuelve los motivos por los que la declaración está incompleta."""
    present = {k: bool(p.search(text)) for k, p in HEADER_KEYS.items()}
    guard = bool(GUARD.search(text))
    if not any(present.values()) and not guard:
        return []                      # no declara nada: no es asunto del gate

    missing = [f'falta `# {k}:`' for k, ok in present.items() if not ok]
    if not guard:
        missing.append('falta la llamada a `deprecated_guard`')
    return missing


def scan(root: pathlib.Path) -> tuple[list[tuple[pathlib.Path, list[str]]], int]:
    """Devuelve (infractores con su motivo, total de scripts medidos)."""
    offenders: list[tuple[pathlib.Path, list[str]]] = []
    total = 0
    for sub in ROOTS:
        base = root / sub
        if not base.is_dir():
            continue
        for f in sorted(list(base.rglob('*.sh')) + list(base.rglob('*.py'))):
            if any(p in EXCLUDE for p in f.parts):
                continue
            if f.name in GUARD_FILES:
                continue
            total += 1
            try:
                text = f.read_text(encoding='utf-8', errors='replace')
            except OSError:
                continue
            missing = review(text)
            if missing:
                offenders.append((f, missing))
    return offenders, total


def resolve_roots(named: list[str]) -> dict[str, pathlib.Path]:
    """Las raíces a medir: las nombradas, o el conjunto resuelto del alcance.

    Sin argumentos usa ``require_all()`` y **no** ``reach()``: un conjunto corto
    mediría menos de lo que cree y publicaría un conteo que parece sano. La
    precondición vive aquí, dentro del guion, no en el llamador.
    """
    if named:
        return {pathlib.Path(a).resolve().name: pathlib.Path(a).resolve()
                for a in named}
    return reach.require_all()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('root', nargs='*',
                    help='raíz(ces) a medir. Sin argumentos: todas las del alcance')
    ap.add_argument('--quiet', action='store_true', help='sólo el conteo')
    ap.add_argument('--strict', action='store_true', help='exit 1 si hay infractores')
    args = ap.parse_args(argv)

    try:
        roots = resolve_roots(args.root)
    except reach.ReachRootError as error:
        # Rehúsa con código propio y SIN cifra. Un conteo emitido sobre un
        # conjunto incompleto es el verde que no discrimina.
        print(f'check_script_deprecated: {error}', file=sys.stderr)
        return 2

    by_root: list[tuple[str, int, int]] = []
    detail: list[str] = []
    offenders_total = 0
    measured_total = 0

    for name, root in roots.items():
        offenders, total = scan(root)
        by_root.append((name, len(offenders), total))
        offenders_total += len(offenders)
        measured_total += total
        for f, missing in offenders:
            detail.append(f'  {name}: {f.relative_to(root)}  ->  {"; ".join(missing)}')

    if args.quiet:
        print(offenders_total)
        return 1 if (args.strict and offenders_total) else 0

    for line in detail:
        print(line)

    # El desglose por raíz va SIEMPRE, aunque el total sea cero: es lo que
    # distingue «ninguna deuda» de «una raíz vacía que nadie notó».
    print('  ' + '  '.join(f'{n}:{i}/{t}' for n, i, t in by_root))
    print(
        f'{offenders_total} declaración(es) de deprecación incompleta(s) '
        f'(alcance medido: {measured_total} script(s) .sh y .py bajo '
        f'{"/".join(ROOTS)} en {len(roots)} raíz/raíces: '
        f'{", ".join(roots)})'
    )
    return 1 if (args.strict and offenders_total) else 0


if __name__ == '__main__':
    sys.exit(main())
