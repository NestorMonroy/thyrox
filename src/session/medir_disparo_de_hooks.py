#!/usr/bin/env python3
"""Mide qué hooks de Stop disparó de verdad el cliente, leyendo el transcript.

El cliente asienta, por cada fin de turno, una entrada ``system`` con
``subtype: stop_hook_summary``. Esa entrada trae el comando de cada hook que
ejecutó, su duración y sus errores. Es la única fuente durable de «¿disparó?»:
sobrevive al contenedor y cubre ventanas ya pasadas, que es lo que un log
escrito por el propio hook no puede hacer — si el hook no corre, no hay log.

Uso::

    python3 medir_disparo_de_hooks.py <transcript.jsonl> [--desde ISO] [--hasta ISO]
    python3 medir_disparo_de_hooks.py <transcript.jsonl> --esperado <substring>

Con ``--esperado`` el guion sale 1 si NINGUNA entrada del rango nombra ese
substring: sirve para preguntar «¿este hook mío llegó a correr?» y obtener un
código de salida, no una impresión que hay que interpretar.

Qué mide: el arreglo ``hookInfos`` de cada ``stop_hook_summary``.
A qué es ciego: al hook de otro evento (``PreToolUse``, ``SubagentStop``…),
que no produce esta entrada; y al subproceso que un hook lanza por dentro —
``hookErrors`` recoge el mensaje del hook, no el ``stderr`` de lo que el hook
ejecutó. Un hook que termina en 0 tragando el fallo de su hijo se ve idéntico
a uno que no tuvo nada que reportar.
"""

import argparse
import collections
import json
import sys


def read_summaries(path, since=None, until=None):
    """Devuelve las entradas ``stop_hook_summary`` del transcript, en orden."""
    out = []
    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            if '"stop_hook_summary"' not in line:
                continue
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get('subtype') != 'stop_hook_summary':
                continue
            stamp = entry.get('timestamp') or ''
            if since and stamp < since:
                continue
            if until and stamp > until:
                continue
            out.append(entry)
    return out


def tally(summaries):
    """Cuenta comandos y errores sobre un conjunto de entradas."""
    commands = collections.Counter()
    errors = 0
    for entry in summaries:
        for info in entry.get('hookInfos') or []:
            commands[info.get('command') or '(sin comando)'] += 1
        if entry.get('hookErrors'):
            errors += 1
    return commands, errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('transcript')
    parser.add_argument('--desde', help='ISO 8601; incluye desde esta marca')
    parser.add_argument('--hasta', help='ISO 8601; incluye hasta esta marca')
    parser.add_argument(
        '--esperado',
        help='substring de comando que se espera haber disparado; exit 1 si no aparece',
    )
    args = parser.parse_args(argv)

    summaries = read_summaries(args.transcript, args.desde, args.hasta)
    commands, errors = tally(summaries)

    print(f'fines de turno con resumen de hook: {len(summaries)}')
    print(f'de ellos, con hookErrors no vacío: {errors}')
    if not commands:
        print('comandos disparados: ninguno')
    else:
        print('comandos disparados:')
        for command, count in commands.most_common():
            print(f'  {count:>5}  {command}')

    if args.esperado:
        hits = sum(n for c, n in commands.items() if args.esperado in c)
        print(f'--esperado {args.esperado!r} -> {hits} disparo(s)')
        if hits == 0:
            print(
                'FALLA: el comando esperado no disparó en el rango medido.',
                file=sys.stderr,
            )
            return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
