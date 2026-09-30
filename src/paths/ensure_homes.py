#!/usr/bin/env python3
"""Crea los hogares registrados de un clon: Empaquetado P11.

Un ``git clone`` no trae lo que git ignora (``.claude/jobs-ledger``,
``.thyrox/runtime``, ``.thyrox/pool-worktrees``), y cada módulo creaba su
hogar en su primer uso: quien clonaba lo «descubría», y lo que asumía que ya
existía fallaba. Este guion resuelve cada hogar de ``declarations.HOMES`` —su
declaración si la hay, su default si no— y crea el directorio que falte con
``reach.ensure_home``. De un hogar que es archivo (un registro, una base) sólo
asegura el directorio padre: el archivo lo escribe su dueño.

Imprime una línea por hogar —``creado``, ``existía`` o ``declarado fuera del
árbol``— y es idempotente: la segunda corrida no cambia nada y lo dice. Una
declaración fuera del clon no se crea: es un sitio que el consumidor eligió y
gobierna. Si alguna declaración apunta a un sitio no escribible, rehúsa con
exit 2 nombrando la clave ANTES de crear nada.

    bash bin/ensure_homes

Métrica: existencia de cada hogar registrado tras correr.
Ciega a: la familia por clon (``THYROX_JOBS_<CLONE>``): se lee sólo la clave
global del registro; y a los hogares que un módulo compone sin clave.
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from paths import declarations, reach
from workbench import paths as workbench

EXIT_OK = 0
EXIT_REFUSED = 2

CREATED = "creado"
EXISTED = "existía"
OUTSIDE = "declarado fuera del árbol"


@dataclass(frozen=True)
class Target:
    """El directorio que un hogar registrado exige, ya resuelto."""

    key: str
    directory: Path


def resolve_directory(home: declarations.Home, root: Path, state: str) -> Path:
    """La declaración del clon gana al default; de un archivo, su padre."""
    declared = reach.env_value(home.key, root)
    path = reach.resolve_home(declared, root) if declared else home.default_under(root, state)
    return path.parent if home.is_file else path


def is_inside(path: Path, root: Path) -> bool:
    return path.resolve().is_relative_to(root.resolve())


def nearest_existing(path: Path) -> Path:
    return next(level for level in (path, *path.parents) if level.exists())


def is_writable(directory: Path) -> bool:
    """Se puede crear o usar: el primer ancestro existente es un directorio abierto."""
    anchor = nearest_existing(directory)
    return anchor.is_dir() and os.access(anchor, os.W_OK | os.X_OK)


def ensure(directory: Path) -> str:
    if directory.is_dir():
        return EXISTED
    reach.ensure_home(directory)
    directory.chmod(declarations.HOME_MODE)
    return CREATED


def apply(target: Target, root: Path) -> str:
    if not is_inside(target.directory, root):
        return OUTSIDE
    return ensure(target.directory)


def refuse(unwritable: list[Target]) -> int:
    for target in unwritable:
        print(f"ensure_homes: {target.key} apunta a un sitio no escribible: "
              f"{target.directory}. Corrige su declaración en el .env del clon.",
              file=sys.stderr)
    return EXIT_REFUSED


def report(outcomes: list[str]) -> None:
    created = outcomes.count(CREATED)
    if created:
        print(f"\n{created} hogar(es) creado(s) de {len(outcomes)}.")
    else:
        print(f"\nnada que crear: los {len(outcomes)} hogares ya estaban.")


def main() -> int:
    try:
        root = reach.thyrox_root()
    except reach.ReachRootError as error:
        print(f"ensure_homes: {error}", file=sys.stderr)
        return EXIT_REFUSED
    state = workbench.state_dir(root)
    targets = [Target(home.key, resolve_directory(home, root, state))
               for home in declarations.HOMES]
    unwritable = [target for target in targets if not is_writable(target.directory)]
    if unwritable:
        return refuse(unwritable)
    outcomes = []
    for target in targets:
        outcome = apply(target, root)
        outcomes.append(outcome)
        print(f"{outcome}  {target.key}  {target.directory}")
    report(outcomes)
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
