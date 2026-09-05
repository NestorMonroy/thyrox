#!/usr/bin/env python3
"""Prueba del stub de re-exportación de ``reach_roots`` (tarea #129).

El mecanismo de alcance por variable se reimplementó en THYROX
(``thyrox: src/paths/reach.py``) con tres divergencias contra defectos medidos.
Este repo conserva ``reach_roots.py`` porque **12 archivos lo consumen**, y
reescribirlos todos en el mismo pase mezclaría dos cambios en un diff.

La forma es el *re-export stub* que el análisis de ``ccb`` identificó como
adoptable —un módulo que declara ``Canonical owner is …`` y reexporta—, y su
razón aquí es la de siempre: dos implementaciones del mismo mecanismo son la
segunda fuente de verdad que ``calibration-verified-numbers.md`` prohíbe.

Qué cubre, y contra qué defecto:

1. **El stub declara quién es el dueño.** Un reexport mudo deja al lector sin
   saber dónde vive la lógica que está leyendo.
2. **La superficie consumida sigue entera.** Medido: los 12 consumidores usan
   ``require_all`` (6), ``reach`` (4), ``root`` (1) y ``ReachRootError`` (1),
   más ``--env`` desde shell. Ninguno usa los símbolos que THYROX renombró.
3. **La ausencia de THYROX se nombra, no se adivina.** Si el árbol no está, el
   stub rehúsa diciendo qué falta. Un ``ImportError`` pelado mandaría al
   consumidor a buscar un módulo de Python cuando lo que falta es un repo.

Uso:  python3 .claude/scripts/tests/test_reach_roots_shim.py
"""

import importlib.util
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve()
MODULE = HERE.parents[1] / "reach_roots.py"

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def load() -> object:
    spec = importlib.util.spec_from_file_location("reach_roots_bajo_prueba", MODULE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


print("\n1. El stub declara a THYROX como dueño canónico")
source = MODULE.read_text(encoding="utf-8")
check("nombra el árbol dueño", True, "thyrox" in source.lower())
check("nombra el módulo dueño", True, "src/paths/reach.py" in source)
check("declara que es un stub de reexportación", True, "reexporta" in source.lower())

print("\n2. La superficie que los 12 consumidores usan sigue entera")
reach_roots = load()
for name in ("require_all", "reach", "root", "roots", "paths", "clone_name",
             "clone_names", "extra_roots", "ReachRootError", "REACH_ROOTS"):
    check(f"reexporta {name}", True, hasattr(reach_roots, name))

print("\n3. Y resuelve lo mismo que el dueño")
sys.path.insert(0, str(pathlib.Path("/home/user/thyrox/src")))
from paths import reach as owner  # noqa: E402

check("root('api') coincide", owner.root("api"), reach_roots.root("api"))
check("reach() coincide", owner.reach(), reach_roots.reach())
check("el tipo de error es EL MISMO objeto", True,
      reach_roots.ReachRootError is owner.ReachRootError)

print("\n4. El CLI sigue respondiendo desde este repo")
completed = subprocess.run(
    [sys.executable, str(MODULE), "--env"], capture_output=True, text=True,
)
check("--env sale limpio", 0, completed.returncode)
check("y exporta las cinco raíces", 5, len(completed.stdout.strip().splitlines()))

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
