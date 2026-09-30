#!/usr/bin/env python3
"""Reparte cada `manifest.json` del arbol en los registros etiquetados de JSONL.

**Por que un script y no un bucle de una vez** (forma `transformation`,
TASK-THYROX-0089): la transformacion tiene un criterio y ese criterio se audita
leyendolo, no reconstruyendolo de un historial de shell.

**El criterio NO vive aqui: vive en `src/workbench/manifest.py`**
(`split_into_records`, `render_manifest`). Alojarlo en un banco lo dejaria como
evidencia fechada, y `settle` necesita el mismo reparto para ascender un run
heredado — dos copias de la misma regla y ninguna autoridad. Este guion es un
llamador delgado con su recorrido del arbol y su verificador.

El reparto, para leerlo sin abrir el modulo:

| Registro | Claves | Quien las escribe |
|---|---|---|
| `launch` | `started_at`, `flat_home`, y `instrument` cuando hay `started_at` | `session.job_runs.scaffold_run` |
| `settle` | `exit_code`, `finished_at`, `duration_seconds` | `session.job_runs.settle` |
| `declaration` | todo lo demas | quien interpreta el run, a mano |

**`instrument` es condicional, y no por gusto.** La clave nombra dos cosas
distintas segun quien la escriba: en un job es el COMANDO que se lanzo, y en un
banco es el instrumento de medicion —una de las cinco claves obligatorias—.
`started_at` es el discriminador porque `scaffold_run` siempre lo escribe: si
esta, el manifiesto paso por el mecanismo y su `instrument` es el comando. Sin
el, no hubo lanzamiento que etiquetar y la clave es declaracion.

Medido sobre el corpus antes de escribir esto: 3 manifiestos de `jobs` traen
`instrument` SIN `started_at` (nacieron a mano) y 1 de `workbench` trae la
familia entera de lanzamiento y asentamiento (es un job que vive en el hogar del
banco). Los cuatro se reparten bien por clave; ninguno por su raiz.

**El orden de los registros es el del mecanismo** —`launch`, `settle`,
`declaration`— para que un archivo migrado y uno vivo con el mismo contenido
tengan la misma forma. Como los cubos son disjuntos por clave, el orden no
cambia el documento fundido; cambia solo lo que se lee en el diff.

Modos:

    --dry-run   (por defecto) reporta el reparto sin tocar nada
    --apply     escribe el `.jsonl` y retira el `.json`
    --verify    el CONTROL: funde cada `.jsonl` y lo compara con el `.json`
                que git conserva en HEAD. Falla si el reparto perdio una clave.
"""

from __future__ import annotations

import argparse
import collections
import json
import pathlib
import subprocess
import sys

# La raiz del proveedor sale del propio guion: el banco vive dentro del arbol.
THYROX_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from workbench.manifest import (  # noqa: E402
    LEGACY_MANIFEST_FILE_NAME, MANIFEST_FILE_NAME,
    read_manifest_lines, render_manifest, split_into_records,
)

OLD_FILE_NAME = LEGACY_MANIFEST_FILE_NAME


def tracked_manifests(root: pathlib.Path) -> list[pathlib.Path]:
    listed = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        capture_output=True, text=True, check=True).stdout.split()
    return [root / p for p in listed if p.endswith("/" + OLD_FILE_NAME)]


def blob_at_head(root: pathlib.Path, path: pathlib.Path) -> str | None:
    relative = path.relative_to(root)
    shown = subprocess.run(
        ["git", "-C", str(root), "show", f"HEAD:{relative}"],
        capture_output=True, text=True)
    return shown.stdout if shown.returncode == 0 else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="migrate_manifests")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args(argv)

    root = THYROX_ROOT

    if args.verify:
        return verify(root)

    pending = tracked_manifests(root)
    shapes: collections.Counter = collections.Counter()
    for old in pending:
        document = json.loads(old.read_text(encoding="utf-8"))
        records = split_into_records(document)
        shapes["+".join(kind for kind, _ in records) or "(vacio)"] += 1
        if args.apply:
            (old.parent / MANIFEST_FILE_NAME).write_text(
                render_manifest(document), encoding="utf-8")
            old.unlink()

    verb = "migrados" if args.apply else "por migrar"
    print(f"{len(pending)} manifiesto(s) {verb} "
          f"(alcance medido: git ls-files, sufijo /{OLD_FILE_NAME})")
    for shape, count in shapes.most_common():
        print(f"  {count:>3}  {shape}")
    return 0


def verify(root: pathlib.Path) -> int:
    """El control: el documento fundido tiene que ser el original, clave a clave.

    Puede fallar, y esa es su razon de ser — un reparto que perdiera una clave,
    la duplicara o alterara un valor cae aqui. Su universo es el `.json` que git
    conserva en HEAD, no la memoria de lo que el guion acaba de escribir.
    """
    listed = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        capture_output=True, text=True, check=True).stdout.split()
    old_paths = [p for p in listed if p.endswith("/" + OLD_FILE_NAME)]

    checked = mismatched = missing = 0
    for relative in old_paths:
        new_path = root / relative[: -len(OLD_FILE_NAME)] / MANIFEST_FILE_NAME
        if not new_path.is_file():
            missing += 1
            print(f"  AUSENTE  {new_path.relative_to(root)}")
            continue
        original = json.loads(blob_at_head(root, root / relative) or "{}")
        merged = read_manifest_lines(
            new_path.read_text(encoding="utf-8").splitlines())
        checked += 1
        if merged != original:
            mismatched += 1
            print(f"  DIVERGE  {new_path.relative_to(root)}")
            print(f"           original={sorted(original)}")
            print(f"           fundido ={sorted(merged)}")

    print(f"verificados {checked} de {len(old_paths)} "
          f"(divergen {mismatched}, ausentes {missing})")
    return 1 if (mismatched or missing) else 0


if __name__ == "__main__":
    raise SystemExit(main())
