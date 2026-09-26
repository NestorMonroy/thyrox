#!/usr/bin/env python3
"""Todo import de terceros de ``src/**/*.py`` está declarado en ``pyproject.toml``.

El manifiesto dice de sí mismo que sus dependencias «se derivan del árbol»,
pero nada lo comprobaba: ``src/corpus/pdf_to_text.py`` importa
``pdfplumber`` como respaldo y no figuraba en ninguna parte, así que el
respaldo sólo existía en la máquina que lo tuviera instalado a mano.

Cuenta como declarado un paquete de ``[project.dependencies]`` o de
cualquier grupo de ``[dependency-groups]`` (los opcionales van en grupo).

Excluidos, con su razón:
- ``src/packages/@ant/``: código vendorizado de otra lengua de trabajo (el
  puente win32 de computer-use), no la mitad Python de thyrox;
- ``hook_error_log``: módulo del consumidor que ``drain_spool.py`` recibe
  por ``sys.path`` y rehúsa con mensaje propio si falta.

Qué haría fallar a este control: un import nuevo de terceros sin declarar,
o quitar del manifiesto uno que el árbol usa.
"""
from __future__ import annotations

import ast
import pathlib
import re
import sys
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
VENDORED = SRC / "packages" / "@ant"
INJECTED = {"hook_error_log"}
#: Nombre de import → nombre de distribución, cuando difieren.
DISTRIBUTION = {"spacy_lookups_data": "spacy-lookups-data", "PIL": "pillow"}


def normalized(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def declared(pyproject: dict) -> set[str]:
    specs = list(pyproject.get("project", {}).get("dependencies", []))
    for group in pyproject.get("dependency-groups", {}).values():
        specs += [s for s in group if isinstance(s, str)]
    return {normalized(re.split(r"[<>=!~;\[ ]", s, maxsplit=1)[0]) for s in specs}


def third_party_imports() -> dict[str, str]:
    files = [p for p in SRC.rglob("*.py") if VENDORED not in p.parents and "__pycache__" not in p.parts]
    local = {p.stem for p in files} | {p.name for p in SRC.iterdir() if p.is_dir()}
    found: dict[str, str] = {}
    for path in files:
        for node in ast.walk(ast.parse(path.read_text(), str(path))):
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                names = [node.module]
            else:
                continue
            for name in names:
                top = name.split(".")[0]
                if top in sys.stdlib_module_names or top in local or top in INJECTED or top == "__future__":
                    continue
                found.setdefault(top, str(path.relative_to(ROOT)))
    return found


def main() -> int:
    manifest = declared(tomllib.loads((ROOT / "pyproject.toml").read_text()))
    imports = third_party_imports()
    missing = {name: where for name, where in imports.items()
               if normalized(DISTRIBUTION.get(name, name)) not in manifest}
    for name, where in sorted(missing.items()):
        print(f"  FALLA {name} se importa en {where} y no está en pyproject.toml")
    print(f"test_pyproject_declares_imports: {len(imports)} import(s) de terceros, "
          f"{len(missing)} sin declarar (alcance medido: src/**/*.py fuera de {VENDORED.relative_to(ROOT)})")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
