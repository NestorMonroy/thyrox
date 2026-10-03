"""Inventario de solo lectura del scratchpad de la sesión (directiva del
ejecutor 2026-10-03: el scratchpad es efímero y se usó para artefactos que
operaciones posteriores consumían).

Por archivo: si su contenido exacto es un blob del repositorio (``git
hash-object`` + ``git cat-file -e``), si un registro durable o el transcript lo
nombra, y su clasificación. Lee el scratchpad VIVO; la copia en
``recovered-scratchpad/`` es la que se conserva.

Métrica: igualdad de blob con cualquier objeto del repositorio; menciones del
nombre del archivo en los registros listados.
Ciega a: un archivo cuyo contenido está en git sólo como parte de otro (un
fragmento insertado en una suite): eso se mide aparte para ``case28.py``; y a
consumidores que no nombran el archivo.
"""
from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SCRATCH = Path(sys.argv[1])
TRANSCRIPT = Path(sys.argv[2])
OUT = Path(sys.argv[3])
DURABLE_RECORDS = [ROOT / ".claude/workbench/thyrox-functional-capability-audit-20261003T210741",
                   ROOT / ".claude/workbench/branch-a-resource-boundaries-20261003T233932"]

# Fragmentos ya promovidos: archivo → (destino, una línea suya que debe estar allí).
PROMOTED = {"case28.py": ("tests/session/test_resource_admission.py",
                          'print("caso 28 — la holgura se mide en la frontera donde corre la unidad')}
# Salidas del propio cliente (tareas de fondo/monitores): su ciclo es del arnés.
HARNESS_OWNED = ("tasks/",)


def git(*args: str, data: bytes | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(ROOT), *args], input=data, capture_output=True)


def git_blob(path: Path) -> str | None:
    """El id del blob si el contenido exacto ya es un objeto del repositorio."""
    blob = git("hash-object", "--stdin", data=path.read_bytes()).stdout.decode().strip()
    return blob if git("cat-file", "-e", blob).returncode == 0 else None


def references(name: str, texts: dict[str, str]) -> list[str]:
    return [label for label, text in texts.items() if name in text]


def durable_texts() -> dict[str, str]:
    texts = {}
    for record in DURABLE_RECORDS:
        for path in record.rglob("*"):
            if (path.is_file() and "recovered-scratchpad" not in path.parts and path != OUT.resolve()
                    and path.stat().st_size < 2_000_000):
                try:
                    texts[str(path.relative_to(ROOT))] = path.read_text(errors="ignore")
                except OSError:
                    pass
    return texts


def classify(rel: str, path: Path, git_hit: bool, refs: list[str]) -> tuple[str, str, str]:
    """(clase, consumidor, destino)."""
    if rel.startswith(HARNESS_OWNED):
        return "EPHEMERAL_OK", "salida de tarea del cliente", "-"
    if path.name.endswith("-shm") or "__pycache__" in path.parts:
        return "EPHEMERAL_OK", "estado de proceso (memoria compartida de SQLite, bytecode)", "-"
    name = path.name
    if name in PROMOTED:
        target, line = PROMOTED[name]
        promoted = line in (ROOT / target).read_text()
        return ("ALREADY_PROMOTED" if promoted else "DURABLE_REQUIRED"), "fragmento de prueba RED", target
    if git_hit:
        return "RECONSTRUCTIBLE", "copia de un archivo versionado (respaldo de anulación o base)", "git: blob idéntico"
    if refs:
        return "DURABLE_REQUIRED", "nombrado por registro durable", "recovered-scratchpad/"
    return "DURABLE_REQUIRED", "sin consumidor declarado; se conserva por precaución", "recovered-scratchpad/"


def main() -> None:
    transcript = TRANSCRIPT.read_text(errors="ignore") if TRANSCRIPT.exists() else ""
    texts = durable_texts()
    rows = ["path\texists_now\ttype\tsha256\tconsumer\treferenced_by\trecoverable_from_git\t"
            "recoverable_from_log\tneeds_preservation\tclassification\tdestination\tgit_blob"]
    for path in sorted(p for p in SCRATCH.parent.rglob("*") if p.is_file()):
        rel = str(path.relative_to(SCRATCH.parent))
        blob = git_blob(path)
        git_hit = blob is not None
        refs = references(path.name, texts)
        klass, consumer, destination = classify(rel, path, git_hit, refs)
        logged = f"/{path.name} <<" in transcript or f"{path.name} <<" in transcript
        kind = path.suffix.lstrip(".") or "sin-extensión"
        needs = "yes" if klass in ("DURABLE_REQUIRED", "UNKNOWN") else "no"
        rows.append("\t".join([rel, "yes", kind, hashlib.sha256(path.read_bytes()).hexdigest()[:16], consumer,
                               ",".join(refs) or "-", "yes" if git_hit else "no",
                               "heredoc en transcript" if logged else "no", needs, klass, destination, blob or "-"]))
    OUT.write_text("\n".join(rows) + "\n")
    print(f"{len(rows) - 1} archivos → {OUT}")


if __name__ == "__main__":
    main()
