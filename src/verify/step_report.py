#!/usr/bin/env python3
"""El informe de un paso del lazo, por capas separadas.

Origen: self-evolving-agents-2026, lección 2: «informar por separado la
eficiencia del sistema, la eficiencia de los datos, la capacidad final y el
costo, para evitar atribuir por completo la mejora de una sola capa». El
solape entre pasos, por ejemplo, mejora la primera y no toca la segunda.

- **system**: pared del pool y fracción a ancho completo (del `joblog.tsv`
  de GNU Parallel), la cola lenta (ítem más lento sobre la mediana), ítems
  fallidos, pasadas de tsc del pipeline y la memoria pico de los ítems (de
  los `<n>.time` de GNU Time), que es con lo que se fija `--memfree`.
- **data**: propuestas juzgadas, aceptadas (`accepted*`) y tasa.
- **capability**: total de tsc del primer lote al último.
- **cost**: tokens equivalentes con los cocientes del tier del modelo de
  cada salida (`model_catalog.equivalent_tokens_with_basis`), la cifra que
  el proyecto cita, y la base usada por modelo; una salida sin modelo o con
  un modelo fuera del catálogo cae a la fórmula fija y lo declara. El USD de
  las salidas es precio de lista y no se publica como costo.

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

from agents import model_catalog

#: La etiqueta de una salida que no declara su modelo.
NO_MODEL = "(sin modelo)"


def _item_costs(result: dict, catalog: dict | None) -> list[tuple[str, float, str]]:
    """(modelo, tokens equivalentes, base) de una salida de ``claude -p``.
    Con un solo modelo se usa ``usage``, que trae el reparto de la escritura
    por TTL; con varios, el ``modelUsage`` de cada uno, sin ese reparto."""
    models = result.get("modelUsage") or {}
    if len(models) > 1:
        usages = {model: {"input_tokens": u.get("inputTokens", 0),
                          "cache_creation_tokens": u.get("cacheCreationInputTokens", 0),
                          "cache_read_tokens": u.get("cacheReadInputTokens", 0),
                          "output_tokens": u.get("outputTokens", 0)} for model, u in models.items()}
    else:
        model = next(iter(models), None)
        usages = {model: model_catalog.usage_from_result(result.get("usage") or {})}
    return [(model or NO_MODEL, *model_catalog.equivalent_tokens_with_basis(catalog, model, usage))
            for model, usage in usages.items()]


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
            "failed_items": len(failed), "tsc_runs": sum(b.get("tsc_runs", 0) for b in batches),
            "memory_kb": _memory(bench)}


def _memory(bench: Path) -> dict:
    """La memoria pico de los ítems, de los ``<n>.time`` que ``headless-pool``
    escribe con GNU Time. Sin ninguno, ``measured: 0`` y nada más: una medida
    ausente no es un cero. Una línea ilegible no cuenta como medida."""
    peaks = []
    for path in (bench / "outputs").glob("*.time"):
        first = path.read_text(errors="ignore").split()
        if first and first[0].isdigit():
            peaks.append(int(first[0]))
    if not peaks:
        return {"measured": 0}
    return {"measured": len(peaks), "max": max(peaks), "median": int(statistics.median(peaks))}


def _first_request(path: Path) -> tuple[int, int] | None:
    """(leídos, escritos) de caché en la primera petición de un ítem: el
    primer evento ``assistant`` de su ``<n>.stream.jsonl``. Una línea que no
    es JSON (truncada por un timeout) se salta."""
    for line in path.read_text(errors="ignore").splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        usage = (event.get("message") or {}).get("usage") if event.get("type") == "assistant" else None
        if usage:
            return usage.get("cache_read_input_tokens", 0), usage.get("cache_creation_input_tokens", 0)
    return None


def _cache_prefix(bench: Path) -> dict:
    """El prefijo compartido (sistema, herramientas y plantilla), medido en
    la primera petición de cada ítem. El ítem que arrancó primero dice si el
    prefijo sobrevivió al intervalo desde el paso anterior; lo que leen los
    demás estima su tamaño. Sin streams, ``measured: 0``; con uno solo no
    hay tamaño que estimar y la clave no se publica."""
    first = {}
    for path in (bench / "outputs").glob("*.stream.jsonl"):
        stem = path.name.split(".")[0]
        request = _first_request(path) if stem.isdigit() else None
        if request:
            first[int(stem)] = request
    if not first:
        return {"measured": 0}
    starts = {seq: start for seq, start, _, _ in _joblog(bench)}
    opener = min(first, key=lambda seq: (starts.get(seq, float("inf")), seq))
    read, write = first[opener]
    report = {"measured": len(first), "first_item": {"item": opener, "read": read, "write": write}}
    others = [r for seq, (r, _) in first.items() if seq != opener]
    if others:
        prefix = int(statistics.median(others))
        report.update(prefix_tokens=prefix,
                      first_item_read_share=round(read / prefix, 4) if prefix else None,
                      write_median=int(statistics.median(w for _, w in first.values())))
    return report


def step_report(bench: Path, pipeline: Path) -> dict:
    batches = [json.loads(p.read_text()) for p in sorted(pipeline.glob("batch-*/report.json"))]
    batches = [b for b in batches if "total_before" in b]
    if not batches:
        raise ValueError(f"{pipeline} no tiene lotes medidos: sin ellos no hay informe, y un cero no "
                         "distinguiría «no avanzó» de «no se midió»")
    outcomes = [o for b in batches for o in (b.get("outcomes") or {}).values()]
    accepted = sum(1 for o in outcomes if o.startswith("accepted"))
    catalog, _ = model_catalog.try_catalog()
    equiv, basis = 0.0, {}
    for path in sorted((bench / "outputs").glob("*.json")):
        try:
            result = json.loads(path.read_text())
        except ValueError:
            continue
        for model, value, model_basis in _item_costs(result, catalog):
            equiv += value
            basis[model] = model_basis
    return {
        "system": _system(bench, batches),
        "data": {"proposals": len(outcomes), "accepted": accepted,
                 "acceptance": round(accepted / len(outcomes), 4) if outcomes else 0.0},
        "capability": {"total_before": batches[0]["total_before"], "total_final": batches[-1]["total_final"],
                       "delta": batches[-1]["total_final"] - batches[0]["total_before"]},
        "cost": {"equiv_tokens": round(equiv, 1), "basis": basis, "cache_prefix": _cache_prefix(bench),
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
