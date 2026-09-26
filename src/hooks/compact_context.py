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
  terminado»);
- los bancos más recientes del hogar declarado (``workbench_dir()``): ahí
  viven el instrumento y las salidas de lo que se estaba midiendo.

Cada hogar se resuelve por su constante (``ledger_root()``,
``workbench_dir()``), nunca por un literal en el cableado.

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
from session.job_ledger import JobLedger, ledger_root
from workbench.paths import WorkbenchHomeError, workbench_dir

#: El valor de ``source`` con que el cliente marca el arranque tras compactar.
COMPACT_SOURCE = "compact"

#: Las etiquetas de cada eje son los propios nombres de campo: el contexto lo
#: lee el modelo, no una persona, y el nombre del campo es el término técnico.
FIELD_LABELS = {field: field for field in FIELDS}

#: Cuántos bancos recientes se nombran. Un banco es una pregunta medida con su
#: instrumento y sus salidas: los últimos tocados son lo que se estaba haciendo.
RECENT_BENCHES = 3


def pending_jobs(ledger_root: Path, session_id: str) -> list[str]:
    """Las etiquetas del ledger de la sesión sin recoger. Un ledger que no
    existe no se crea: ``JobLedger`` hace ``mkdir`` al construirse."""
    directory = ledger_root / session_id
    if not session_id or not directory.is_dir():
        return []
    return [job.label for job in JobLedger(directory).jobs()]


def recent_benches(home: Path | None, limit: int = RECENT_BENCHES) -> list[Path]:
    """Los bancos más recientes del hogar declarado, del más nuevo al más
    viejo. Sin hogar declarado no hay lista: ``workbench_dir`` rehúsa y aquí
    no se inventa uno."""
    if home is None or not home.is_dir():
        return []
    benches = [entry for entry in home.iterdir() if entry.is_dir()]
    return sorted(benches, key=lambda entry: entry.stat().st_mtime, reverse=True)[:limit]


def build_context(roots: list[str], ledger_home: Path, session_id: str,
                  bench_home: Path | None = None) -> str:
    """El texto que se inyecta, o cadena vacía si no hay nada pendiente.

    Los bancos no deciden si hay algo que inyectar: sin trabajo sin publicar ni
    trabajos sin recoger no se inyecta nada, aunque existan bancos."""
    repos = sweep(roots) if roots else []
    jobs = pending_jobs(ledger_home, session_id)
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
    benches = recent_benches(bench_home)
    if benches:
        lines.append("Bancos más recientes (el instrumento y las salidas de lo que se estaba midiendo):")
        lines.extend(f"  - {bench}" for bench in benches)
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", action="append", default=[], help="una raíz de repo; repetible")
    parser.add_argument("--ledger-root", type=Path, default=None,
                        help="directorio con un ledger por sesión; por omisión, "
                             "job_ledger.ledger_root()")
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
    try:
        bench_home = workbench_dir()
    except WorkbenchHomeError:
        bench_home = None
    context = build_context(args.root, args.ledger_root or ledger_root(),
                            str(payload.get("session_id", "")), bench_home)
    if not context:
        print("{}")
        return 0
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart",
                                             "additionalContext": context}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
