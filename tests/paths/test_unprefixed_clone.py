#!/usr/bin/env python3
"""A consumer clone without the provider's prefix is still a clone.

H-THYROX-176: la clave por clon ``THYROX_WORKBENCH_AI_COURSE_NOTES`` se
ignoraba sin aviso. Dos causas, las dos del proveedor:

1. ``repo_of`` sólo reconocía un clon cuyo nombre empezara por el prefijo
   derivado (``kaupamex-``): para ``ai-course-notes`` devolvía ``None`` y la
   familia por clon nunca se consultaba.
2. ``clone_suffix_of`` tomaba lo que sigue al ÚLTIMO guion: ``NOTES``, no
   ``AI_COURSE_NOTES``.

Y una tercera que el arreglo destapa: las familias resolvían el valor contra
``root(repo)``, que COMPONE ``<prefijo><nombre>`` — una ruta que no existe
para un clon sin prefijo. Se resuelve contra la raíz real del clon.

El prefijo sigue funcionando: ``kaupamex-docs`` da ``docs``.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()

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


base = Path(tempfile.mkdtemp(prefix="unprefixed-clone-")).resolve()
for name in ("kaupamex-docs", "kaupamex-api", "ai-course-notes"):
    (base / name / ".git").mkdir(parents=True)
    (base / name / "sub").mkdir()
env_file = base / "empty.env"
env_file.write_text("")
os.environ["THYROX_ENV_FILE"] = str(env_file)
os.environ["THYROX_REACH_ROOT"] = str(base)
os.environ["THYROX_WORKBENCH_AI_COURSE_NOTES"] = "banco-propio"
os.environ["THYROX_WORKBENCH_DOCS"] = "banco-docs"

from workbench import paths as wb  # noqa: E402

print("\n1. El nombre corto del clon, con y sin prefijo")
check("con prefijo: kaupamex-docs -> docs", "docs",
      reach.clone_short_name(base / "kaupamex-docs" / "sub"))
check("sin prefijo: el nombre entero", "ai-course-notes",
      reach.clone_short_name(base / "ai-course-notes" / "sub"))
check("fuera de todo clon: None", None, reach.clone_short_name(base))
check("repo_of usa el mismo nombre", "ai-course-notes",
      wb.repo_of(base / "ai-course-notes" / "sub"))

print("\n2. El sufijo de la clave por clon es el nombre entero, no el último tramo")
check("ai-course-notes -> AI_COURSE_NOTES", "AI_COURSE_NOTES",
      reach.clone_suffix_of(base / "ai-course-notes"))
check("kaupamex-docs -> DOCS", "DOCS", reach.clone_suffix_of(base / "kaupamex-docs"))

print("\n3. La clave por clon gobierna, y resuelve contra la raíz real del clon")
check("ai-course-notes usa THYROX_WORKBENCH_AI_COURSE_NOTES",
      base / "ai-course-notes" / "banco-propio",
      Path(wb.workbench_dir(base / "ai-course-notes" / "sub")))
check("kaupamex-docs sigue usando THYROX_WORKBENCH_DOCS",
      base / "kaupamex-docs" / "banco-docs",
      Path(wb.workbench_dir(base / "kaupamex-docs" / "sub")))

print(f"\ntest_unprefixed_clone: {PASS} ok, {FAIL} falla(s)")
sys.exit(1 if FAIL else 0)
