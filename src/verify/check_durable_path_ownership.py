"""PathOwnershipGate: el estado durable de un banco no apunta a una raíz efímera.

Distinto de ManagedExecutionContainmentGate, que dice dónde CORRIÓ un payload;
éste dice dónde QUEDÓ su estado. Un payload contenido cuya única evidencia vive
en ``/tmp`` sigue sin ser reanudable.

Mide, en cada banco:

- los archivos de estado que gobiernan la reanudación (``batch.json``,
  ``state.json``, ``manifest.jsonl``, ``plan.jsonl`` y
  ``outputs/continuation.jsonl``): cualquier palabra de un valor de texto que
  sea una ruta absoluta bajo ``/tmp``, ``/var/tmp`` o ``/dev/shm``;
- los guiones reproducibles (``probes/``, ``tests/``) y las tareas
  (``tasks/``): cualquier literal ``/tmp/claude-``.

Ciego a: una ruta efímera escrita en prosa libre de un ``.md`` de salida, y a
una referencia relativa que apunte a un archivo que ya no existe —eso lo mide
``resume_manifest resume``—.

Uso: check_durable_path_ownership.py <banco>...
Salidas: 0 sin referencias efímeras · 1 alguna · 2 un archivo de estado ilegible.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

EPHEMERAL_ROOTS = ("/tmp/", "/var/tmp/", "/dev/shm/")
SESSION_SCRATCH_LITERAL = "/tmp/claude-"
STATE_FILES = ("batch.json", "state.json")
#: Los registros que gobiernan la reanudación. No las transcripciones de un
#: trabajador (``*.stream.jsonl``): registran el ``/tmp`` de SU contenedor, no
#: una referencia a estado que alguien tenga que volver a leer.
LINE_STATE_FILES = ("manifest.jsonl", "plan.jsonl", "outputs/continuation.jsonl")
SCRIPT_DIRECTORIES = ("probes", "tests", "tasks")


def _ephemeral_values(value, field: str):
    if isinstance(value, str):
        # Una orden (el `verify` de un ítem) lleva rutas entre sus palabras.
        for token in value.split():
            if any(token.strip("\"'").startswith(root) for root in EPHEMERAL_ROOTS):
                yield field, token
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from _ephemeral_values(item, f"{field}.{key}" if field else str(key))
    elif isinstance(value, list):
        for item in value:
            yield from _ephemeral_values(item, field)


def _structured_documents(workbench: Path):
    for name in STATE_FILES:
        path = workbench / name
        if path.is_file():
            yield path, [json.loads(path.read_text())]
    for path in (workbench / name for name in LINE_STATE_FILES):
        if path.is_file():
            yield path, [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def violations(workbench: Path) -> list[str]:
    found = []
    for path, documents in _structured_documents(workbench):
        for document in documents:
            for field, value in _ephemeral_values(document, ""):
                found.append(f"{path.relative_to(workbench)}: {field} = {value}")
    for directory in SCRIPT_DIRECTORIES:
        for path in sorted((workbench / directory).rglob("*")) if (workbench / directory).is_dir() else []:
            if path.is_file() and SESSION_SCRATCH_LITERAL in path.read_text(errors="replace"):
                found.append(f"{path.relative_to(workbench)}: cita {SESSION_SCRATCH_LITERAL}")
    return found


def main(argv: list[str] | None = None) -> int:
    workbenches = [Path(arg) for arg in (argv if argv is not None else sys.argv[1:])]
    if not workbenches:
        print("uso: check_durable_path_ownership.py <banco>...", file=sys.stderr)
        return 2
    found: list[str] = []
    try:
        for workbench in workbenches:
            found += [f"{workbench.name}/{item}" for item in violations(workbench)]
    except (OSError, json.JSONDecodeError) as error:
        print(f"check_durable_path_ownership: no se pudo medir: {error}", file=sys.stderr)
        return 2
    for item in found:
        print(item)
    print(f"check_durable_path_ownership: {len(found)} referencia(s) efímera(s) (alcance medido: {len(workbenches)} banco(s))")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
