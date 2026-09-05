#!/usr/bin/env python3
"""Verifica que el script que cada comando de hook cita exista en disco.

Generado por `.claude/eventos/settings-local-20260821T110649/gen.py`. No editar a mano.

Es el defecto mas barato de detectar y el que ningun otro control cubre: un
renombre de archivo deja la ruta declarada apuntando al vacio, el hook falla al
ejecutarse, y ese fallo no llega a ninguna parte — el cliente no lo reporta y el
propio hook no puede reportarlo porque no llega a correr.

Metrica: existencia en disco de la ruta que el comando cita.
Ciega a: el comando que resuelve su script por PATH o lo construye en ejecucion;
         su ausencia de la tabla no prueba que exista.

Uso::

    verificar_rutas_de_hook.py ARCHIVO [ARCHIVO ...]
    verificar_rutas_de_hook.py --strict ARCHIVO      # exit 1 si falta alguna
"""

import argparse
import json
import pathlib
import sys

INTERPRETERS = frozenset(('bash', 'node', 'python', 'python3', 'sh'))


def script_of(command):
    """Extrae del comando la ruta del script, si la hay."""
    for token in command.split():
        if token in INTERPRETERS or token.startswith("-"):
            continue
        if "/" in token and pathlib.Path(token).suffix:
            return token
    return None


def iter_commands(settings):
    """Recorre evento -> matchers -> hooks -> comando."""
    for event, matchers in (settings.get("hooks") or {}).items():
        if not isinstance(matchers, list):
            continue
        for matcher in matchers:
            if not isinstance(matcher, dict):
                continue
            for hook in matcher.get("hooks") or []:
                if isinstance(hook, dict) and hook.get("command"):
                    yield event, hook["command"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("archivos", nargs="+", type=pathlib.Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)

    total, missing = 0, []
    for path in args.archivos:
        if not path.exists():
            print(f"AUSENTE   el archivo de settings no existe: {path}",
                  file=sys.stderr)
            missing.append((str(path), "(el archivo)"))
            continue
        settings = json.loads(path.read_text(encoding="utf-8"))
        for event, command in iter_commands(settings):
            script = script_of(command)
            if script is None:
                continue
            total += 1
            if not pathlib.Path(script).exists():
                missing.append((event, script))
                print(f"AUSENTE   {event:<16} {script}")

    print(f"rutas verificadas: {total} · ausentes: {len(missing)}")
    if missing and args.strict:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
