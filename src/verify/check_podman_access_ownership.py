#!/usr/bin/env python3
"""check_podman_access_ownership.py — PodmanAccessOwnershipGate.

``@thyrox/podman-execution`` es el ÚNICO dueño de la integración con Podman:
materializa (P1, P2) y también observa (P3). Un consumidor pide a ese paquete;
nunca emite un verbo de Podman, ni siquiera de sólo lectura (P4).

Es otra invariante que ``check_podman_materialization`` (que mide sólo los
verbos que materializan) y que ``ManagedExecutionContainmentGate`` (que mide
dónde CORRIÓ un payload). Una observación ``podman volume inspect`` hecha por un
orquestador pasa los dos y falla aquí.

Reutiliza las formas y la lista de pendientes del gate de materialización, con
cualquier subcomando de Podman como verbo. Mide ``src/`` y las rutas que se le
pasen con ``--include`` (los guiones de un banco que consume Podman).

Un sitio todavía sin migrar se declara en ``podman_access_pending.txt`` con la
tarea que lo cierra; vencida la tarea, la entrada deja de eximir.

Salida: 0 sin violaciones (o con ellas, sin ``--strict``); 1 con violaciones y
``--strict``; 2 sin poder medir.

*Métrica:* líneas de código productivo con una invocación de Podman por sus
formas reconocibles (``.run(['<sub>'``, ``podman.run(`` con cualquier argv,
``podman <sub>``, ``"$PODMAN" <sub>``, ``["podman", "<sub>"``); una por línea.
*Ciega a:* un executor de Podman guardado bajo otro nombre que ``podman``, un
alias del binario y un proceso que alcance Podman por otro programa.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from verify.check_podman_materialization import (  # noqa: E402
    AUTHORITY, DEFAULT_STORE, EXCLUDED_PARTS, PYTHON_SUFFIXES, SCRIPT_SUFFIXES, SHELL_SUFFIXES,
    Violation, apply_pending, code_lines, load_pending,
)

DESCRIPTION = "Sólo @thyrox/podman-execution habla con Podman, también para observar."
PENDING_FILE = Path(__file__).with_name("podman_access_pending.txt")
SUBCOMMANDS = (r"(attach|build|commit|container|cp|create|diff|events|exec|exists|export|healthcheck|history|image|images|"
               r"import|info|init|inspect|kill|load|logs|manifest|mount|network|pause|pod|port|ps|pull|push|rename|"
               r"restart|rm|rmi|run|save|secret|start|stats|stop|system|tag|top|unmount|unpause|untag|update|version|"
               r"volume|wait)")
SCRIPT_FORMS = (
    ("podman-subcommand", re.compile(r"\.run\(\[\s*['\"`]" + SUBCOMMANDS + r"['\"`]")),
    ("podman-spawn", re.compile(r"spawn(Sync)?\(\s*\[?\s*['\"`]podman['\"`]")),
    # El executor del dueño ejecutado por el consumidor: el verbo puede llegar
    # en una variable o salir de un constructor de argv del dueño, y aun así
    # quien decide la orden es el consumidor.
    ("podman-executor-run", re.compile(r"\bpodman\.run\(")),
)
SHELL_FORMS = (
    ("podman-subcommand", re.compile(r"(\"\$\{?(PODMAN|THYROX_TOOLCHAIN_PODMAN_BIN)\}?\"|\$\{?(PODMAN|THYROX_TOOLCHAIN_PODMAN_BIN)\}?"
                                     r"|(^|[\s;&|(`])podman)\s+(--?[a-z-]+(=\S+)?\s+)*" + SUBCOMMANDS + r"\b")),
)
PYTHON_FORMS = (
    ("podman-subcommand", re.compile(r"['\"]podman['\"]\s*,\s*['\"]" + SUBCOMMANDS + r"['\"]")),
)


def forms_for(suffix: str):
    if suffix in SHELL_SUFFIXES:
        return SHELL_FORMS
    if suffix in PYTHON_SUFFIXES:
        return PYTHON_FORMS
    return SCRIPT_FORMS


def scanned_files(root: Path, includes: list[Path]):
    suffixes = SCRIPT_SUFFIXES | SHELL_SUFFIXES | PYTHON_SUFFIXES
    candidates = list((root / "src").rglob("*"))
    for include in includes:
        candidates += list(include.rglob("*")) if include.is_dir() else [include]
    for path in sorted(set(candidates)):
        if path.is_file() and path.suffix in suffixes and not EXCLUDED_PARTS.intersection(path.parts):
            yield path


def violations_in(root: Path, includes: list[Path]) -> tuple[list[Violation], int]:
    measured = 0
    violations: list[Violation] = []
    for path in scanned_files(root, includes):
        absolute = path.resolve()
        relative = absolute.relative_to(root.resolve()).as_posix() if absolute.is_relative_to(root.resolve()) else str(absolute)
        measured += 1
        if relative.startswith(AUTHORITY):
            continue
        for number, line in code_lines(path.read_text(encoding="utf-8", errors="replace"), path.suffix):
            # Un mensaje que NOMBRA una orden de Podman no la ejecuta.
            if path.suffix in SHELL_SUFFIXES and line.strip().startswith(("echo ", "printf ")):
                continue
            for kind, pattern in forms_for(path.suffix):
                if pattern.search(line):
                    violations.append(Violation(relative, number, kind))
                    break
    return violations, measured


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--include", type=Path, action="append", default=[], help="ruta adicional a medir (p. ej. probes/ de un banco)")
    parser.add_argument("--pending", type=Path, default=PENDING_FILE)
    parser.add_argument("--store", type=Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    if not (args.root / "src").is_dir():
        print(f"check_podman_access_ownership: no hay src/ bajo {args.root}; no se mide", file=sys.stderr)
        return 2
    store = args.store or args.root / DEFAULT_STORE
    entries = load_pending(args.pending)
    if entries and not store.is_file():
        print(f"check_podman_access_ownership: hay pendientes y no hay store en {store}; no se mide su vigencia", file=sys.stderr)
        return 2
    violations, measured = violations_in(args.root, args.include)
    remaining, expired = apply_pending(violations, entries, store)
    for violation in remaining:
        print(violation.render())
    for line in expired:
        print(line)
    print(f"check_podman_access_ownership: {len(remaining)} acceso(s) a Podman fuera de {AUTHORITY}, "
          f"{len(expired)} pendiente(s) vencido(s), {len(entries) - len(expired)} pendiente(s) vigente(s) "
          f"(alcance medido: {measured} archivo(s))")
    return 1 if (remaining or expired) and args.strict else 0


if __name__ == "__main__":
    sys.exit(main())
