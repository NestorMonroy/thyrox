#!/usr/bin/env python3
"""Hablar con un clon de git: saber si lo es, y correrle un comando.

Es la capa de la que dependen los demas modulos de ``src/repo``. Hace una
cosa —**deteccion y ejecucion**— y no sabe nada de huellas, gitlinks ni
repacks: la dependencia apunta hacia adentro, no al reves.

Su razon de existir es que cada consumidor traia su propia copia de estas dos
funciones. Dos copias de la misma decision divergen; una sola no puede.
"""
from __future__ import annotations

import pathlib
import subprocess

#: Todo lo que impide que git responda. Se nombra para poder atraparlo igual
#: en los tres consumidores, en vez de que cada uno recuerde su propia lista.
GIT_SILENCE = (subprocess.CalledProcessError, FileNotFoundError,
               NotADirectoryError, PermissionError)


def run(root: pathlib.Path, *args: str, stdin: str | None = None) -> str | None:
    """La salida del comando, o ``None`` si git no pudo responder."""
    try:
        done = subprocess.run(["git", *args], cwd=root, input=stdin,
                              capture_output=True, text=True, check=True)
    except GIT_SILENCE:
        return None
    return done.stdout


def is_clone(root: pathlib.Path) -> bool:
    """¿Es `root` un clon de git? Sin efectos: solo pregunta."""
    return run(root, "rev-parse", "--git-dir") is not None


def git_dir(root: pathlib.Path) -> pathlib.Path | None:
    """El `.git` real del clon, resuelto (sirve para worktrees y submodulos)."""
    found = run(root, "rev-parse", "--absolute-git-dir")
    return pathlib.Path(found.strip()) if found else None
