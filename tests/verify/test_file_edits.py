#!/usr/bin/env python3
"""Control de `src/verify/file_edits.py`, que delega en el aplicador de la
herramienta `Edit` (`tool-registry/bin/applyEdits.ts`: `getPatchForEdits`
más las reglas de `validateInput`; porte de `F`/`Q` del binario 2.1.281).

Qué haría fallar a este control:
- reemplazar todas las ocurrencias cuando no se pidió `replace_all`;
- borrar un texto sin comerse el salto de línea que lo sigue;
- aceptar un `old_string` que es parte de un `new_string` anterior;
- dar por aplicada una edición que no encontró su texto;
- crear sobre un archivo con contenido, o editar uno que no existe;
- aceptar un `old_string` ambiguo sin `replace_all`;
- leer un aplicador caído como «sin cambios».
"""
from __future__ import annotations

import os
import sys

from verify import file_edits as fe

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def edit(old: str, new: str, replace_all: bool = False) -> dict:
    return {"old_string": old, "new_string": new, "replace_all": replace_all}


CASES = {
    "first": ("x a a", [edit("x", "y"), edit("a", "b")]),
    "all": ("a a", [edit("a", "b", True)]),
    "delete": ("x\ny\nz\n", [edit("y", "")]),
    "literal": ("aXb", [edit("X", "$&")]),
    "sequence": ("a b\n", [edit("a", "c"), edit("b", "d")]),
    "create": (None, [edit("", "nuevo\n")]),
    "substring": ("a b\n", [edit("a", "b c"), edit("b c", "x")]),
    "missing-later": ("a b\n", [edit("a", "c"), edit("z", "y")]),
    "identical": ("ab", [edit("a", "c"), edit("cb", "ab")]),
    "absent": (None, [edit("a", "b")]),
    "exists": ("a\n", [edit("", "b")]),
    "blank": ("  \n", [edit("", "b")]),
    "same": ("a\n", [edit("a", "a")]),
    "ambiguous": ("a a\n", [edit("a", "b")]),
    "ambiguous-all": ("a a\n", [edit("a", "b", True)]),
    "not-found": ("a\n", [edit("z", "y")]),
}
results = fe.apply_files([{"path": k, "content": c, "edits": e} for k, (c, e) in CASES.items()])


def out(key: str):
    row = results[key]
    return row.get("updatedFile", ("error", row.get("error")))


print("test_file_edits:")
# Sólo la primera edición pasa por la validación; las siguientes van
# directo al aplicador, que reemplaza la primera ocurrencia.
assert_equal("una edición posterior reemplaza sólo la primera ocurrencia", "y b a", out("first"))
assert_equal("replace_all reemplaza todas", "b b", out("all"))
assert_equal("al borrar se come el salto de línea siguiente", "x\nz\n", out("delete"))
assert_equal("el reemplazo es literal", "a$&b", out("literal"))
assert_equal("aplica en secuencia", "c d\n", out("sequence"))
assert_equal("old vacío sobre archivo ausente lo crea", "nuevo\n", out("create"))
assert_equal("rechaza un old que es parte de un new anterior",
             ("error", "Cannot edit file: old_string is a substring of a new_string from a previous edit."),
             out("substring"))
assert_equal("rechaza una edición posterior que no encuentra su texto",
             ("error", "String not found in file. Failed to apply edit."), out("missing-later"))
assert_equal("rechaza un resultado idéntico al original",
             ("error", "Original and edited file match exactly. Failed to apply edit."), out("identical"))
assert_equal("editar un archivo ausente se rechaza", ("error", "File does not exist."), out("absent"))
assert_equal("crear sobre contenido existente se rechaza",
             ("error", "Cannot create new file - file already exists."), out("exists"))
assert_equal("crear sobre un archivo en blanco se admite", "b", out("blank"))
assert_equal("old igual a new se rechaza",
             ("error", "No changes to make: old_string and new_string are exactly the same."), out("same"))
assert_equal("old ambiguo sin replace_all se rechaza",
             ("error", "Found 2 matches of the string to replace, but replace_all is false. To replace all "
                       "occurrences, set replace_all to true. To replace only one occurrence, please provide "
                       "more context to uniquely identify the instance."), out("ambiguous"))
assert_equal("old ambiguo con replace_all se admite", "b b\n", out("ambiguous-all"))
assert_equal("la primera edición que no encuentra su texto se rechaza",
             ("error", "String to replace not found in file."), out("not-found"))

os.environ["THYROX_TOOLCHAIN_BUN_BIN"] = "/nonexistent/bun"
try:
    fe.apply_files([{"path": "a", "content": "a", "edits": [edit("a", "b")]}])
    caught = "sin error"
except (fe.ApplierUnavailable, OSError):
    caught = "rehúsa"
assert_equal("un aplicador que no corre rehúsa, no devuelve vacío", "rehúsa", caught)

print(f"test_file_edits: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
