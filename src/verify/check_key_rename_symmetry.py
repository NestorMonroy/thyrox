#!/usr/bin/env python3
"""La clave de un dict renombrada en un lado y no en el otro (:ref:`h-thyrox-136`).

Un renombre por POSICION DE TOKEN puede alcanzar la lectura de una clave dentro
de una f-string —`r['huerfano']` -> `r['orphan']`— y dejar la clave del dict
literal intacta, porque es un `STRING` fuera de f-string. El archivo parsea, una
poscondicion AST sobre los nombres del plan pasa, y la rama muere con `KeyError`
**solo al ejecutarse**.

El eje que discrimina NO es «lee una clave que este archivo no declara»: eso es
lo corriente —se lee el dict que devuelve otro modulo— y medido sobre los 97
`.py` del barrido daba 103 sospechosos, los 103 falsos. El eje es la
**asimetria contra la version anterior del mismo archivo**:

* una clave que **dejo de leerse** y sigue declarada -> viajo solo el dict;
* una clave que **dejo de declararse** y sigue leyendose -> viajo solo la lectura.

Hubo una TERCERA regla —«una lectura nueva que ningun dict local declara»— y se
**retiro al estrenarla contra el arbol**: marco `test_merge_stores.py` leyendo
`rows_in_source`, que es un renombre CORRECTO y coherente hecho en el productor
y en su test a la vez. Esa regla no puede separar «la lectura viajo sola» de «el
productor renombro y este archivo lo siguio», porque la clave del productor vive
en OTRO archivo — justo la ceguera que este instrumento declara. Las dos que
quedan bastan: el episodio dispara por la primera.

*Metrica:* claves de dict literal y subscripts por cadena constante, por AST.
*Ciega a:* el desajuste entre ARCHIVOS —una clave que un modulo emite y otro
lee—, porque compara cada archivo consigo mismo; y al acceso por variable
(`r[k]`), que no es un subscript por cadena constante.
"""
from __future__ import annotations

import argparse
import ast
import enum
import pathlib
import subprocess
import sys
from dataclasses import dataclass


class Kind(enum.Enum):
    """Las tres formas del desajuste, mas el archivo que no se pudo medir."""

    ONLY_READ_MOVED = "la lectura viajo y la clave del dict no"
    ONLY_DICT_MOVED = "la clave del dict viajo y la lectura no"
    UNPARSEABLE = "no parsea: no se pudo medir"


@dataclass(frozen=True)
class Finding:
    kind: Kind
    key: str
    path: str = ""

    def __str__(self) -> str:
        where = f"{self.path}::" if self.path else ""
        return f"{where}{self.key!r} — {self.kind.value}"


def _keys(text: str) -> tuple[set[str], set[str]] | None:
    """(claves de dict literal, claves leidas por subscript), o None si no parsea."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return None
    declared: set[str] = set()
    read: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            for key in node.keys:
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    declared.add(key.value)
        if (isinstance(node, ast.Subscript)
                and isinstance(node.slice, ast.Constant)
                and isinstance(node.slice.value, str)):
            read.add(node.slice.value)
    return declared, read


def asymmetries(before: str, after: str, path: str = "") -> list[Finding]:
    """Las claves que cambiaron de un lado y no del otro, entre dos versiones."""
    pair_after = _keys(after)
    if pair_after is None:
        return [Finding(Kind.UNPARSEABLE, "<archivo>", path)]
    pair_before = _keys(before)
    if pair_before is None:
        # La version ANTERIOR no parsea: no hay con que comparar. Se declara en
        # vez de devolver [], que se leeria como «no hay desajuste».
        return [Finding(Kind.UNPARSEABLE, "<version anterior>", path)]

    declared_before, read_before = pair_before
    declared_after, read_after = pair_after

    found: list[Finding] = []
    for key in sorted((read_before - read_after) & declared_after):
        found.append(Finding(Kind.ONLY_DICT_MOVED, key, path))
    for key in sorted((declared_before - declared_after) & read_after):
        found.append(Finding(Kind.ONLY_READ_MOVED, key, path))
    return found


def _previous(path: pathlib.Path, root: pathlib.Path, rev: str) -> str | None:
    """El contenido de ``path`` en ``rev``, o None si ahi no existia."""
    rel = path.relative_to(root).as_posix()
    done = subprocess.run(["git", "show", f"{rev}:{rel}"], cwd=root,
                          capture_output=True, text=True, check=False)
    return done.stdout if done.returncode == 0 else None


def sweep(root: pathlib.Path, rev: str = "HEAD") -> tuple[list[Finding], int]:
    """Recorre los ``.py`` con cambio sin commitear y devuelve (hallazgos, medidos)."""
    changed = subprocess.run(["git", "diff", "--name-only", rev], cwd=root,
                             capture_output=True, text=True, check=False).stdout.split()
    found: list[Finding] = []
    measured = 0
    for rel in changed:
        if not rel.endswith(".py"):
            continue
        path = root / rel
        if not path.is_file():
            continue                                   # borrado en el arbol
        before = _previous(path, root, rev)
        if before is None:
            continue                                   # nuevo: no hay anterior
        measured += 1
        found.extend(asymmetries(before, path.read_text(encoding="utf-8"), rel))
    return found, measured


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--rev", default="HEAD",
                        help="version contra la que comparar (por defecto HEAD)")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 si hay algun desajuste")
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    if not (root / ".git").exists():
        # Se REHUSA en vez de publicar 0: sin git no hay version anterior, y un
        # cero ahi no distingue «no hay desajuste» de «no pude medir».
        print(f"ERROR: {root} no es un repo git — no hay version anterior contra "
              "la que comparar. NO se emite conteo.", file=sys.stderr)
        return 2

    found, measured = sweep(root, args.rev)
    for item in found:
        print(f"  {item}")
    print(f"{len(found)} desajuste(s) de clave "
          f"(alcance medido: {measured} archivo(s) .py con cambio contra {args.rev})")
    print("  Ciega a: el desajuste entre ARCHIVOS, y al acceso por variable r[k].")
    return 1 if (found and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main())
