#!/usr/bin/env python3
"""Medir N prefijos a la vez, uno por worktree: la ruta 2 en paralelo.

POR QUÉ ASÍ Y NO N unidades contra la misma base. Medido el 2026-09-25
(`.claude/workbench/tsc-two-concurrent-20260925T201029/`): dos tsc a la vez
tardan 47–50 s de pared contra 42.7 s de uno solo, 1.77x en 4 núcleos. Pero
la ruta acepta algo en 53 de 57 lotes (93 %): con N unidades contra la misma
base casi siempre habría que medir después el estado combinado, que es la
base de la ronda siguiente, y ese tsc extra se come la ganancia.

El worktree i mide el prefijo u1..ui. La diferencia entre el log i-1 y el
log i es la contribución de ui, así que ui se decide contra el log i-1 con la
misma regla neta de `tsc_zero_step.net_outcome`. El log del prefijo aceptado
más largo ya es la base medida de la ronda siguiente: no hay tsc extra. Tras
el primer rechazo, lo que sigue estaba medido encima de una unidad que no se
conserva y vuelve a la cola sin decidir.

Un prefijo sólo junta unidades de archivos disjuntos: si dos tocan el mismo
archivo, la base de la segunda ya no coincide tras aplicar la primera.

*Ciega a:* la política no neta (la del lote con bisección); aquí sólo rige
la neta, que es la de la ruta 2.
"""
from __future__ import annotations

import shlex
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC
from verify.tsc_zero_step import _apply, _write, net_outcome


class ParallelUnavailable(RuntimeError):
    """Sin GNU Parallel no se mide: medir en serie a escondidas publicaría
    un veredicto con la cadencia que esta pieza existe para cambiar."""


@dataclass
class Decision:
    kept: list[str] = field(default_factory=list)
    outcomes: dict[str, str] = field(default_factory=dict)
    undecided: list[dict] = field(default_factory=list)
    final_lines: list[str] = field(default_factory=list)


def disjoint_prefix(rows: list[dict], limit: int) -> list[dict]:
    """Hasta `limit` unidades cuyos archivos no se cruzan. La que se cruza
    con una ya elegida se salta —vuelve a la cola— en vez de cortar el
    prefijo: cortar dejaría un worktree libre."""
    prefix: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        if len(prefix) == limit:
            break
        files = set(row["files"])
        if files & seen:
            continue
        prefix.append(row)
        seen |= files
    return prefix


def decide(base_lines: list[str], rows: list[dict], logs: list[list[str]]) -> Decision:
    """Cada unidad contra el log del prefijo anterior; hasta el primer rechazo."""
    decision = Decision(final_lines=base_lines)
    previous = base_lines
    for index, row in enumerate(rows):
        outcome, _ = net_outcome(previous, logs[index], row)
        decision.outcomes[row["proposal_id"]] = outcome
        if outcome != "accepted-net":
            decision.undecided = rows[index + 1:]
            break
        decision.kept.append(row["proposal_id"])
        previous = logs[index]
        decision.final_lines = previous
    return decision


def _diagnostic_count(lines: list[str]) -> int:
    return sum(1 for line in lines if DIAGNOSTIC.match(line))


def measure(worktrees: list[Path], rows: list[dict], tsc: list[str], bench: Path, *,
            parallel_bin: str = "parallel") -> list[list[str]]:
    """El log de tsc de cada prefijo: el worktree i con u1..ui aplicados, los
    N tsc a la vez con GNU Parallel. Cada worktree vuelve a su texto."""
    if shutil.which(parallel_bin) is None:
        raise ParallelUnavailable(f"prefix_speculation: '{parallel_bin}' no resuelve; no se mide en serie")
    bench.mkdir(parents=True, exist_ok=True)
    originals: list[dict[str, str | None]] = []
    try:
        for index, worktree in enumerate(worktrees[:len(rows)]):
            restore: dict[str, str | None] = {}
            for row in rows[:index + 1]:
                applied = _apply(worktree, row)
                if applied is None:
                    raise RuntimeError(f"prefix_speculation: la base de {row['proposal_id']} no coincide "
                                       f"en {worktree}; los worktrees no están sincronizados")
                restore.update({f: t for f, t in applied.items() if f not in restore})
            originals.append(restore)
        logs = [bench / f"prefix-{i + 1}.log" for i in range(len(originals))]
        jobs = "\n".join(f"cd {shlex.quote(str(wt))} && {shlex.join(tsc)} > {shlex.quote(str(log))} 2>&1"
                         for wt, log in zip(worktrees, logs)) + "\n"
        joblog = bench / "joblog.tsv"
        subprocess.run([parallel_bin, "--will-cite", "-j", str(len(logs)), "-k", "--joblog", str(joblog)],
                       input=jobs, text=True, capture_output=True, stdin=None)
        exits = [int(line.split("\t")[6]) for line in joblog.read_text().splitlines()[1:]]
        results = [log.read_text().splitlines() for log in logs]
        for log, lines, code in zip(logs, results, exits):
            if code != 0 and _diagnostic_count(lines) == 0:
                raise RuntimeError(f"tsc salió {code} sin diagnósticos legibles: medición rota ({log})")
        return results
    finally:
        for worktree, restore in zip(worktrees, originals):
            for file, text in restore.items():
                _write(worktree, file, text)


def run_round(worktrees: list[Path], rows: list[dict], tsc: list[str], bench: Path,
              base_lines: list[str], *, parallel_bin: str = "parallel") -> Decision:
    """Mide los prefijos, decide, y deja lo conservado aplicado en TODOS los
    worktrees, que así empiezan la ronda siguiente iguales."""
    logs = measure(worktrees, rows, tsc, bench, parallel_bin=parallel_bin)
    decision = decide(base_lines, rows, logs)
    by_id = {row["proposal_id"]: row for row in rows}
    for worktree in worktrees:
        for pid in decision.kept:
            if _apply(worktree, by_id[pid]) is None:
                raise RuntimeError(f"prefix_speculation: no se pudo conservar {pid} en {worktree}")
    return decision
