#!/usr/bin/env python3
"""Planificador del lazo tsc cero: qué propuestas forman el siguiente lote.

Plan: ``kaupamex-docs: …/resolve-all-thyrox-errors/plan-tsc-zero.rst``.

Por proponente se mantiene una posterior Beta sobre su tasa de aceptación::

    Beta(aceptadas + ε·α₀, rechazadas + ε·(1 − α₀)),   ε ∈ [0, 1)

Su media es la α̂ suavizada del plan: con pocas pruebas no afirma una certeza
que la muestra no sostiene, igual que una etiqueta suavizada no pide un 100 %.
Para ELEGIR no se usa la media sino Thompson sampling (CS224R L14, vía
``ai-course-notes``): se muestrea α̃ por proponente y se ordena por
α̃ × objetivos. Así un proponente sin historia tiene oportunidad de probarse en
vez de quedar condenado por una muestra chica.

Esto sólo ORDENA. Aceptar o rechazar una propuesta lo decide siempre la pasada
de ``tsc`` (``bin/batch_verification``).

Qué cuenta en el registro: ``accepted`` a favor; ``rejected`` y ``partial`` en
contra. ``ambiguous`` (el archivo lo tocaban dos propuestas), ``no-targets`` y
``infrastructure`` (un proveedor que lanza, un job muerto) NO cuentan: no son
responsabilidad de la propuesta.

El lote se arma de forma voraz en ese orden, sin dos propuestas que toquen el
mismo archivo: con archivos compartidos, un diagnóstico nuevo no se puede
atribuir.

Uso::

    bin/tsc_schedule --candidates c.jsonl [--ledger v.jsonl] --seed N \\
        [--epsilon 0.5] [--alpha0 0.5] [--max-batch K] > lote.jsonl
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass, field
from pathlib import Path

AGAINST = {"rejected", "partial"}
#: `revealed` tampoco cuenta: la propuesta cerró su objetivo y lo que destapa
#: son contratos reales, que van a la cola residual (`tsc_zero_step`).
IGNORED = {"ambiguous", "no-targets", "infrastructure", "revealed"}
#: Un parámetro de Beta debe ser positivo. Con ε = 0 y sin historia la
#: posterior es impropia; se acota para poder muestrear, y el informe lo
#: publica tal cual.
MIN_SHAPE = 1e-6


def validate_epsilon(epsilon: float) -> float:
    if not 0 <= epsilon < 1:
        raise ValueError(f"ε debe estar en [0, 1): {epsilon}")
    return epsilon


def posterior(accepted: int, rejected: int, epsilon: float, alpha0: float) -> tuple[float, float]:
    validate_epsilon(epsilon)
    if not 0 <= alpha0 <= 1:
        raise ValueError(f"α₀ es una probabilidad: {alpha0}")
    return accepted + epsilon * alpha0, rejected + epsilon * (1 - alpha0)


def count_ledger(rows) -> dict[str, tuple[int, int]]:
    counts: dict[str, list[int]] = {}
    for row in rows:
        outcome = row["outcome"]
        if outcome in IGNORED:
            continue
        pair = counts.setdefault(row["proposer"], [0, 0])
        if outcome == "accepted":
            pair[0] += 1
        elif outcome in AGAINST:
            pair[1] += 1
        else:
            raise ValueError(f"veredicto desconocido: {outcome!r}")
    return {proposer: (a, r) for proposer, (a, r) in counts.items()}


@dataclass(frozen=True)
class Candidate:
    proposal_id: str
    proposer: str
    targets: int
    files: frozenset[str]


@dataclass
class ScheduleReport:
    selected: list[Candidate]
    seed: int
    epsilon: float
    alpha0: float
    samples: dict[str, dict[str, float]] = field(default_factory=dict)


def schedule(candidates: list[Candidate], ledger, epsilon: float, alpha0: float,
             seed: int, max_batch: int | None = None) -> ScheduleReport:
    counts = count_ledger(ledger)
    rng = random.Random(seed)
    samples: dict[str, dict[str, float]] = {}
    for proposer in sorted({c.proposer for c in candidates}):
        a, b = posterior(*counts.get(proposer, (0, 0)), epsilon, alpha0)
        theta = rng.betavariate(max(a, MIN_SHAPE), max(b, MIN_SHAPE))
        samples[proposer] = {"a": a, "b": b, "theta": theta}
    ranked = sorted(candidates,
                    key=lambda c: (-samples[c.proposer]["theta"] * c.targets, c.proposal_id))
    selected: list[Candidate] = []
    used: set[str] = set()
    for candidate in ranked:
        if max_batch is not None and len(selected) >= max_batch:
            break
        if candidate.files & used:
            continue
        selected.append(candidate)
        used |= candidate.files
    return ScheduleReport(selected, seed, epsilon, alpha0, samples)


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--candidates", type=Path, required=True)
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--epsilon", type=float, default=0.5)
    parser.add_argument("--alpha0", type=float, default=0.5)
    parser.add_argument("--max-batch", type=int)
    args = parser.parse_args(argv)
    try:
        candidates = [Candidate(r["proposal_id"], r["proposer"], len(r["targets"]),
                                frozenset(r["files"])) for r in _read_jsonl(args.candidates)]
        by_id = {r["proposal_id"]: r for r in _read_jsonl(args.candidates)}
        ledger = _read_jsonl(args.ledger) if args.ledger else []
        report = schedule(candidates, ledger, args.epsilon, args.alpha0, args.seed, args.max_batch)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"tsc_schedule: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    for candidate in report.selected:
        print(json.dumps(by_id[candidate.proposal_id], ensure_ascii=False))
    print(json.dumps({"seed": report.seed, "epsilon": report.epsilon, "alpha0": report.alpha0,
                      "samples": report.samples, "selected": len(report.selected),
                      "candidates": len(candidates)}, ensure_ascii=False), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
