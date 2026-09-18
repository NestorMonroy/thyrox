#!/usr/bin/env python3
"""Copia los nueve paquetes que faltan de ccnmt y reescribe su alcance a @thyrox.

Directiva del ejecutor 2026-09-18. La fuente es SOLO LECTURA: este guion abre
sus archivos en modo lectura y escribe unicamente bajo ``src/packages`` del
proveedor.

El aplanamiento es deliberado: ``packages/@ant/ink`` aterriza en
``src/packages/ink``, porque el alcance pasa a ser ``@thyrox`` y el arbol de
destino ya nombra cada workspace por su directorio llano
(``@thyrox/agent`` == ``src/packages/agent``). Conservar ``@ant/`` como
directorio dejaria un segmento que ningun nombre de paquete menciona.

El mapa de alcance sale de un censo sobre los 991 archivos de la fuente, no de
memoria: ``@anthropic/ink`` 609 hits, ``@claude-code-how-works/*`` sobre
veintitres hermanos que ya existen en el destino, y siete nombres llanos de
paquete nativo.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import shutil
import sys

SOURCE_ROOT = pathlib.Path("/home/user/claude-code-nestor-monroy-tools/packages")
TARGET_ROOT = pathlib.Path(__file__).resolve().parents[3] / "src" / "packages"

#: origen relativo a ``SOURCE_ROOT`` -> nombre llano del workspace de destino.
PACKAGE_MAP = {
    "@ant/ink": "ink",
    "@ant/claude-for-chrome-mcp": "claude-for-chrome-mcp",
    "@ant/computer-use-input": "computer-use-input",
    "@ant/computer-use-mcp": "computer-use-mcp",
    "@ant/computer-use-swift": "computer-use-swift",
    "audio-capture-napi": "audio-capture-napi",
    "color-diff-napi": "color-diff-napi",
    "image-processor-napi": "image-processor-napi",
    "modifiers-napi": "modifiers-napi",
    "ripgrep-napi": "ripgrep-napi",
    "stdin-napi": "stdin-napi",
    "url-handler-napi": "url-handler-napi",
    "repl": "repl",
}

#: Los nombres llanos de paquete nativo que la fuente importa sin alcance.
NATIVE_PACKAGES = [
    "audio-capture-napi", "color-diff-napi", "image-processor-napi",
    "modifiers-napi", "ripgrep-napi", "stdin-napi", "url-handler-napi",
]

SKIP_DIRS = {"node_modules", "target", ".git", "dist", "__pycache__"}

#: Extensiones cuyo contenido lleva especificadores de import.
CODE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".json"}


def scope_rewrites() -> list[tuple[re.Pattern[str], str]]:
    """Las reglas de reescritura, de la mas especifica a la mas general."""
    rules: list[tuple[re.Pattern[str], str]] = [
        (re.compile(r"@anthropic/ink\b"), "@thyrox/ink"),
        (re.compile(r"@claude-code-how-works/"), "@thyrox/"),
        (re.compile(r"@ant/"), "@thyrox/"),
    ]
    # Un nombre llano solo se reescribe cuando es el especificador entero o su
    # prefijo de subpath, entre comillas — nunca dentro de prosa ni de una ruta
    # relativa, donde el mismo literal nombra un directorio y no un paquete.
    for name in NATIVE_PACKAGES:
        rules.append((
            re.compile(r"(?P<q>['\"])" + re.escape(name) + r"(?P<rest>(?:/[^'\"]*)?)(?P=q)"),
            r"\g<q>@thyrox/" + name + r"\g<rest>\g<q>",
        ))
    return rules


def rewrite(text: str, rules: list[tuple[re.Pattern[str], str]]) -> tuple[str, int]:
    """Aplica las reglas y devuelve el texto nuevo con el numero de cambios."""
    changes = 0
    for pattern, replacement in rules:
        text, hits = pattern.subn(replacement, text)
        changes += hits
    return text, changes


def copy_package(source: pathlib.Path, target: pathlib.Path,
                 rules: list[tuple[re.Pattern[str], str]]) -> dict[str, int]:
    """Copia un arbol y reescribe el alcance en los archivos de codigo."""
    stats = {"files": 0, "rewritten": 0, "changes": 0, "binary": 0}
    for entry in sorted(source.rglob("*")):
        if any(part in SKIP_DIRS for part in entry.relative_to(source).parts):
            continue
        destination = target / entry.relative_to(source)
        if entry.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        stats["files"] += 1
        if entry.suffix in CODE_SUFFIXES:
            original = entry.read_text(encoding="utf-8", errors="surrogateescape")
            ported, changes = rewrite(original, rules)
            destination.write_text(ported, encoding="utf-8", errors="surrogateescape")
            if changes:
                stats["rewritten"] += 1
                stats["changes"] += changes
        else:
            shutil.copy2(entry, destination)
            stats["binary"] += 1
    return stats


def rename_manifest(target: pathlib.Path, workspace: str) -> str:
    """Fija ``name`` a ``@thyrox/<workspace>`` y devuelve el nombre anterior."""
    manifest = target / "package.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    previous = data.get("name", "(sin name)")
    data["name"] = f"@thyrox/{workspace}"
    data["private"] = True
    manifest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    return previous


def register_workspaces(names: list[str]) -> int:
    """Añade los workspaces nuevos al manifiesto raiz, en orden alfabetico."""
    manifest = TARGET_ROOT / "package.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    before = set(data.get("workspaces", []))
    data["workspaces"] = sorted(before | set(names))
    manifest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    return len(set(names) - before)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", action="append", default=[],
                        help="portar solo estos workspaces (repetible)")
    parser.add_argument("--dry-run", action="store_true",
                        help="mide sin escribir un solo byte")
    args = parser.parse_args(argv)

    if not SOURCE_ROOT.is_dir():
        print(f"port_packages: no existe {SOURCE_ROOT}. NO se emite conteo: un "
              "0 aqui no distinguiria «nada que portar» de «no pude medir».",
              file=sys.stderr)
        return 2

    rules = scope_rewrites()
    selected = {s: t for s, t in PACKAGE_MAP.items()
                if not args.only or t in args.only}
    if not selected:
        print(f"port_packages: --only no selecciono ninguno de "
              f"{sorted(PACKAGE_MAP.values())}", file=sys.stderr)
        return 2

    ported: list[str] = []
    for source_name, workspace in selected.items():
        source = SOURCE_ROOT / source_name
        target = TARGET_ROOT / workspace
        if args.dry_run:
            count = sum(1 for f in source.rglob("*") if f.is_file()
                        and not any(p in SKIP_DIRS for p in f.parts))
            print(f"  [seco] {source_name:32s} -> src/packages/{workspace:24s} "
                  f"{count} archivo(s)")
            continue
        if target.exists():
            print(f"  YA EXISTE src/packages/{workspace} — se omite, no se pisa",
                  file=sys.stderr)
            continue
        stats = copy_package(source, target, rules)
        previous = rename_manifest(target, workspace)
        ported.append(workspace)
        print(f"  {source_name:32s} -> src/packages/{workspace:24s} "
              f"{stats['files']:4d} archivo(s) · {stats['rewritten']:3d} con "
              f"alcance reescrito ({stats['changes']} cambio(s)) · "
              f"{stats['binary']:3d} copiado(s) sin tocar · name: {previous}")

    if ported:
        added = register_workspaces(ported)
        print(f"manifiesto raiz: {added} workspace(s) nuevo(s)")
    print(f"port-packages: {len(ported)} portado(s) "
          f"(alcance medido: {len(selected)} pedido(s) de {len(PACKAGE_MAP)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
