#!/usr/bin/env python3
"""Cerrar la superficie de un paquete: del comodín ``./*`` a claves explícitas.

El fenómeno, medido
-------------------

Los 42 paquetes de ``src/packages`` declaran ``exports``, pero 28 incluyen el
comodín ``./*`` / ``./*.js``, que publica el árbol ENTERO del paquete. Con él,
cualquier ruta interna nueva resuelve sin tocar el manifiesto, así que la
frontera existe en el archivo y no en el resolutor. Medido sobre 7 754
importaciones por nombre fuera de los tests: 3 544 (46 %) sólo entran por el
comodín (``.claude/workbench/frontera-publica-de-paquetes-*``).

Qué hace
--------

Por cada paquete con comodín, toma las subrutas que el árbol CONSUME —import
estático, ``export … from``, ``import()`` dinámico, ``require`` y
``mock.module``— y declara cada una como clave explícita, sustituyendo en el
patrón del propio comodín. Es el algoritmo de resolución de Node
(``PACKAGE_EXPORTS_RESOLVE``: gana la clave de prefijo más largo, y a igual
prefijo la más larga), así que **el archivo al que resuelve cada subruta no
cambia**. Después retira el comodín. Desde ahí, una ruta interna nueva la
rechaza el resolutor, y ampliar la superficie es un diff del ``package.json``.

Una subruta consumida cuyo destino no existe NO se declara: hoy ya no resuelve,
y publicarla escribiría una clave rota. Se reporta.

Lo que NO decide
----------------

**Si la superficie que queda es la correcta.** Enumera lo que se consume hoy;
acotarla hacia la puerta ``.`` es otra decisión, por paquete. Un cierre que
sólo congela no encapsula nada nuevo: impide que crezca sin que se vea.

*Métrica:* especificadores literales ``<paquete>/<subruta>`` en los archivos de
código de las raíces escaneadas.
*Ciega a:* un especificador compuesto en tiempo de ejecución, y a un consumidor
fuera de las raíces escaneadas — su ruta dejaría de resolver al cerrar.

Uso::

    python3 src/typescript/close_exports.py src/packages --scan src tests   # plan
    python3 src/typescript/close_exports.py src/packages --scan src tests --write
    python3 src/typescript/close_exports.py src/packages --check            # exit 1 si queda comodín
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

CODE_SUFFIXES = (".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".jsx")
SKIP_DIRS = frozenset({"node_modules", ".git", "dist", "build", "__pycache__"})

#: ``from '…'``, ``import('…')``, ``import '…'``, ``require('…')`` y ``mock.module('…')``.
SPECIFIER = re.compile(
    r"""(?:\bfrom|\bimport|\brequire|\bmock\.module)\s*\(?\s*['"]([^'"\s]+)['"]"""
)


@dataclass
class Plan:
    exports: dict
    added: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    changed: bool = False


def packages(root: Path) -> dict[str, Path]:
    """Nombre → directorio, para todo ``package.json`` con ``name`` bajo la raíz."""
    found: dict[str, Path] = {}
    for manifest in sorted(root.rglob("package.json")):
        if any(part in SKIP_DIRS for part in manifest.relative_to(root).parts):
            continue
        name = json.loads(manifest.read_text()).get("name")
        if name:
            found[name] = manifest.parent
    return found


def code_files(scan: list[Path]):
    for base in scan:
        if base.is_file():
            yield base
            continue
        for path in base.rglob("*"):
            if path.suffix in CODE_SUFFIXES and path.is_file() and not any(
                part in SKIP_DIRS for part in path.relative_to(base).parts
            ):
                yield path


def split_specifier(spec: str, names: set[str]) -> tuple[str, str] | None:
    """``@x/y/a/b.js`` → (``@x/y``, ``./a/b.js``) si ``@x/y`` es un paquete conocido."""
    parts = spec.split("/")
    name = "/".join(parts[:2]) if spec.startswith("@") else parts[0]
    rest = parts[2:] if spec.startswith("@") else parts[1:]
    if name not in names or not rest:
        return None
    return name, "./" + "/".join(rest)


def consumed_subpaths(scan: list[Path], names: set[str]) -> dict[str, set[str]]:
    consumed: dict[str, set[str]] = {}
    for path in code_files(scan):
        try:
            text = path.read_text(errors="ignore")
        except OSError:
            continue
        for spec in SPECIFIER.findall(text):
            hit = split_specifier(spec, names)
            if hit:
                consumed.setdefault(hit[0], set()).add(hit[1])
    return consumed


def pattern_key_compare(a: str, b: str) -> int:
    """El orden de Node entre claves con ``*``: prefijo más largo, luego clave más larga."""
    pa, pb = a.index("*") + 1, b.index("*") + 1
    if pa != pb:
        return -1 if pa > pb else 1
    if len(a) != len(b):
        return -1 if len(a) > len(b) else 1
    return 0


def match_pattern(key: str, subpath: str) -> str | None:
    """El texto que ``*`` captura si ``subpath`` casa con ``key``; ``None`` si no."""
    prefix, _, suffix = key.partition("*")
    if subpath.startswith(prefix) and subpath.endswith(suffix) and len(subpath) >= len(prefix) + len(suffix):
        return subpath[len(prefix): len(subpath) - len(suffix)] if suffix else subpath[len(prefix):]
    return None


def substitute(target, star: str):
    if isinstance(target, str):
        return target.replace("*", star)
    if isinstance(target, dict):
        return {k: substitute(v, star) for k, v in target.items()}
    if isinstance(target, list):
        return [substitute(v, star) for v in target]
    return target


def runtime_target(target) -> str | None:
    """La ruta que resuelve en ejecución: ``default``, o el primer string del objeto."""
    if isinstance(target, str):
        return target
    if isinstance(target, dict):
        for key in ("default", "import", "require", "bun"):
            if key in target:
                return runtime_target(target[key])
        for value in target.values():
            found = runtime_target(value)
            if found:
                return found
    return None


def plan_package(package_dir: Path, consumed: set[str]) -> Plan:
    manifest = json.loads((package_dir / "package.json").read_text())
    exports = manifest.get("exports")
    if not isinstance(exports, dict):
        return Plan(exports=exports or {})
    wildcards = sorted((k for k in exports if "*" in k), key=_cmp_key())
    if not wildcards:
        return Plan(exports=exports)
    closed = {k: v for k, v in exports.items() if "*" not in k}
    plan = Plan(exports=closed, changed=True)
    for subpath in sorted(consumed):
        if subpath in closed:
            continue
        for key in wildcards:
            star = match_pattern(key, subpath)
            if star is None:
                continue
            target = substitute(exports[key], star)
            runtime = runtime_target(target)
            if runtime and (package_dir / runtime).is_file():
                closed[subpath] = target
                plan.added.append(subpath)
            else:
                plan.missing.append(subpath)
            break
    return plan


def _cmp_key():
    from functools import cmp_to_key
    return cmp_to_key(pattern_key_compare)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("root", type=Path, help="la raíz de paquetes")
    parser.add_argument("--scan", type=Path, nargs="+", help="raíces de consumidores (por defecto, la raíz)")
    parser.add_argument("--write", action="store_true", help="escribe los manifiestos")
    parser.add_argument("--check", action="store_true", help="exit 1 si algún paquete conserva comodín")
    args = parser.parse_args(argv)

    if not args.root.is_dir():
        print(f"close-exports: la raíz {args.root} no existe — sin veredicto", file=sys.stderr)
        return 2
    found = packages(args.root)
    if not found:
        print(f"close-exports: {args.root} no contiene paquetes — sin veredicto", file=sys.stderr)
        return 2

    if args.check:
        open_ = [n for n, d in found.items()
                 if any("*" in k for k in (json.loads((d / "package.json").read_text()).get("exports") or {}))]
        print(f"close-exports: {len(open_)} paquete(s) con comodín (alcance medido: {len(found)} paquete(s))")
        for name in open_:
            print(f"  {name}")
        return 1 if open_ else 0

    consumed = consumed_subpaths(args.scan or [args.root], set(found))
    total_added = total_missing = changed = 0
    for name, directory in found.items():
        plan = plan_package(directory, consumed.get(name, set()))
        if not plan.changed:
            continue
        changed += 1
        total_added += len(plan.added)
        total_missing += len(plan.missing)
        print(f"{name}: +{len(plan.added)} clave(s) explícita(s); {len(plan.missing)} sin destino")
        for subpath in plan.missing:
            print(f"  sin destino: {subpath}")
        if args.write:
            manifest_path = directory / "package.json"
            manifest = json.loads(manifest_path.read_text())
            manifest["exports"] = plan.exports
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    verb = "cerrados" if args.write else "a cerrar"
    print(f"close-exports: {changed} paquete(s) {verb}; {total_added} clave(s) explícita(s); "
          f"{total_missing} subruta(s) sin destino (alcance medido: {len(found)} paquete(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
