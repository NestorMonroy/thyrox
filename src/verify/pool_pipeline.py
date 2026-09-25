#!/usr/bin/env python3
"""Mide las propuestas del pool por lotes MIENTRAS el pool sigue.

Antes todo iba en serie: pool entero (paso 107: 166 ítems, ≈10 min con la
anchura ocupada al 11.2 de 12) → ensamblar → paso de tsc (2-3 min) →
revisar. El pool no espera a nadie; lo que esperaba era el paso, porque
aplica candidatos sobre el mismo árbol que el pool lee. Aquí el paso corre
en un worktree aparte (`measure_worktree`) y toma un lote cada vez que hay
`batch` archivos listos, así que al terminar el pool sólo falta el último
lote.

Un archivo está LISTO cuando todos sus ítems terminaron (un archivo partido
en trozos no se mide a medias). El candidato se construye aquí y no con
`agent_proposal`, que calcula contra HEAD y restaura a HEAD: en el worktree
eso borraría lo aceptado en lotes anteriores. La base es el texto actual
del archivo en el worktree y la edición lo reemplaza entero.

Al final copia al árbol principal los archivos que algún lote conservó.

Uso: pool_pipeline.py --main M --worktree W --items I --outputs O [--outputs O2]
       --bench B --ledger L --seed N [--batch 20] [--poll 20] -- <comando tsc>
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key
from verify import measure_worktree

SILENCE = re.compile(r"\bas any\b|:\s*any\b|<any>|as unknown as|\bas never\b|@ts-ignore|@ts-expect-error")


def read_output(path: Path) -> dict | None:
    """La salida de un ítem, o None si todavía no está escrita entera."""
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def items_by_file(items: list[str]) -> dict[str, list[int]]:
    grouped: dict[str, list[int]] = {}
    for index, line in enumerate(items, 1):
        grouped.setdefault(line.split()[0], []).append(index)
    return grouped


def ready_files(grouped: dict[str, list[int]], finished: set[int], taken: set[str]) -> list[str]:
    """Archivos cuyos ítems terminaron TODOS y que ningún lote tomó aún."""
    return sorted(f for f, idx in grouped.items() if f not in taken and all(i in finished for i in idx))


def proposal_edits(output: dict) -> list[dict]:
    block = re.search(r"\{.*\}", output.get("result", "") or "", re.S)
    if not block:
        return []
    try:
        return json.loads(block.group(0)).get("edits", []) or []
    except ValueError:
        return []


def build_candidate(file: str, text: str, edits: list[dict], before_keys: list[str]) -> tuple[dict | None, list[str]]:
    """El candidato de un archivo: aplica en orden las ediciones que no
    silencian y cuyo `old` es único; base = texto actual."""
    new, dropped = text, []
    for edit in edits:
        old, replacement = edit.get("old", ""), edit.get("new", "")
        if SILENCE.search(replacement) and not SILENCE.search(old):
            dropped.append("silencia")
            continue
        if not old or new.count(old) != 1:
            dropped.append("old no único")
            continue
        new = new.replace(old, replacement)
    targets = sorted(k for k in before_keys if k.startswith(file + ": "))
    if new == text or not targets:
        return None, dropped
    return {"proposal_id": f"agent:pool:{file}", "proposer": "agent", "targets": targets, "files": [file],
            "edits": [{"file": file, "start": 0, "length": len(text), "newText": new}],
            "bases": {file: hashlib.sha256(text.encode()).hexdigest()}}, dropped


def log_keys(lines: list[str]) -> list[str]:
    return [diagnostic_key(m) for m in map(DIAGNOSTIC.match, lines) if m]


def run(args: argparse.Namespace, tsc: list[str]) -> dict:
    main_tree, wt = args.main.resolve(), args.worktree.resolve()
    measure_worktree.prepare(main_tree, wt)
    items = args.items.read_text().splitlines()
    grouped = items_by_file(items)
    taken: set[str] = set()
    kept: set[str] = set()
    before_log: Path | None = None
    batch_no = 0
    summary = []
    while True:
        finished, outputs = set(), {}
        for directory in args.outputs:
            for n in range(1, len(items) + 1):
                data = read_output(directory / f"{n}.json")
                if data is not None:
                    finished.add(n)
                    outputs.setdefault(n, []).append(data)
        ready = ready_files(grouped, finished, taken)
        done = len(finished) == len(items)
        if ready and (len(ready) >= args.batch or done):
            batch_no += 1
            bench = args.bench / f"batch-{batch_no:02d}"
            bench.mkdir(parents=True, exist_ok=True)
            keys = log_keys(before_log.read_text().splitlines()) if before_log else []
            if not keys:
                before = bench / "base.log"
                result = subprocess.run(tsc, cwd=wt, capture_output=True, text=True)
                before.write_text(result.stdout)
                before_log, keys = before, log_keys(result.stdout.splitlines())
            with (bench / "candidates.jsonl").open("w") as out:
                for file in ready:
                    edits = [e for n in grouped[file] for data in outputs.get(n, []) for e in proposal_edits(data)]
                    candidate, _ = build_candidate(file, (wt / file).read_text(), edits, keys)
                    if candidate:
                        out.write(json.dumps(candidate, ensure_ascii=False) + "\n")
            taken.update(ready)
            step = subprocess.run(
                [sys.executable, str(main_tree / "src/verify/tsc_zero_step.py"), "--root", str(wt),
                 "--candidates", str(bench / "candidates.jsonl"), "--ledger", str(args.ledger.resolve()),
                 "--bench", str(bench), "--before-log", str(before_log), "--seed", str(args.seed + batch_no),
                 "--accept-partial", "--", *tsc],
                cwd=wt, capture_output=True, text=True, env={**os.environ, "PYTHONPATH": str(main_tree / "src")})
            (bench / "report.json").write_text(step.stdout)
            try:
                report = json.loads(step.stdout)
            except ValueError:
                raise RuntimeError(f"el lote {batch_no} no midió: {step.stderr.strip()[-300:]}")
            kept.update(report.get("files_kept", []))
            before_log = bench / "final.log"
            summary.append({"batch": batch_no, "files": len(ready), "total_before": report["total_before"],
                            "total_final": report["total_final"], "tsc_runs": report["tsc_runs"],
                            "kept": len(report.get("files_kept", []))})
            print(json.dumps(summary[-1]), flush=True)
            continue
        if done and not ready:
            break
        time.sleep(args.poll)
    measure_worktree.export(wt, main_tree, sorted(kept))
    result = {"batches": summary, "files_kept": sorted(kept), "final_log": str(before_log) if before_log else None}
    (args.bench / "pipeline.json").write_text(json.dumps(result, ensure_ascii=False, indent=1))
    return result


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if "--" not in argv:
        print("pool_pipeline: falta `--` antes del comando de tsc", file=sys.stderr)
        return 2
    split = argv.index("--")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--main", type=Path, required=True)
    parser.add_argument("--worktree", type=Path, required=True)
    parser.add_argument("--items", type=Path, required=True)
    parser.add_argument("--outputs", type=Path, action="append", required=True)
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--batch", type=int, default=20)
    parser.add_argument("--poll", type=float, default=20)
    args = parser.parse_args(argv[:split])
    result = run(args, argv[split + 1:])
    print(json.dumps({"batches": len(result["batches"]), "files_kept": len(result["files_kept"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
