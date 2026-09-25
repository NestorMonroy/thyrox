#!/usr/bin/env python3
"""El driver por fases del lazo tsc cero (plan v3: tres rutas).

    tsc_cycle classify --log L --packages P --out O.json
    tsc_cycle status   --bench STEP [--job-dir J]
    tsc_cycle reject   --run RUN --bench STEP --file F --lesson L

Cada fase es un subcomando que lee y escribe en el banco del paso, así una
fase se repite sin rehacer las anteriores. `tsc_zero_loop` sigue siendo el
lazo de proponentes deterministas; éste envuelve lo que hasta el paso 112 se
hacía a mano: pool, pipeline, revisión, rechazo, memoria y cierre.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import subprocess
import sys
from pathlib import Path

from verify import tsc_reflect, tsc_routes


def cmd_classify(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    if not diagnostics:
        # Un log vacío no distingue «cero errores» de «tsc no corrió»: el
        # veredicto de cero lo da la medición, no la clasificación.
        print(f"tsc_cycle classify: {args.log} sin diagnósticos — no se clasifica nada", file=sys.stderr)
        return 2
    duplicates = tsc_routes.duplicated_types(args.packages)
    routes = tsc_routes.classify(diagnostics, duplicates)
    counts = {"total": len(diagnostics), **{name: len(found) for name, found in routes.items()}}
    data = {
        "log": str(args.log),
        "counts": counts,
        "queue": tsc_routes.shared_queue(routes["shared"], duplicates),
        "routes": {name: [f"{d.file}({d.line}): {d.code}: {d.message}" for d in found]
                   for name, found in routes.items()},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("classify: " + " ".join(f"{k}={v}" for k, v in counts.items()) + f" duplicated_types={len(duplicates)}"
          f" -> {args.out}")
    return 0


def job_state(job_dir: Path | None) -> str:
    """`running`/`ended` según el pid que `thyrox-bg` escribe en `outputs/pid`.

    Paso 111: un `pgrep | head -1` devolvió el pid del shell que LANZÓ el
    trabajo, que muere al instante, y la espera concluyó «murió sin marcador»
    con el trabajo vivo. El pid sale del archivo del trabajo, nunca de pgrep;
    sin archivo el estado es `unknown`, no `ended`.
    """
    pid_file = job_dir / "outputs" / "pid" if job_dir else None
    if pid_file is None or not pid_file.is_file():
        return "unknown"
    try:
        os.kill(int(pid_file.read_text().split()[0]), 0)
    except (ValueError, IndexError):
        return "unknown"
    except ProcessLookupError:
        return "ended"
    except PermissionError:
        return "running"
    return "running"


def cmd_status(args) -> int:
    items_file = args.bench / "items.txt"
    items = [l for l in items_file.read_text().splitlines() if l.strip()] if items_file.is_file() else []
    endings: collections.Counter = collections.Counter()
    outputs = sorted((args.bench / "outputs").glob("*.json"))
    for path in outputs:
        try:
            endings[json.loads(path.read_text()).get("subtype", "unknown")] += 1
        except (OSError, ValueError):
            endings["unreadable"] += 1
    print(f"status: outputs={len(outputs)}/{len(items)} " + " ".join(f"{k}={v}" for k, v in sorted(endings.items()))
          + f" job={job_state(args.job_dir)}")
    for report in sorted((args.bench / "pipeline").glob("batch-*/report.json")):
        data = json.loads(report.read_text())
        print(f"  {report.parent.name} {data.get('total_before')}->{data.get('total_final')}"
              f" kept={len(data.get('files_kept', []))}")
    return 0


def accepting_batch(bench: Path, file: str) -> Path | None:
    proposal = f"agent:pool:{file}"
    for report in sorted((bench / "pipeline").glob("batch-*/report.json")):
        if proposal in json.loads(report.read_text()).get("accepted", []):
            return report.parent
    return None


def before_log(batch: Path) -> Path | None:
    """El «antes» de un lote: su `base.log` o, desde el segundo, el `final.log` del anterior.

    Paso 110: tres reflexiones salieron SIN MEDIR porque se pidió el
    `base.log` de lotes que no lo tienen — el pipeline mide la base una sola
    vez, y cada lote parte del final del anterior.
    """
    if (batch / "base.log").is_file():
        return batch / "base.log"
    previous = sorted(p for p in batch.parent.glob("batch-*") if p.name < batch.name)
    if previous and (previous[-1] / "final.log").is_file():
        return previous[-1] / "final.log"
    return None


def cmd_reject(args) -> int:
    batch = accepting_batch(args.bench, args.file)
    if batch is None:
        print(f"tsc_cycle reject: ningún lote de {args.bench} aceptó {args.file} — no se revierte nada",
              file=sys.stderr)
        return 2
    before = before_log(batch)
    if before is None or not (batch / "batch.log").is_file():
        print(f"tsc_cycle reject: {batch.name} no tiene «antes» o batch.log — no se revierte nada", file=sys.stderr)
        return 2
    subprocess.run(["git", "checkout", "--", args.file], check=True, capture_output=True)
    proposal = f"agent:pool:{args.file}"
    with (args.run / "ledger.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"proposal_id": proposal, "proposer": "agent", "outcome": "rejected-review",
                                 "targets_before": 0, "targets_after": 0, "new_diagnostics": [],
                                 "total_before": 0, "total_after": 0}) + "\n")
    tsc_reflect.add(args.run, proposal, [args.file], args.lesson, before.read_text().splitlines(),
                    (batch / "batch.log").read_text().splitlines())
    kept = args.bench / "kept.txt"
    if kept.is_file():
        remaining = [l for l in kept.read_text().splitlines() if l.strip() and l != args.file]
        kept.write_text("".join(f"{l}\n" for l in remaining))
    print(f"reject: {args.file} revertido y registrado ({batch.name}, antes={before.name})")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("classify", help="reparte los diagnósticos de un log en las tres rutas")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--packages", type=Path, default=Path("src/packages"))
    p.add_argument("--out", type=Path, required=True)
    p.set_defaults(func=cmd_classify)
    p = sub.add_parser("status", help="progreso del paso sin bloquear: pool, lotes y trabajo")
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--job-dir", type=Path)
    p.set_defaults(func=cmd_status)
    p = sub.add_parser("reject", help="revierte un archivo rechazado en revisión y lo registra")
    p.add_argument("--run", type=Path, required=True)
    p.add_argument("--bench", type=Path, required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--lesson", required=True)
    p.set_defaults(func=cmd_reject)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
