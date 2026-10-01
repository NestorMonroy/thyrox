#!/usr/bin/env python3
"""Cada clave de un `.env` ignorado figura en `.env.example`.

`.env` y `.env.local` no se versionan: pueden llevar secretos, como la clave
de cifrado del store de conexiones. `.env.example` es la única declaración que
viaja con el árbol, así que una clave que sólo vive en el `.env` es una
obligación que ningún otro clon puede conocer.

El gate compara nombres, nunca valores: no imprime nada de lo que hay a la
derecha del `=`. Una clave comentada en `.env.example` (`# THYROX_X=`) cuenta
como declarada, porque así se documentan las opcionales; una comentada en el
`.env` no cuenta como clave del `.env`.

Sale 0 si todas están declaradas (también sin ningún `.env`: nada que
cubrir), 1 si falta alguna, y 2 sin `.env.example`, sin emitir conteo.

*Métrica:* nombres de clave asignados en `.env` y `.env.local` de la raíz,
contra los nombres asignados, activos o comentados, en `.env.example`.
*Ciega a:* si el significado declarado en el ejemplo corresponde al valor del
`.env`, y a las claves que el código lee sin que ningún `.env` las asigne (eso
lo mide `check_env_contract_keys.py`).
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys

#: Los archivos del consumidor que no viajan con el árbol.
IGNORED_ENV_FILES = ('.env', '.env.local')
ASSIGNMENT = re.compile(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=')
COMMENTED_ASSIGNMENT = re.compile(r'^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=')


def assigned_keys(path: pathlib.Path, include_commented: bool) -> set[str]:
    keys: set[str] = set()
    for line in path.read_text(encoding='utf-8', errors='replace').splitlines():
        match = ASSIGNMENT.match(line) or (include_commented and COMMENTED_ASSIGNMENT.match(line))
        if match:
            keys.add(match.group(1))
    return keys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=os.environ.get('THYROX_ROOT', '.'))
    args = parser.parse_args()
    root = pathlib.Path(args.root)
    example = root / '.env.example'
    if not example.is_file():
        print(f'check_env_example_coverage: REHUSA — no existe {example}; sin él no hay contra qué medir',
              file=sys.stderr)
        return 2
    declared = assigned_keys(example, include_commented=True)
    present = [root / name for name in IGNORED_ENV_FILES if (root / name).is_file()]
    missing: dict[str, list[str]] = {}
    total = 0
    for env_file in present:
        keys = assigned_keys(env_file, include_commented=False)
        total += len(keys)
        for key in sorted(keys - declared):
            missing.setdefault(key, []).append(env_file.name)
    for key, files in sorted(missing.items()):
        print(f'  sin declarar en .env.example: {key} (en {", ".join(files)})')
    print(f'check_env_example_coverage: {len(missing)} clave(s) sin declarar '
          f'(alcance medido: {total} clave(s) en {len(present)} archivo(s) ignorado(s), '
          f'{len(declared)} declarada(s) en .env.example)')
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(main())
