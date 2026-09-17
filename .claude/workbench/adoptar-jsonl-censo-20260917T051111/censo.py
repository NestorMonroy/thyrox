#!/usr/bin/env python3
"""Censo de los `.json` versionados de thyrox, clasificados por DUEÑO del formato.

El eje NO es la extension ni el tamaño: es quien LEE el archivo. Un `.json` que
un tercero parsea (bun, npm, tsc, el cliente de Claude Code) no puede volverse
JSONL aunque el arbol lo escriba — su formato lo fija su lector, no su autor.

Buckets:
  A — contrato de tercero: el lector es ajeno. Fuera de alcance por
      construccion; su divergencia se DECLARA, no se convierte.
  B — ya es JSONL: se lista por completitud del censo.
  C — propiedad de thyrox: su unico lector es este arbol. Se convierte, y un
      archivo de UN documento se vuelve un `.jsonl` de UN registro.

*Metrica:* archivos `.json`/`.jsonl` que `git ls-files` devuelve, menos los
corpus vendorizados (`_references/`) y el arbol anterior (`_archived/`).
*Ciega a:* un `.json` no versionado (runtime, gitignored), y a un lector
externo que consuma un basename propio nuestro sin que su nombre lo delate —
por eso el bucket A se decide por lista declarada y no por heuristica.
"""
from __future__ import annotations

import collections
import json
import pathlib
import subprocess
import sys

#: Basenames cuyo lector es un TERCERO. La lista es declarada, no derivada:
#: una heuristica por nombre no distingue `manifest.json` (nuestro) de
#: `package.json` (de bun), y equivocarse aqui rompe el arranque del arbol.
THIRD_PARTY_BASENAMES = {
    "package.json",          # bun / npm
    "package-lock.json",     # npm
    "bun.lock",              # bun
    "tsconfig.json",         # tsc
    "tsconfig.tests.json",   # tsc
    "tsconfig.messages.json",# tsc
    "plugin.json",           # el cliente de Claude Code
    "settings.json",         # el cliente de Claude Code
    "settings.local.json",   # el cliente de Claude Code
    "mcp.json",              # el cliente de Claude Code
}

#: Prefijos de ruta cuyo lector es un tercero, aunque el basename sea nuestro.
THIRD_PARTY_PREFIXES = (
    ".claude-plugin/",       # el manifiesto del plugin, que el cliente lee
)

#: Sufijos de ruta que un tercero lee aunque el basename sea nuestro. El
#: `evals.json` de un skill lo consume `claude plugin eval`, no este arbol.
THIRD_PARTY_PATH_SUFFIXES = (
    "/evals/evals.json",
    "/evals/multi-interaction-evals.json",
    "/evals/trigger-evals.json",
)

#: Segmentos de ruta que marcan EVIDENCIA CAPTURADA: material de un tercero
#: copiado verbatim a un banco o a un job. Lo escribimos nosotros, asi que no
#: es contrato ajeno; y convertirlo DESTRUYE lo que lo hace evidencia — su
#: identidad byte a byte con la fuente que midio.
#:
#: Es la cuarta clase que el esquema de tres buckets no puede expresar, y no
#: es marginal: medida al censar, es la MAYORIA del arbol.
CAPTURED_SEGMENTS = ("/outputs/",)

#: Sufijos de ruta de FIXTURE que modela una forma ajena. Convertirlo haria
#: que deje de modelar lo que modela: una tarjeta del board del cliente es un
#: `.json` porque el cliente la escribe asi.
FOREIGN_SHAPE_FIXTURES = (
    "tests/task/fixtures/board_store_drift/card_369.json",
)

EXCLUDED_ROOTS = ("_references/", "_archived/")


def versioned_json(root: pathlib.Path) -> list[str]:
    """Los `.json` y `.jsonl` versionados, sin los corpus ajenos."""
    out = subprocess.run(
        ["git", "ls-files", "*.json", "*.jsonl"],
        cwd=root, capture_output=True, text=True, check=True).stdout
    return [p for p in out.splitlines()
            if p and not p.startswith(EXCLUDED_ROOTS) and "node_modules/" not in p]


def bucket_of(path: str) -> str:
    """A (tercero) · B (ya JSONL) · C (nuestro, se convierte) · D (evidencia).

    El orden de las ramas NO es arbitrario: `D` va antes que `A` y `C` porque
    un archivo capturado puede tener cualquier basename — el `1.json` de un
    volcado del board lleva el nombre que el cliente le dio.
    """
    if path.endswith(".jsonl"):
        return "B"
    if any(seg in path for seg in CAPTURED_SEGMENTS):
        return "D"
    if path in FOREIGN_SHAPE_FIXTURES:
        return "D"
    if path.startswith(THIRD_PARTY_PREFIXES):
        return "A"
    if path.endswith(THIRD_PARTY_PATH_SUFFIXES):
        return "A"
    if pathlib.Path(path).name in THIRD_PARTY_BASENAMES:
        return "A"
    return "C"


def readers_of(root: pathlib.Path, basename: str) -> int:
    """Cuantos archivos de codigo nombran ese basename.

    Es el orden de conversion: menos lectores, antes. No es el numero de
    llamadas — un archivo puede nombrarlo varias veces.
    """
    out = subprocess.run(
        ["grep", "-rl", basename, "--include=*.py", "--include=*.ts",
         "--include=*.sh", "src", "tests", "bin"],
        cwd=root, capture_output=True, text=True)
    return len([l for l in out.stdout.splitlines() if l])


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[3]
    paths = versioned_json(root)
    by_bucket: dict[str, list[str]] = collections.defaultdict(list)
    for p in paths:
        by_bucket[bucket_of(p)].append(p)

    print(f"censo-jsonl: {len(paths)} archivo(s) versionado(s) "
          f"(alcance medido: git ls-files menos {', '.join(EXCLUDED_ROOTS)} "
          f"y node_modules)")
    for bucket, label in (("A", "contrato de tercero — NO se convierte"),
                          ("B", "ya es JSONL"),
                          ("D", "evidencia capturada — NO se convierte"),
                          ("C", "propiedad de thyrox — se convierte")):
        items = by_bucket[bucket]
        print(f"\n  bucket {bucket} — {label}: {len(items)}")
        if bucket == "D":
            porto = collections.Counter(
                p.split("/outputs/")[0] + "/outputs/" if "/outputs/" in p else p
                for p in items)
            for sub, n in porto.most_common():
                print(f"    {sub}  ({n} archivo(s))")
            continue
        counts = collections.Counter(pathlib.Path(p).name for p in items)
        for name, n in counts.most_common():
            marca = f" ({n} archivos)" if n > 1 else ""
            if bucket == "C":
                print(f"    {name:<44}{marca:<16} lectores={readers_of(root, name)}")
            else:
                print(f"    {name}{marca}")

    if "--json" in sys.argv:
        print(json.dumps({b: sorted(v) for b, v in by_bucket.items()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
