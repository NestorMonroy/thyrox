#!/usr/bin/env python3
"""El informe de un paso del lazo, por capas separadas.

Origen: self-evolving-agents-2026, lección 2: «informar por separado la
eficiencia del sistema, la eficiencia de los datos, la capacidad final y el
costo, para evitar atribuir por completo la mejora de una sola capa». El
solape entre pasos, por ejemplo, mejora la primera y no toca la segunda.

- **system**: pared del pool y fracción a ancho completo (del `joblog.tsv`
  de GNU Parallel), la cola lenta (ítem más lento sobre la mediana), ítems
  fallidos y pasadas de tsc del pipeline.
- **data**: propuestas juzgadas, aceptadas (`accepted*`) y tasa.
- **capability**: total de tsc del primer lote al último.
- **cost**: tokens equivalentes ponderados (in 1×, escritura de caché
  1.25×, lectura 0.1×, salida 5×), la cifra que el proyecto cita; el USD
  de las salidas es precio de lista y no se publica como costo.

Ciega a: el tiempo entre pasos (commit, plan, lanzamiento), que no vive en
el banco de un paso; y a un ítem cuya salida no trae `usage`.

Uso: ``bin/step_report --bench <paso> [--pipeline <dir>]``
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path

#: Pesos del costo equivalente (calibration-verified-numbers: la cifra que se cita).
WEIGHTS = {"input_tokens": 1.0, "cache_creation_input_tokens": 1.25, "cache_read_input_tokens": 0.1,
           "output_tokens": 5.0}


def _joblog(bench: Path) -> list[tuple[int, float, float, int]]:
    """(Seq, inicio, duración, código) por fila. El joblog registra los ítems
    en orden de término: el ítem es la columna Seq, no la posición."""
    path = bench / "outputs" / "joblog.tsv"
    rows = []
    for line in path.read_text().splitlines()[1:] if path.is_file() else []:
        cells = line.split("\t")
        if len(cells) >= 7:
            rows.append((int(cells[0]), float(cells[2]), float(cells[3]), int(cells[6])))
    return rows


def _system(bench: Path, batches: list[dict]) -> dict:
    jobs = _joblog(bench)
    events = sorted([(start, 1) for _, start, _, _ in jobs] + [(start + run, -1) for _, start, run, _ in jobs])
    width = peak = 0
    at_width: dict[int, float] = {}
    previous = None
    for moment, change in events:
        if previous is not None:
            at_width[width] = at_width.get(width, 0.0) + moment - previous
        width += change
        peak = max(peak, width)
        previous = moment
    wall = (max(s + r for _, s, r, _ in jobs) - min(s for _, s, _, _ in jobs)) if jobs else 0.0
    runtimes = [run for _, _, run, _ in jobs]
    failed = {seq for seq, _, _, code in jobs if code != 0}
    for path in (bench / "outputs").glob("*.json"):
        try:
            if path.stem.isdigit() and json.loads(path.read_text()).get("is_error"):
                failed.add(int(path.stem))
        except ValueError:
            continue
    return {"pool_wall_s": round(wall, 3), "pool_width": peak,
            "full_width_share": round(at_width.get(peak, 0.0) / wall, 4) if wall else 0.0,
            "straggler_ratio": round(max(runtimes) / statistics.median(runtimes), 3) if runtimes else 0.0,
            "failed_items": len(failed), "tsc_runs": sum(b.get("tsc_runs", 0) for b in batches)}


def step_report(bench: Path, pipeline: Path) -> dict:
    batches = [json.loads(p.read_text()) for p in sorted(pipeline.glob("batch-*/report.json"))]
    batches = [b for b in batches if "total_before" in b]
    if not batches:
        raise ValueError(f"{pipeline} no tiene lotes medidos: sin ellos no hay informe, y un cero no "
                         "distinguiría «no avanzó» de «no se midió»")
    outcomes = [o for b in batches for o in (b.get("outcomes") or {}).values()]
    accepted = sum(1 for o in outcomes if o.startswith("accepted"))
    equiv = 0.0
    for path in sorted((bench / "outputs").glob("*.json")):
        try:
            usage = json.loads(path.read_text()).get("usage") or {}
        except ValueError:
            continue
        equiv += sum(usage.get(key, 0) * weight for key, weight in WEIGHTS.items())
    return {
        "system": _system(bench, batches),
        "data": {"proposals": len(outcomes), "accepted": accepted,
                 "acceptance": round(accepted / len(outcomes), 4) if outcomes else 0.0},
        "capability": {"total_before": batches[0]["total_before"], "total_final": batches[-1]["total_final"],
                       "delta": batches[-1]["total_final"] - batches[0]["total_before"]},
        "cost": {"equiv_tokens": round(equiv, 1),
                 "equiv_per_accepted": round(equiv / accepted, 1) if accepted else None},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--bench", type=Path, required=True)
    parser.add_argument("--pipeline", type=Path, help="el directorio del pipeline (por defecto <bench>/pipeline)")
    args = parser.parse_args(argv)
    try:
        report = step_report(args.bench, args.pipeline or args.bench / "pipeline")
    except (OSError, ValueError) as error:
        print(f"step_report: REHÚSA — {error}", file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
