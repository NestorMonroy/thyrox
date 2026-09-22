#!/usr/bin/env python3
"""Control de `src/testing/clone_tree.py` — un arbol de varios clones real.

Por que existe: 28 suites Python fallaban con `ReachRootError` porque
componian rutas de `api` o `docs` con el roster DEL HOST, y un host con un
solo consumidor no tiene mayoria de prefijo (H-THYROX-155). Declarar
`THYROX_REACH_ROOTS` a mano en cada suite saltaria la derivacion que esas
suites deberian ejercer; la fixture construye los directorios y deja que la
derivacion corra.

Que haria fallar a este control:
- que la fixture DECLARE el roster en vez de construir el arbol: cae el caso
  de un solo clon, que debe seguir rehusando por la regla de mayoria;
- que no restaure el entorno: cae el caso de restauracion.
"""
from __future__ import annotations

import os
import sys

from paths import reach
from testing.clone_tree import synthetic_clone_tree

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_clone_tree:")
before = {k: v for k, v in os.environ.items() if k.startswith("THYROX_")}

with synthetic_clone_tree(("api", "docs", "ui")) as tree:
    assert_equal("el roster se DERIVA de los clones construidos", ("api", "docs", "ui"),
                 reach.reach_roots())
    assert_equal("root compone la ruta del clon dentro del arbol",
                 tree.base / "kaupamex-api", reach.root("api"))
    assert_equal("los clones existen en disco", True, (tree.base / "kaupamex-docs").is_dir())
    assert_equal("el proveedor lleva el marcador del ascenso", True,
                 (tree.provider / "src" / "paths" / "reach.py").is_file())
    assert_equal("sin roster declarado: la derivacion es la que responde", None,
                 os.environ.get("THYROX_REACH_ROOTS"))

with synthetic_clone_tree(("docs",)):
    try:
        reach.reach_roots()
        assert_equal("un solo clon sigue rehusando por mayoria", "ReachRootError", "sin error")
    except reach.ReachRootError:
        assert_equal("un solo clon sigue rehusando por mayoria", "ReachRootError", "ReachRootError")

after = {k: v for k, v in os.environ.items() if k.startswith("THYROX_")}
assert_equal("el entorno THYROX_* se restaura al salir", before, after)

print(f"test_clone_tree: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
