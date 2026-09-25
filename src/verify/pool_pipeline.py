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
from verify import measure_worktree, prefix_speculation, tsc_reflect, tsc_sweep
from verify.file_edits import apply_files
from verify.tsc_zero_step import ABSENT_BASE
from verify.tsc_zero_step import _append as append_ledger

HERE = Path(__file__).resolve().parent
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


def build_module_candidate(unit: str, root: Path, edits: list[dict], before_keys: list[str],
                           target_files: list[str]) -> tuple[dict | None, list[tuple[str, str]]]:
    """El candidato de un módulo: ediciones `{file, old_string, new_string,
    replace_all}` sobre varios archivos, aplicadas por el aplicador de la
    herramienta `Edit` (`tool-registry/bin/applyEdits.ts`, vía `file_edits`).
    Un archivo con una edición rechazada cae entero —en el binario falla la
    llamada entera—. Los objetivos son los
    diagnósticos de los archivos tocados y de los consumidores del ítem."""
    by_file: dict[str, list[dict]] = {}
    for edit in edits:
        by_file.setdefault(edit.get("file", ""), []).append(edit)
    texts: dict[str, tuple[str | None, str]] = {}
    dropped: list[tuple[str, str]] = []
    proposed = []
    for file, file_edits in by_file.items():
        if any(SILENCE.search(e.get("new_string", "")) and not SILENCE.search(e.get("old_string", ""))
               for e in file_edits):
            dropped.append((file, "silencia"))
            continue
        path = root / file
        proposed.append({"path": file, "content": path.read_text() if file and path.is_file() else None,
                         "edits": file_edits})
    current = {p["path"]: p["content"] for p in proposed}
    for file, row in apply_files(proposed).items():
        if "error" in row:
            dropped.append((file, row["error"]))
        else:
            texts[file] = (current[file], row["updatedFile"])
    if not texts:
        return None, dropped
    files = sorted(texts)
    reach = set(files) | set(target_files)
    targets = sorted(k for k in before_keys if k.split(": ", 1)[0] in reach)
    candidate = {
        "proposal_id": f"agent:pool:{unit}", "proposer": "agent", "targets": targets, "files": files,
        "edits": [{"file": f, "start": 0, "length": len(texts[f][0] or ""), "newText": texts[f][1]}
                  for f in files],
        "bases": {f: ABSENT_BASE if texts[f][0] is None else hashlib.sha256(texts[f][0].encode()).hexdigest()
                  for f in files}}
    return candidate, dropped


def log_keys(lines: list[str]) -> list[str]:
    return [diagnostic_key(m) for m in map(DIAGNOSTIC.match, lines) if m]


def step_command(wt: Path, candidates: Path, *, ledger: Path, bench_dir: Path, before_log: Path, seed: int,
                 tsc: list[str], net: bool = False) -> list[str]:
    """El paso de medición de un lote. `net` es la política de la ruta 2:
    conservar un cambio que baja el total aunque destape contratos."""
    return [sys.executable, str(HERE / "tsc_zero_step.py"), "--root", str(wt), "--candidates", str(candidates),
            "--ledger", str(ledger), "--bench", str(bench_dir), "--before-log", str(before_log),
            "--seed", str(seed), "--accept-partial", *(["--net"] if net else []), "--", *tsc]


def _speculative_batch(worktrees: list[Path], rows: list[dict], tsc: list[str], bench: Path, before_log: Path,
                       ledger: Path, taken: set[str], kept: set[str], batch_no: int) -> tuple[Path, dict]:
    """Un lote de la ruta 2 en N worktrees: mide los prefijos a la vez y
    decide cada unidad contra el log del prefijo anterior. Lo que queda sin
    decidir —medido encima de un rechazo, o fuera del prefijo por cruzar
    archivos— se libera para la ronda siguiente."""
    before_lines = before_log.read_text().splitlines()
    prefix = prefix_speculation.disjoint_prefix(rows, len(worktrees))
    decision = prefix_speculation.run_round(worktrees, prefix, tsc, bench, before_lines)
    in_prefix = {row["proposal_id"] for row in prefix}
    for row in decision.undecided + [r for r in rows if r["proposal_id"] not in in_prefix]:
        taken.difference_update(row["files"])
    by_id = {row["proposal_id"]: row for row in prefix}
    kept_files = sorted({f for pid in decision.kept for f in by_id[pid]["files"]})
    kept.update(kept_files)
    total_before = sum(1 for m in map(DIAGNOSTIC.match, before_lines) if m)
    total_final = sum(1 for m in map(DIAGNOSTIC.match, decision.final_lines) if m)
    append_ledger(ledger, [{"proposal_id": pid, "proposer": by_id[pid]["proposer"], "outcome": outcome,
                            "total_before": total_before, "total_after": total_final}
                           for pid, outcome in decision.outcomes.items()])
    final = bench / "final.log"
    final.write_text("\n".join(decision.final_lines) + "\n")
    (bench / "report.json").write_text(json.dumps({"kept": decision.kept, "outcomes": decision.outcomes,
                                                   "undecided": [r["proposal_id"] for r in decision.undecided],
                                                   "files_kept": kept_files}, ensure_ascii=False))
    return final, {"batch": batch_no, "files": len(prefix), "total_before": total_before,
                   "total_final": total_final, "tsc_runs": len(prefix), "kept": len(kept_files),
                   "worktrees": len(worktrees)}


class GateBlocked(RuntimeError):
    """Un gate del plan v2.2.0 no se cumplió: el ciclo se detiene con este
    error explícito en vez de seguir por el camino reactivo (H-THYROX-186)."""


# Los campos con que la plantilla de la ruta 3 pide cada patrón.
PATTERN_FIELDS = ("patron", "senal_del_verificador", "fix_generico")


#: El prefijo que el log crudo de tsc pone antes del código y que la clave de
#: diagnóstico (`diagnostic_key`) no lleva: una señal que lo copia no casa
#: con nada.
RAW_LOG_PREFIX = re.compile(r"(?<![\w-])error (?=TS\d)")


def record_patterns(run: Path, outputs_for_file: dict[str, list[dict]], kept: list[str],
                    keys: list[str] | None = None) -> list[str]:
    """Gate 3b, la mitad que escribe: el patrón que cada archivo conservado
    trajo en su salida va a la memoria (`patterns.jsonl` de la corrida) con
    los cuatro campos, y su `applied` nombra el archivo. Devuelve los motivos
    de los patrones que no se pudieron guardar.

    Con `keys` (las claves de diagnóstico de antes del lote) cada señal se
    valida contra los diagnósticos de SU archivo: una que no casa con ninguno
    no cubre lo conservado y ensuciaría la memoria, así que no entra y el
    motivo la nombra. Antes se quita el prefijo `error ` que el log crudo
    lleva y la clave no (medido en el paso 155)."""
    problems = []
    for file in kept:
        for output in outputs_for_file.get(file, []):
            block = re.search(r"\{.*\}", output.get("result", "") or "", re.S)
            try:
                patterns = json.loads(block.group(0)).get("patterns", []) if block else []
            except ValueError:
                patterns = []
            for pattern in patterns or []:
                if not all(str(pattern.get(field, "")).strip() for field in PATTERN_FIELDS):
                    problems.append(f"{file}: patrón sin los campos {', '.join(PATTERN_FIELDS)}")
                    continue
                signal = RAW_LOG_PREFIX.sub("", pattern["senal_del_verificador"])
                if keys is not None:
                    own = [k for k in keys if k.startswith(f"{file}: ")]
                    try:
                        matches = [k for k in own if re.search(signal, k)]
                    except re.error as error:
                        problems.append(f"{file}: {pattern['patron']}: {error}")
                        continue
                    if not matches:
                        problems.append(f"{file}: {pattern['patron']}: la señal {signal!r} no casa con "
                                        f"ninguno de los {len(own)} diagnóstico(s) del archivo")
                        continue
                try:
                    tsc_sweep.add_pattern(run, {"name": pattern["patron"],
                                                "signal": signal,
                                                "fix": pattern["fix_generico"]})
                except (ValueError, re.error) as error:
                    problems.append(f"{file}: {pattern['patron']}: {error}")
                    continue
                tsc_sweep.mark_applied(run, pattern["patron"], [file])
    return problems


def memory_gate(run: Path, batch: Path, problems: list[str]) -> None:
    """Gate 3b, la mitad que bloquea: todo archivo que el lote conservó tiene
    que quedar cubierto por un patrón cuya señal casa con sus objetivos
    (`tsc_reflect.uncovered_by_memory`)."""
    missing = tsc_reflect.uncovered_by_memory(run, batch)
    if missing:
        detail = "; ".join(problems) if problems else "ninguna salida trajo un patrón válido"
        raise GateBlocked(f"GATE 3b BLOQUEADO: {batch.name} conservó {', '.join(missing)} sin una entrada "
                          f"de memoria que lo cubra ({detail}). No se exporta ni se continúa.")


SWEEP_UNIT = "pattern:"


def settle_sweep(run: Path, unit: str, listed: list[str], kept: list[str], step: str) -> dict | None:
    """Gate 4, la mitad que asienta: los archivos del patrón que el paso
    conservó se marcan como aplicados; los que no, se excluyen con una razón
    que cita el paso. Sin este asiento, la ruta sweep volvería a ofrecer los
    mismos archivos y el gate no se liberaría. Una unidad que no es de patrón
    devuelve None: no hay memoria que asentar."""
    if not unit.startswith(SWEEP_UNIT):
        return None
    name = unit[len(SWEEP_UNIT):]
    applied = sorted(set(listed) & set(kept))
    excluded = sorted(set(listed) - set(kept))
    if applied:
        tsc_sweep.mark_applied(run, name, applied)
    if excluded:
        tsc_sweep.exclude_files(run, name, excluded,
                                f"{step}: el barrido no conservó el arreglo en este archivo")
    return {"applied": applied, "excluded": excluded}


def next_base(bench: Path, previous: Path | None) -> Path | None:
    """La base del lote siguiente: el `final.log` de éste si lo escribió. Un
    lote sin candidatas aplicadas no mide ni escribe (paso 137 murió al leerlo
    y no exportó lo conservado)."""
    final = bench / "final.log"
    return final if final.is_file() else previous


def run(args: argparse.Namespace, tsc: list[str]) -> dict:
    # Uno o varios worktrees. Con varios y la política neta, cada lote mide
    # prefijos a la vez (`prefix_speculation`); el primero es el que exporta.
    worktrees = [w.resolve() for w in (args.worktree if isinstance(args.worktree, list) else [args.worktree])]
    main_tree, wt = args.main.resolve(), worktrees[0]
    speculative = len(worktrees) > 1 and getattr(args, "net", False)
    # El paso corre con cwd en el worktree: toda ruta relativa al árbol
    # principal se rompería ahí (el primer lote real murió así).
    args.bench, args.items, args.ledger = args.bench.resolve(), args.items.resolve(), args.ledger.resolve()
    args.outputs = [d.resolve() for d in args.outputs]
    for worktree in worktrees:
        measure_worktree.prepare(main_tree, worktree)
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
        if speculative:
            ready = ready[:len(worktrees)]
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
            rows: list[dict] = []
            with (bench / "candidates.jsonl").open("w") as out:
                for file in ready:
                    edits = [e for n in grouped[file] for data in outputs.get(n, []) for e in proposal_edits(data)]
                    if getattr(args, "unit", "file") == "module":
                        # El ítem de un módulo es `<unidad> <entrada> [consumidores…]`.
                        consumers = sorted({c for n in grouped[file] for c in items[n - 1].split()[2:]})
                        candidate, _ = build_module_candidate(file, wt, edits, keys, consumers)
                    else:
                        candidate, _ = build_candidate(file, (wt / file).read_text(), edits, keys)
                    if candidate:
                        rows.append(candidate)
                        out.write(json.dumps(candidate, ensure_ascii=False) + "\n")
            taken.update(ready)
            if speculative:
                before_log, entry = _speculative_batch(worktrees, rows, tsc, bench, before_log, args.ledger,
                                                       taken, kept, batch_no)
                summary.append(entry)
                print(json.dumps(entry), flush=True)
                continue
            step = subprocess.run(
                step_command(wt, bench / "candidates.jsonl", ledger=args.ledger.resolve(), bench_dir=bench,
                             before_log=before_log, seed=args.seed + batch_no, tsc=tsc,
                             net=getattr(args, "net", False)),
                cwd=wt, capture_output=True, text=True, env={**os.environ, "PYTHONPATH": str(HERE.parent)})
            (bench / "report.json").write_text(step.stdout)
            try:
                report = json.loads(step.stdout)
            except ValueError:
                raise RuntimeError(f"el lote {batch_no} no midió: {step.stderr.strip()[-300:]}")
            kept_now = report.get("files_kept", [])
            if kept_now and getattr(args, "unit", "file") == "file":
                problems = record_patterns(args.ledger.parent, {
                    file: [data for n in grouped.get(file, []) for data in outputs.get(n, [])]
                    for file in kept_now}, kept_now, keys)
                memory_gate(args.ledger.parent, bench, problems)
            if getattr(args, "unit", "file") == "module":
                for unit in ready:
                    listed = sorted({f for n in grouped[unit] for f in items[n - 1].split()[2:]})
                    settle_sweep(args.ledger.parent, unit, listed, kept_now, bench.name)
            kept.update(kept_now)
            before_log = next_base(bench, before_log)
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
    parser.add_argument("--worktree", type=Path, action="append", required=True,
                        help="repetible: con más de uno y --net, cada lote mide prefijos a la vez")
    parser.add_argument("--items", type=Path, required=True)
    parser.add_argument("--outputs", type=Path, action="append", required=True)
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--batch", type=int, default=20)
    parser.add_argument("--poll", type=float, default=20)
    parser.add_argument("--unit", choices=("file", "module"), default="file",
                        help="unidad de un ítem: un archivo, o un módulo que edita varios")
    parser.add_argument("--net", action="store_true",
                        help="política neta del paso: conserva lo que baja el total aunque destape contratos")
    args = parser.parse_args(argv[:split])
    try:
        result = run(args, argv[split + 1:])
    except GateBlocked as error:
        # Exit 3: un gate del plan, distinto de un fallo del proceso (1).
        print(error, file=sys.stderr)
        return 3
    print(json.dumps({"batches": len(result["batches"]), "files_kept": len(result["files_kept"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
