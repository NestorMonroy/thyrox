#!/usr/bin/env python3
"""check_podman_materialization.py — sólo la primitiva materializa contenedores.

ADR-007, Regla 4 y enmienda 1.16.0: la única autoridad que crea, arranca,
ejecuta o construye un contenedor gestionado es ``@thyrox/podman-execution``
(``src/packages/podman-execution/``). Daemon, pool, coordinador de modelos,
bootstrap de infraestructura y orquestadores deciden QUÉ corre; nunca componen
el argv del contenedor ni emiten el verbo de Podman.

La autoridad se declara por MÓDULO, no por nombre de comando: fuera de ese
directorio, cualquier línea de código productivo que emita un verbo de
materialización —``create``, ``start``, ``restart``, ``run``, ``exec``,
``build``— o que componga el argv del contenedor es una violación, sea TS,
shell o Python.

Un sitio que todavía no migró se declara en ``podman_materialization_pending.txt``
con la tarea que lo cierra. La entrada sólo vale mientras esa tarea esté
abierta en el store: cerrada o inexistente, la entrada se reporta vencida. Así
un camino provisional no sobrevive a su tarea.

Salida: 0 sin violaciones (o con violaciones, sin ``--strict``); 1 con
violaciones y ``--strict``; 2 sin poder medir.

*Métrica:* líneas de código productivo (fuera de comentarios, docstrings,
pruebas, ``dist`` y dobles) que casan con una forma de materialización.
*Ciega a:* una invocación de Podman por un nombre que estas formas no
reconocen —un alias, un argv compuesto en una variable antes del verbo— y a
un proceso que llegue a Podman a través de otro binario.
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

DESCRIPTION = "Sólo @thyrox/podman-execution materializa contenedores gestionados."
AUTHORITY = "src/packages/podman-execution/"
PENDING_FILE = Path(__file__).with_name("podman_materialization_pending.txt")
DEFAULT_STORE = Path("agent-results/agent_store.sqlite3")
SCRIPT_SUFFIXES = {".ts", ".tsx", ".js", ".mjs"}
SHELL_SUFFIXES = {".sh"}
PYTHON_SUFFIXES = {".py"}
EXCLUDED_PARTS = {"__tests__", "dist", "testing", "node_modules", "__pycache__"}
OPEN_STATUSES = {"pending", "in_progress"}
VERBS = r"(create|start|restart|run|exec|build)"

SCRIPT_FORMS = (
    ("container-argv", re.compile(r"\bcreateWorkerContainerArgv\(")),
    ("podman-verb", re.compile(r"\.run\(\[\s*['\"`]" + VERBS + r"['\"`]")),
    ("podman-spawn", re.compile(r"spawn(Sync)?\(\s*\[?\s*['\"`]podman['\"`]")),
)
SHELL_FORMS = (
    ("podman-verb", re.compile(r"(\"\$\{?(PODMAN|THYROX_TOOLCHAIN_PODMAN_BIN)\}?\"|\$\{?(PODMAN|THYROX_TOOLCHAIN_PODMAN_BIN)\}?|(^|[\s;&|(`])podman)\s+" + VERBS + r"\b")),
)
PYTHON_FORMS = (
    ("podman-verb", re.compile(r"['\"]podman['\"]\s*,\s*['\"]" + VERBS + r"['\"]")),
)


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    kind: str

    def render(self) -> str:
        return f"  {self.path}:{self.line}  {self.kind}"


@dataclass(frozen=True)
class PendingEntry:
    path: str
    task: str
    reason: str


def is_productive(path: Path, root: Path) -> bool:
    return not EXCLUDED_PARTS.intersection(path.relative_to(root).parts)


def code_lines(text: str, suffix: str):
    """Las líneas de código, sin comentarios ni docstrings de Python."""
    in_docstring = False
    for number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if suffix in PYTHON_SUFFIXES:
            quotes = stripped.count('"""') + stripped.count("'''")
            if in_docstring or (quotes == 1 and stripped[:3] in ('"""', "'''")):
                if quotes % 2 == 1:
                    in_docstring = not in_docstring
                continue
            if stripped.startswith(('"""', "'''")) and quotes >= 2:
                continue
            if stripped.startswith("#"):
                continue
        elif suffix in SHELL_SUFFIXES:
            if stripped.startswith("#"):
                continue
        elif stripped.startswith(("//", "*", "/*")):
            continue
        yield number, line


def forms_for(suffix: str):
    if suffix in SHELL_SUFFIXES:
        return SHELL_FORMS
    if suffix in PYTHON_SUFFIXES:
        return PYTHON_FORMS
    return SCRIPT_FORMS


def violations_in(root: Path) -> tuple[list[Violation], int]:
    measured = 0
    violations: list[Violation] = []
    suffixes = SCRIPT_SUFFIXES | SHELL_SUFFIXES | PYTHON_SUFFIXES
    for path in sorted((root / "src").rglob("*")):
        if not path.is_file() or path.suffix not in suffixes or not is_productive(path, root):
            continue
        relative = path.relative_to(root).as_posix()
        measured += 1
        if relative.startswith(AUTHORITY):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for number, line in code_lines(text, path.suffix):
            for kind, pattern in forms_for(path.suffix):
                if pattern.search(line):
                    violations.append(Violation(relative, number, kind))
    return violations, measured


def load_pending(path: Path) -> list[PendingEntry]:
    if not path.is_file():
        return []
    entries = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        fields = raw.split("\t")
        entries.append(PendingEntry(fields[0], fields[1] if len(fields) > 1 else "", fields[2] if len(fields) > 2 else ""))
    return entries


def task_status(store: Path, citation: str) -> str | None:
    connection = sqlite3.connect(f"file:{store}?mode=ro", uri=True)
    try:
        row = connection.execute(
            "select status from tasks where citation_id = ? or layer_citation_id = ?", (citation, citation)
        ).fetchone()
    finally:
        connection.close()
    return row[0] if row else None


def apply_pending(violations: list[Violation], entries: list[PendingEntry], store: Path) -> tuple[list[Violation], list[str]]:
    """Exime los sitios de una entrada vigente; una vencida no exime y se reporta."""
    expired: list[str] = []
    current: set[str] = set()
    for entry in entries:
        status = task_status(store, entry.task)
        if status in OPEN_STATUSES:
            current.add(entry.path)
        else:
            expired.append(f"  {entry.path}  {entry.task or '(sin tarea)'} está {status or 'ausente del store'}: la entrada venció")
    return [violation for violation in violations if violation.path not in current], expired


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--pending", type=Path, default=PENDING_FILE)
    parser.add_argument("--store", type=Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    if not (args.root / "src").is_dir():
        print(f"check_podman_materialization: no hay src/ bajo {args.root}; no se mide", file=sys.stderr)
        return 2
    store = args.store or args.root / DEFAULT_STORE
    entries = load_pending(args.pending)
    if entries and not store.is_file():
        print(f"check_podman_materialization: hay pendientes y no hay store en {store}; no se mide su vigencia", file=sys.stderr)
        return 2
    violations, measured = violations_in(args.root)
    remaining, expired = apply_pending(violations, entries, store)
    for violation in remaining:
        print(violation.render())
    for line in expired:
        print(line)
    print(f"check_podman_materialization: {len(remaining)} materialización(es) fuera de {AUTHORITY}, "
          f"{len(expired)} pendiente(s) vencido(s), {len(entries) - len(expired)} pendiente(s) vigente(s) "
          f"(alcance medido: {measured} archivo(s) productivos)")
    return 1 if (remaining or expired) and args.strict else 0


if __name__ == "__main__":
    sys.exit(main())
