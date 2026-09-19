#!/usr/bin/env python3
"""Suite de ``corpus/census_scripts.py`` — el censo ve el fondo REORGANIZADO.

Origen: H-DOCS-1020. La mudanza ``d566c180`` agrupó el fondo por clase
(``gates/ session/ agents/ task/ corpus/ graph/``) y el censo siguió leyendo
a profundidad 1: publicaba 21 guiones donde el árbol tiene más de cien, y su
``--huerfanos`` daba «0 en baseline» porque ``BASELINE`` apuntaba a la ruta
anterior a la mudanza. Dos verdes que medían el universo equivocado.

Los casos corren sobre un repo git SINTÉTICO —el censo cita con ``git grep``—
y el control positivo del baseline se mide contra el repo REAL, porque ahí es
donde el archivo tiene que existir.
"""
from __future__ import annotations

import importlib.util
import os
import pathlib
from pathlib import Path
import subprocess
import sys
import tempfile

# El bootstrap CANONICO de thyrox (`paths.reach.BOOTSTRAP`): ascenso con
# deteccion del marcador, no `parents[N]`. La aritmetica por offset acierta a
# UNA profundidad y falla en SILENCIO al mover el archivo un nivel.
_HERE = Path(__file__).resolve()
_ROOT = next((p for p in _HERE.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_HERE}")
sys.path.insert(0, str(_ROOT / "src"))

from paths import reach  # noqa: E402

HERE = reach.thyrox_root() / "src"

#: El consumidor cuyo corpus mide esta suite, NOMBRADO.
#:
#: `censar.ROOT` cuelga de `reach.consumer_root()`, que pregunta «el consumidor
#: dentro del que estoy». Corriendo desde el PROVEEDOR no hay ninguno, y el
#: localizador rehusa con `ConsumerUnknownError` en vez de componer un hogar
#: dentro de thyrox — conducta correcta suya, no defecto.
#:
#: El defecto era de la suite: dejaba propagar ese rehuse como traza y moria en
#: rojo. Y el rojo no decia nada del sujeto, porque el sujeto ni se habia
#: mirado. Rehusar con exit 2 tampoco habria servido: seria FALSO, porque esta
#: suite SI sabe de que consumidor habla. Es la tercera vez en el mismo pase
#: que aparece esa forma — ver :ref:`h-thyrox-45`.
CONSUMER = reach.root('docs')

# Y se DECLARA para el proceso, no solo para una de las tres constantes.
#
# `censar` difiere ROOT, CATALOGUE y BASELINE por PEP 562, y cada una llama a
# `consumer_root()` por su cuenta: fijar `censar.ROOT` a mano deja a las otras
# dos rehusando igual. La declaracion es la via que el propio localizador
# nombra en su mensaje de rehuse, y es de PROCESO, asi que alcanza a las tres
# sin que la suite tenga que conocer cuantas son.
#
# Declararlo aqui NO decide el cableado del consumidor (DEC-04): esto vale solo
# dentro de este proceso de prueba, que es quien sabe de que corpus habla.
os.environ.setdefault('THYROX_CONSUMER', str(CONSUMER))
spec = importlib.util.spec_from_file_location("censar", HERE / "corpus" / "census_scripts.py")
censar = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(censar)

PASS = 0
FAIL = 0


def check(condition: bool, label: str, detail: str = "") -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ok   {label}")
    else:
        FAIL += 1
        print(f"  FAIL {label}" + (f"\n       {detail}" if detail else ""))


def synthetic_repo() -> pathlib.Path:
    """Un repo con el fondo ya agrupado por clase, más las tres carpetas que quedan fuera."""
    root = pathlib.Path(tempfile.mkdtemp(prefix="censo-"))
    files = {
        ".claude/scripts/root_tool.sh": "#!/bin/bash\n",
        ".claude/scripts/gates/check_something.py": "print(1)\n",
        ".claude/scripts/agents/nested/deep_tool.py": "print(2)\n",
        ".claude/scripts/tests/test-something.sh": "#!/bin/bash\n",
        ".claude/scripts/docs/note.py": "print(3)\n",
        ".claude/scripts/__pycache__/cached.py": "\n",
        "scripts/build.sh": "#!/bin/bash\n",
        "scripts/utils/logging.sh": "#!/bin/bash\n",
        "source/a.rst": "cita ``check_something.py`` y ``logging.sh``\n",
    }
    for rel, body in files.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body)
    env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "seed"], cwd=root, env=env, check=True)
    return root


print("== census_scripts.py — descubrimiento sobre el fondo agrupado por clase ==")
repo = synthetic_repo()
real_root_dir = censar.root_dir
censar.root_dir = lambda: repo
try:
    paths = {r["path"] for r in censar.survey()}
finally:
    censar.root_dir = real_root_dir

check(".claude/scripts/gates/check_something.py" in paths,
      "ve un guion en una subcarpeta de clase (gates/)", f"paths={sorted(paths)}")
check(".claude/scripts/agents/nested/deep_tool.py" in paths,
      "recurre más de un nivel (agents/nested/)")
check(".claude/scripts/root_tool.sh" in paths,
      "sigue viendo la raíz de .claude/scripts")
check("scripts/utils/logging.sh" in paths,
      "recurre también bajo scripts/ (producto)")
check(not any("/tests/" in p for p in paths),
      "CONTROL — tests/ queda fuera del universo, como declara su Ciega a")
check(not any("/docs/" in p for p in paths),
      "CONTROL — docs/ queda fuera del universo, como declara su Ciega a")
check(not any("__pycache__" in p for p in paths),
      "CONTROL — __pycache__ nunca es un guion")

print("== la clase se deriva del citante también con la ruta anidada ==")
censar.root_dir = lambda: repo
try:
    rows = {r["path"]: r for r in censar.survey()}
finally:
    censar.root_dir = real_root_dir
check(rows.get(".claude/scripts/gates/check_something.py", {}).get("class") == "gate-de-reporte",
      "gates/check_something.py citado desde docs → gate-de-reporte",
      f"class={rows.get('.claude/scripts/gates/check_something.py', {}).get('class')}")
check(rows.get(".claude/scripts/agents/nested/deep_tool.py", {}).get("class") == "huerfano",
      "deep_tool.py sin citante → huerfano (el instrumento sí puede fallar)")

print("== el baseline de huérfanos apunta a un archivo que EXISTE en el repo real ==")
check(censar.BASELINE.exists(),
      f"BASELINE existe: {censar.BASELINE.relative_to(CONSUMER)}",
      "el generador declara una ruta anterior a la mudanza; --huerfanos lee 0 en baseline")

print(f"\nresultado: {PASS} ok, {FAIL} fallas")
sys.exit(1 if FAIL else 0)
