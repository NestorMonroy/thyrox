"""Hook ``SessionStart`` con ``source == "compact"``: devuelve al modelo el
estado de trabajo que la compactación no conserva.

Por qué este evento y no ``PostCompact``
-----------------------------------------

La salida de un hook ``PostCompact`` se devuelve como ``userDisplayMessage``:
la ve el usuario y no llega al modelo (``_references/claude-code-bin/2.1.281``,
``bunfs-root/chunk-4n4g22z6.js``, función ``BQe`` = executePostCompactHooks).
``SessionStart`` sí inyecta ``additionalContext``, y el cliente lo dispara con
``source: "compact"`` al terminar una compactación (``jlr`` =
executeSessionStartHooks, que usa ``source`` como ``matchQuery``). El hook
anterior, ``session/session-resume.sh``, vivía en ``PostCompact`` y leía
``.thyrox/context/now.md``, que este árbol ya no tiene: aun cableado, no habría
devuelto nada al modelo.

Qué restaura
------------

Lo que el resumen de la compactación parafrasea y el disco sí conserva:

- los clones con trabajo sin publicar (``repo.pending_work``, el mismo motor
  del gate de ``Stop``);
- los trabajos del ledger de la sesión que nadie ha recogido
  (``session.job_ledger``; pendiente significa «no recogido», no «no
  terminado»).

Sin trabajo pendiente no inyecta nada: un contexto vacío repetido en cada
compactación se aprende a ignorar.

No escribe
----------

Se verifica por conducta (``bin/assert_no_writes``, en su suite), no por este
docstring. Dos escrituras implícitas se evitan a propósito: ``JobLedger``
crea su directorio al construirse, así que sólo se instancia si ya existe; y
``git status`` refresca el índice cuando puede, lo que se desactiva con
``GIT_OPTIONAL_LOCKS=0``.

Métrica: archivos que git reporta por eje en cada raíz, y ``.job`` presentes en
el ledger de la sesión.
Ciega a: el trabajo en curso que no está en disco (un plan en la conversación),
y a un trabajo lanzado fuera del ledger (``adopt-external`` lo remedia).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from repo.pending_work import FIELDS, render, sweep
from session.job_ledger import JobLedger

#: El valor de ``source`` con que el cliente marca el arranque tras compactar.
COMPACT_SOURCE = "compact"

#: Las etiquetas de cada eje son los propios nombres de campo: el contexto lo
#: lee el modelo, no una persona, y el nombre del campo es el término técnico.
FIELD_LABELS = {field: field for field in FIELDS}


def pending_jobs(ledger_root: Path, session_id: str) -> list[str]:
    """Las etiquetas del ledger de la sesión sin recoger. Un ledger que no
    existe no se crea: ``JobLedger`` hace ``mkdir`` al construirse."""
    directory = ledger_root / session_id
    if not session_id or not directory.is_dir():
        return []
    return [job.label for job in JobLedger(directory).jobs()]


def build_context(roots: list[str], ledger_root: Path, session_id: str) -> str:
    """El texto que se inyecta, o cadena vacía si no hay nada pendiente."""
    repos = sweep(roots) if roots else []
    jobs = pending_jobs(ledger_root, session_id)
    if not repos and not jobs:
        return ""
    lines = ["Estado de trabajo tras la compactación (medido en disco, no del resumen):"]
    if repos:
        lines.append("Clones con trabajo sin publicar:")
        lines.append(render(repos, FIELD_LABELS))
    if jobs:
        lines.append("Trabajos del ledger sin recoger (recoger con `bin/wait-jobs wait`, "
                     "en segundo plano):")
        lines.extend(f"  - {label}" for label in jobs)
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", action="append", default=[], help="una raíz de repo; repetible")
    parser.add_argument("--ledger-root", type=Path, required=True,
                        help="directorio que contiene un ledger por sesión")
    args = parser.parse_args(argv)
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        payload = {}
    if payload.get("source") != COMPACT_SOURCE:
        print("{}")
        return 0
    # `git status` no debe refrescar el índice: este hook sólo lee.
    os.environ["GIT_OPTIONAL_LOCKS"] = "0"
    context = build_context(args.root, args.ledger_root, str(payload.get("session_id", "")))
    if not context:
        print("{}")
        return 0
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart",
                                             "additionalContext": context}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
