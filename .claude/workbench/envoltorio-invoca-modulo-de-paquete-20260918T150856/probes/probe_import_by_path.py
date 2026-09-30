#!/usr/bin/env python3
"""Sonda: un entrypoint ``.py``, ¿IMPORTA al invocarse POR RUTA?

Reproduce la semántica de CPython al ejecutar un guion: ``sys.path[0]`` es el
DIRECTORIO del guion. La primera versión de esta sonda no lo hacía y publicaba
**9** rojos donde hay **4** — cuatro de ellos (``census_open_tasks``,
``gitlink_bump``, ``object_footprint``, ``pack_headroom``) importan un hermano
por nombre plano (``import clone``, ``import task_ids``) y resuelven bien por
ruta; sólo fallaban porque la sonda medía otra cosa.

Ese falso rojo no se descarta: es el **control que descarta la forma
universal**. Emitir ``-m`` para los 137 entrypoints rompería exactamente a
esos cuatro, porque ``-m`` sustituye el directorio del guion por el cwd en
``sys.path[0]``.

``runpy.run_path`` fija ``__name__`` a ``'<run_path>'``, así que la guarda de
``__main__`` NO dispara: corre el nivel de módulo (imports, defs) y no
``main()``. Es la conducta que el envoltorio provoca al entrar, sin el trabajo.
"""
import os
import runpy
import sys

target = sys.argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(target)))
sys.argv = [target]
try:
    runpy.run_path(target)
except BaseException as exc:                      # noqa: BLE001
    print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
    raise SystemExit(3)
raise SystemExit(0)
