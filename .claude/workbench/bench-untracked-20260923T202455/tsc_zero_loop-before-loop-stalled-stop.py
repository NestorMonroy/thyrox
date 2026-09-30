#!/usr/bin/env python3
"""El lazo tsc cero: candidatos → paso → commit, hasta cero o hasta detenerse.

Cada vuelta pide candidatos NUEVOS al proponente (`bin/tsc_proposers`): las
bases de la vuelta anterior ya no valen sobre el árbol que ese paso dejó. El
paso (`tsc_zero_step.run_step`) aplica, verifica con una pasada de `tsc`,
registra y revierte; el lazo commitea por pathspec lo que el paso conservó,
junto con su banco y el registro. El log final de cada paso es el «antes» del
siguiente: la pasada de `tsc` no se repite.

Se detiene en `done` (tsc cero), en `stalled` (ninguna aceptada: otra vuelta
repetiría el lote) o al tope de pasos (`max-steps`). No publica: el `push` es
de quien lo lanza.

La identidad del commit la pone el entorno (`bin/commit_identity env`); el
lazo no la elige.

Salidas del CLI: 0 done · 1 max-steps · 3 stalled · 2 medición rota.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from verify.tsc_zero_step import run_step


@dataclass
class LoopResult:
    status: str
    steps: int
    totals: list[int] = field(default_factory=list)


def _git(root: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, check=True, capture_output=True, text=True)


def run_loop(root: Path, proposers: list[str], tsc: list[str], loop_dir: Path, *,
             max_steps: int, seed: int, epsilon: float = 0.5, alpha0: float = 0.5,
             max_batch: int | None = None) -> LoopResult:
    ledger = loop_dir / "ledger.jsonl"
    totals: list[int] = []
    before: list[str] | None = None
    for index in range(1, max_steps + 1):
        bench = loop_dir / f"step-{index:03d}"
        bench.mkdir(parents=True, exist_ok=True)
        proposed = subprocess.run(proposers, cwd=root, capture_output=True, text=True,
                                  stdin=subprocess.DEVNULL)
        if proposed.returncode != 0:
            raise RuntimeError(f"el proponente salió {proposed.returncode}: {proposed.stderr.strip()}")
        (bench / "candidates.jsonl").write_text(proposed.stdout)
        candidates = [json.loads(line) for line in proposed.stdout.splitlines() if line.strip()]
        report = run_step(root, candidates, tsc, ledger, bench, seed=seed + index, epsilon=epsilon,
                          alpha0=alpha0, max_batch=max_batch, before_lines=before)
        (bench / "report.json").write_text(json.dumps(report.__dict__, ensure_ascii=False) + "\n")
        if not totals:
            totals.append(report.total_before)
        if report.status == "done":
            return LoopResult("done", index, totals)
        if report.status == "stalled":
            return LoopResult("stalled", index, totals)
        totals.append(report.total_final)
        # El banco y el registro viajan con el arreglo: sin `add -N`, un
        # commit por pathspec los dejaría fuera en silencio.
        _git(root, "add", "-N", "--", str(bench), str(ledger))
        _git(root, "commit", "-q", "-m",
             f"Apply tsc-zero step {index}: {report.total_before} -> {report.total_final}\n\n"
             f"Accepted by one tsc pass: {', '.join(report.accepted)}.",
             "--", *report.files_kept, str(bench), str(ledger))
        before = (bench / "final.log").read_text().splitlines()
    return LoopResult("max-steps", max_steps, totals)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv.count("--") != 2:
        print("tsc_zero_loop: uso: tsc_zero_loop [opciones] -- <proponente> -- <tsc>", file=sys.stderr)
        return 2
    first = argv.index("--")
    second = argv.index("--", first + 1)
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--loop-dir", type=Path, required=True)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--epsilon", type=float, default=0.5)
    parser.add_argument("--alpha0", type=float, default=0.5)
    parser.add_argument("--max-batch", type=int)
    args = parser.parse_args(argv[:first])
    try:
        result = run_loop(args.root, argv[first + 1:second], argv[second + 1:], args.loop_dir,
                          max_steps=args.max_steps, seed=args.seed, epsilon=args.epsilon,
                          alpha0=args.alpha0, max_batch=args.max_batch)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"tsc_zero_loop: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    print(json.dumps(result.__dict__, ensure_ascii=False))
    return {"done": 0, "max-steps": 1, "stalled": 3}[result.status]


if __name__ == "__main__":
    raise SystemExit(main())
