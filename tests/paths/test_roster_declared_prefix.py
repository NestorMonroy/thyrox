#!/usr/bin/env python3
"""El roster usa el prefijo DECLARADO antes que la mayoria de hermanos.

`derive_clone_prefix` exige que dos hermanos compartan prefijo, porque un solo
directorio con guion no es un patron. Pero `derive_reach_roots` aplicaba esa
regla aunque `THYROX_CLONE_PREFIX` estuviera declarada: un host con un solo
consumidor y el prefijo declarado seguia sin roster (H-THYROX-155). Declarado
el prefijo, la ambiguedad que la mayoria protege ya no existe.

Que haria fallar a este control: volver a derivar el roster solo por mayoria.
Caen el caso de un clon y el de la mayoria ajena; el control sin declaracion
no cae, porque la regla de mayoria sigue siendo la del caso no declarado.
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


def roster_or_error() -> object:
    try:
        return reach.reach_roots()
    except reach.ReachRootError:
        return "ReachRootError"


print("test_roster_declared_prefix:")

with synthetic_clone_tree(("docs",)):
    os.environ["THYROX_CLONE_PREFIX"] = "kaupamex-"
    assert_equal("un clon con el prefijo declarado forma el roster", ("docs",), roster_or_error())

with synthetic_clone_tree(("api", "docs")) as tree:
    for name in ("foo-a", "foo-b", "foo-c"):
        (tree.base / name).mkdir()
    os.environ["THYROX_CLONE_PREFIX"] = "kaupamex-"
    assert_equal("el prefijo declarado gana a una mayoria ajena", ("api", "docs"),
                 roster_or_error())

with synthetic_clone_tree(("docs",)):
    assert_equal("sin declaracion, un clon sigue rehusando", "ReachRootError", roster_or_error())

# La raiz de los clones DECLARADA (`THYROX_REACH_ROOT`) es la base de la
# derivacion, no el padre del proveedor. Antes eran dos bases: las rutas se
# componian bajo la declarada y el roster se derivaba del padre del proveedor.
with synthetic_clone_tree(("api", "docs")) as tree:
    elsewhere = tree.base / "elsewhere" / "thyrox"
    (elsewhere / "src" / "paths").mkdir(parents=True)
    (elsewhere / "src" / "paths" / "reach.py").write_text("")
    os.environ["THYROX_ROOT"] = str(elsewhere)          # proveedor sin hermanos
    assert_equal("el roster se deriva bajo la raiz declarada", ("api", "docs"),
                 roster_or_error())

print(f"test_roster_declared_prefix: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
