#!/usr/bin/env python3
"""check_execution_authorization.py — ninguna unidad se materializa sin ExecutionAuthorization.

ADR-007, Regla 4 y M2: ``ExecutionGrant``/``ExecutionAuthorization`` →
``PodmanExecutionPrimitive`` → ``ExecutionUnit``. El paquete
``@thyrox/podman-execution`` expone dos niveles: las entradas autorizadas
(``runExecution``, ``materializeExecution``), que validan la autorización
—tarea, clase, referencia— y etiquetan la unidad con ella, y los constructores
internos (``materializeContainer``, ``runJobWithOutput``,
``createWorkerContainer``), que crean un contenedor a partir de un spec sin
autorización. Un consumidor que llama a los segundos materializa por la
primitiva, pero sin la decisión que la ampara: es la segunda ruta.

Distinto de ``check_podman_materialization`` (verbos de Podman fuera del
dueño) y de ``check_podman_access_ownership`` (cualquier acceso fuera del
dueño): aquí el acceso es del dueño, y lo que falta es la autorización.

Salida: 0 sin violaciones (o con ellas, sin ``--strict``); 1 con violaciones y
``--strict``; 2 sin poder medir.

*Métrica:* líneas de código productivo fuera de ``src/packages/podman-execution/``
que llaman a un constructor interno de contenedor.
*Ciega a:* un trabajo que no usa Podman en absoluto —un proceso del anfitrión,
como el ítem de ``headless-pool``—: eso lo mide, por ejecución,
``managed_execution_containment``.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from verify.check_podman_materialization import AUTHORITY, EXCLUDED_PARTS, SCRIPT_SUFFIXES, Violation, code_lines  # noqa: E402

DESCRIPTION = "Ninguna unidad de Podman se materializa sin ExecutionAuthorization."
UNAUTHORIZED_BUILDERS = re.compile(r"\b(materializeContainer|runJobWithOutput|createWorkerContainer)\(")


def violations_in(root: Path) -> tuple[list[Violation], int]:
    measured = 0
    violations: list[Violation] = []
    for path in sorted((root / "src").rglob("*")):
        if not path.is_file() or path.suffix not in SCRIPT_SUFFIXES or EXCLUDED_PARTS.intersection(path.parts):
            continue
        relative = path.relative_to(root).as_posix()
        measured += 1
        if relative.startswith(AUTHORITY):
            continue
        for number, line in code_lines(path.read_text(encoding="utf-8", errors="replace"), path.suffix):
            if UNAUTHORIZED_BUILDERS.search(line):
                violations.append(Violation(relative, number, "unauthorized-materialization"))
    return violations, measured


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    if not (args.root / "src").is_dir():
        print(f"check_execution_authorization: no hay src/ bajo {args.root}; no se mide", file=sys.stderr)
        return 2
    violations, measured = violations_in(args.root)
    for violation in violations:
        print(violation.render())
    print(f"check_execution_authorization: {len(violations)} materialización(es) sin ExecutionAuthorization fuera de "
          f"{AUTHORITY} (alcance medido: {measured} archivo(s))")
    return 1 if violations and args.strict else 0


if __name__ == "__main__":
    sys.exit(main())
