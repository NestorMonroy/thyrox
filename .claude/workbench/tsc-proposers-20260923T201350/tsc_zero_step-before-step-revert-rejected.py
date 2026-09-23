#!/usr/bin/env python3
"""Un paso del lazo tsc cero: aplicar un lote, verificarlo con UN tsc, quedarse
con lo aceptado.

El paso compone las piezas del plan (`kaupamex-docs: …/resolve-all-thyrox-errors/
plan-tsc-zero.rst`):

  1. `tsc` antes, o el log final del paso anterior (`--before-log`);
  2. `tsc_schedule.schedule` elige el lote por Thompson sampling, sin archivos
     compartidos;
  3. se aplica cada propuesta SÓLO si su archivo sigue siendo el texto sobre el
     que se propuso (`bases`); si no, su veredicto es `infrastructure`, que el
     planificador no cuenta en contra;
  4. una pasada de `tsc`; `batch_verification.verify_proposals` reparte el
     veredicto por propuesta, y el registro lo AÑADE;
  5. se revierte todo lo que no es `accepted`;
  6. si se revirtió algo y quedó algo, otra pasada: lo aceptado se juzgó junto
     a lo revertido, y sólo otra pasada mide lo que queda. Si esa pasada trae
     un diagnóstico que no estaba antes, o no baja el total, se revierte todo.

Estados: `done` (tsc sale 0 sin diagnósticos) · `progress` (algo aceptado y
confirmado) · `stalled` (nada aceptado: la señal de parada del lazo). Un `tsc`
que sale distinto de 0 sin ningún diagnóstico legible no es un cero: rehúsa.

El paso NO commitea: deja el árbol con lo aceptado y el lazo lo commitea por
pathspec con `files_kept`.

Salidas del CLI: 0 done · 1 progress · 3 stalled · 2 medición rota.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC
from verify.batch_verification import Proposal, _new_diagnostics, ledger_rows, verify_proposals
from verify.tsc_schedule import Candidate, schedule


@dataclass
class StepReport:
    status: str
    total_before: int
    total_final: int
    tsc_runs: int
    accepted: list[str] = field(default_factory=list)
    files_kept: list[str] = field(default_factory=list)
    outcomes: dict[str, str] = field(default_factory=dict)


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _count(lines: list[str]) -> int:
    return sum(1 for line in lines if DIAGNOSTIC.match(line))


def run_tsc(root: Path, command: list[str], log: Path) -> list[str]:
    result = subprocess.run(command, cwd=root, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(result.stdout + result.stderr)
    lines = (result.stdout + result.stderr).splitlines()
    if result.returncode != 0 and _count(lines) == 0:
        raise RuntimeError(f"tsc salió {result.returncode} sin diagnósticos legibles: medición rota ({log})")
    return lines


def _apply(root: Path, row: dict) -> dict[str, str] | None:
    """Aplica una propuesta y devuelve los textos originales, o None si alguna
    base cambió (en ese caso no escribe nada)."""
    originals = {}
    for file in row["files"]:
        text = (root / file).read_text()
        if _sha(text) != row["bases"].get(file):
            return None
        originals[file] = text
    for file, text in originals.items():
        edits = sorted((e for e in row["edits"] if e["file"] == file), key=lambda e: -e["start"])
        for edit in edits:
            text = text[: edit["start"]] + edit["newText"] + text[edit["start"] + edit["length"]:]
        (root / file).write_text(text)
    return originals


def _append(ledger: Path, rows: list[dict]) -> None:
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def run_step(root: Path, candidates: list[dict], tsc: list[str], ledger: Path, bench: Path, *,
             seed: int, epsilon: float, alpha0: float, max_batch: int | None,
             before_lines: list[str] | None = None) -> StepReport:
    runs = 0
    if before_lines is None:
        before_lines = run_tsc(root, tsc, bench / "before.log")
        runs += 1
    total_before = _count(before_lines)
    if total_before == 0:
        return StepReport("done", 0, 0, runs)

    by_id = {row["proposal_id"]: row for row in candidates}
    plan = schedule([Candidate(r["proposal_id"], r["proposer"], len(r["targets"]), frozenset(r["files"]))
                     for r in candidates], _read_jsonl(ledger), epsilon, alpha0, seed, max_batch)
    applied: dict[str, dict[str, str]] = {}
    infrastructure = []
    for candidate in plan.selected:
        originals = _apply(root, by_id[candidate.proposal_id])
        if originals is None:
            infrastructure.append(by_id[candidate.proposal_id])
        else:
            applied[candidate.proposal_id] = originals
    rows = [{"proposal_id": r["proposal_id"], "proposer": r["proposer"], "outcome": "infrastructure",
             "targets_before": None, "targets_after": None, "new_diagnostics": [],
             "total_before": total_before, "total_after": None} for r in infrastructure]
    outcomes = {r["proposal_id"]: "infrastructure" for r in infrastructure}
    if not applied:
        _append(ledger, rows)
        return StepReport("stalled", total_before, total_before, runs, outcomes=outcomes)

    after_lines = run_tsc(root, tsc, bench / "batch.log")
    runs += 1
    report = verify_proposals(before_lines, after_lines, [
        Proposal(pid, by_id[pid]["proposer"], frozenset(by_id[pid]["targets"]), frozenset(by_id[pid]["files"]))
        for pid in applied])
    _append(ledger, rows + ledger_rows(report))
    outcomes.update({v.proposal_id: v.outcome for v in report.verdicts})

    accepted = [pid for pid in applied if outcomes[pid] == "accepted"]
    reverted = [pid for pid in applied if outcomes[pid] != "accepted"]
    for pid in reverted:
        for file, text in applied[pid].items():
            (root / file).write_text(text)
    final_lines = after_lines
    if accepted and reverted:
        final_lines = run_tsc(root, tsc, bench / "confirm.log")
        runs += 1
        new, _ = _new_diagnostics(before_lines, final_lines)
        if new or _count(final_lines) >= total_before:
            for pid in accepted:
                for file, text in applied[pid].items():
                    (root / file).write_text(text)
            accepted, final_lines = [], before_lines
    if not accepted:
        final_lines = before_lines
    bench.mkdir(parents=True, exist_ok=True)
    (bench / "final.log").write_text("\n".join(final_lines) + "\n")
    kept = sorted({file for pid in accepted for file in applied[pid]})
    status = "progress" if accepted else "stalled"
    return StepReport(status, total_before, _count(final_lines), runs, accepted, kept, outcomes)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if "--" not in argv:
        print("tsc_zero_step: falta `--` antes del comando de tsc", file=sys.stderr)
        return 2
    split = argv.index("--")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, required=True, help="directorio desde donde corre tsc")
    parser.add_argument("--candidates", type=Path, required=True, help="JSONL de bin/tsc_proposers")
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--before-log", type=Path)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--epsilon", type=float, default=0.5)
    parser.add_argument("--alpha0", type=float, default=0.5)
    parser.add_argument("--max-batch", type=int)
    args = parser.parse_args(argv[:split])
    try:
        before = args.before_log.read_text().splitlines() if args.before_log else None
        report = run_step(args.root, _read_jsonl(args.candidates), argv[split + 1:], args.ledger,
                          args.bench, seed=args.seed, epsilon=args.epsilon, alpha0=args.alpha0,
                          max_batch=args.max_batch, before_lines=before)
    except (OSError, ValueError, RuntimeError, KeyError, json.JSONDecodeError) as error:
        print(f"tsc_zero_step: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    print(json.dumps(report.__dict__, ensure_ascii=False))
    return {"done": 0, "progress": 1, "stalled": 3}[report.status]


if __name__ == "__main__":
    raise SystemExit(main())
