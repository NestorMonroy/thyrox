#!/usr/bin/env python3
"""El cierre de un paso del lazo tsc-zero, sin manos.

Se registra con ``--after-ok`` al pipeline del paso (``tsc_cycle`` lo hace
al lanzar), así que corre cuando el pipeline asienta con 0:

1. escribe el informe del paso (``step_report``) en ``<paso>/report.json``;
2. commitea por pathspec lo que el pipeline conservó (``files_kept`` de su
   ``pipeline.json``), el banco del paso, sus jobs y la memoria de la corrida
   (``ledger``, ``patterns``, ``setups``). Nada más: lo que otro escritor
   tenga en el árbol queda fuera;
3. si el gate del trinquete dice que un proyecto «baja», baja su baseline
   al conteo que el gate midió y lo commitea — sin volver a correr tsc;
4. empuja la rama actual a su upstream.

Cada commit apaga la firma: el cierre es desatendido y la configuración
global de este contenedor firma con un firmante que no existe (H-THYROX-191).

Antes se hacía a mano, y en el paso 159 cada eslabón tropezó una vez.

Ciega a: si lo conservado es correcto —eso lo juzgó el pipeline con tsc— y
al trabajo del propio cierre, cuyo job todavía corre mientras commitea.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from verify import step_report

#: La memoria de la corrida que cada paso hace crecer.
RUN_MEMORY = ("ledger.jsonl", "patterns.jsonl", "setups.jsonl")
#: La línea del gate del trinquete (`src/verify/check-cli-typecheck.sh`).
LOWERED = re.compile(r"check-cli-typecheck: (?P<project>\S+) baja: (?P<count>\d+) bajo un baseline")
BASELINE = Path(".claude/baselines/cli_typecheck_baseline.txt")


@dataclass
class ClosePlan:
    subject: str
    paths: list[str]
    files_kept: list[str]


@dataclass
class CloseResult:
    commits: list[str] = field(default_factory=list)
    lowered: dict[str, int] = field(default_factory=dict)


class GitError(RuntimeError):
    """Un git que falló, con su stderr: capturar la salida sin devolverla dejó
    un cierre roto sin causa legible en ``close.log``."""


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    done = subprocess.run(["git", "-c", "commit.gpgsign=false", *args], cwd=repo,
                          capture_output=True, text=True)
    if done.returncode != 0:
        raise GitError(f"git {args[0]} salió {done.returncode}:\n{done.stderr}{done.stdout}")
    return done


def _pending_close_logs(repo: Path, run: Path, bench: Path) -> list[str]:
    """Los ``close.log`` de cierres anteriores que quedaron sin commitear: cada
    cierre escribe el suyo DESPUÉS de su commit, así que sólo el siguiente
    puede llevárselo."""
    status = _git(repo, "status", "--porcelain", "--untracked-files=all", "--", str(run.resolve())).stdout
    own = (bench / "close.log").resolve()
    logs = []
    for line in status.splitlines():
        path = repo / line[3:]
        if path.name == "close.log" and path.resolve() != own:
            logs.append(str(path.resolve().relative_to(repo)))
    return logs


def close_plan(repo: Path, run: Path, bench: Path) -> ClosePlan:
    """Qué commitea el cierre y con qué asunto. Rehúsa sin ``pipeline.json``:
    sin él no se sabe qué conservó el paso."""
    summary = bench / "pipeline" / "pipeline.json"
    if not summary.is_file():
        raise ValueError(f"{summary} no existe: sin él no se sabe qué conservó el paso")
    data = json.loads(summary.read_text())
    batches = data.get("batches") or []
    if not batches:
        raise ValueError(f"{summary} no tiene lotes: no hay totales que cerrar")
    number = bench.name.removeprefix("step-")
    subject = f"Apply tsc-zero step {number}: {batches[0]['total_before']} -> {batches[-1]['total_final']}"
    repo = repo.resolve()
    rel = lambda p: str(p.resolve().relative_to(repo))  # noqa: E731
    jobs = repo / ".claude" / "jobs"
    rest = [rel(p) for p in jobs.glob(f"{bench.name}-*") if p.is_dir()] if jobs.is_dir() else []
    rest += [rel(run / name) for name in RUN_MEMORY if (run / name).is_file()]
    rest += _pending_close_logs(repo, run, bench)
    rest.append(rel(bench))
    kept = list(data.get("files_kept") or [])
    return ClosePlan(subject=subject, paths=kept + sorted(rest), files_kept=kept)


def _body(bench: Path, report: dict | None) -> str:
    if report is None:
        return "Closed by tsc_cycle close; step_report had no measured batches."
    data, system = report["data"], report["system"]
    memory = system.get("memory_kb") or {}
    lines = [f"Closed by tsc_cycle close. {data['accepted']} of {data['proposals']} proposals accepted; "
             f"{system['failed_items']} item(s) failed."]
    if memory.get("measured"):
        lines.append(f"Peak RSS per item {memory['max']} kB (median {memory['median']}), "
                     f"{memory['measured']} measured.")
    prefix = report["cost"].get("cache_prefix") or {}
    if prefix.get("measured"):
        lines.append(f"Cache prefix: {json.dumps(prefix, sort_keys=True)}.")
    return "\n".join(lines)


def lowered_baselines(output: str) -> dict[str, int]:
    """Los proyectos que el gate del trinquete declaró por debajo."""
    return {m["project"]: int(m["count"]) for m in LOWERED.finditer(output)}


def lower_baseline(path: Path, lowered: dict[str, int]) -> None:
    lines = []
    for line in path.read_text().splitlines():
        cells = line.split()
        if len(cells) == 2 and cells[0] in lowered:
            line = f"{cells[0]} {lowered[cells[0]]}"
        lines.append(line)
    path.write_text("\n".join(lines) + "\n")


def _commit(repo: Path, message: str, paths: list[str]) -> tuple[str, str]:
    _git(repo, "add", "-N", "--", *paths)
    done = _git(repo, "commit", "-q", "-m", message, "--", *paths)
    head = _git(repo, "rev-parse", "--short", "HEAD").stdout.strip()
    return head, done.stdout + done.stderr


def close_step(repo: Path, run: Path, bench: Path, push: bool = True) -> CloseResult:
    plan = close_plan(repo, run, bench)
    try:
        report = step_report.step_report(bench, bench / "pipeline")
    except ValueError:
        report = None
    if report is not None:
        (bench / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    result = CloseResult()
    head, output = _commit(repo, f"{plan.subject}\n\n{_body(bench, report)}", plan.paths)
    result.commits.append(head)
    result.lowered = lowered_baselines(output)
    baseline = repo / BASELINE
    if result.lowered and baseline.is_file():
        lower_baseline(baseline, result.lowered)
        target = min(result.lowered.values())
        head, _ = _commit(repo, f"Lower the CLI typecheck baseline to {target}\n\n"
                                f"The gate measured {json.dumps(result.lowered, sort_keys=True)} after "
                                f"{plan.subject.lower()}; lowered so it cannot climb back.", [str(BASELINE)])
        result.commits.append(head)
    if push:
        upstream = _git(repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").stdout.strip()
        remote, _, branch = upstream.partition("/")
        _git(repo, "push", "-q", remote, f"HEAD:{branch}")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="cierra un paso del lazo tsc-zero")
    parser.add_argument("--bench", type=Path, required=True, help="el banco del paso (step-N)")
    parser.add_argument("--run", type=Path, required=True, help="la corrida (run-*) con la memoria")
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = close_step(args.repo, args.run, args.bench, push=not args.no_push)
    except ValueError as error:
        print(f"step_close: REHÚSA — {error}", file=sys.stderr)
        return 2
    print(f"close: {', '.join(result.commits)}" + (f"; baseline {result.lowered}" if result.lowered else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
