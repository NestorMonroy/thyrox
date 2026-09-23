#!/usr/bin/env python3
"""Verificar N arreglos de `TS2305` con UNA pasada de `tsc`, y juzgar cada uno.

La adaptacion de speculative decoding al ciclo de errores
----------------------------------------------------------
En speculative decoding un borrador barato propone varios tokens y el modelo
caro los verifica todos en una sola pasada, aceptando o rechazando CADA uno
(`measurement/rejection_sampling.py`). Aqui el `tsc --noEmit` completo es el
objetivo caro —2 GB y del orden de minutos en este arbol— y cada arreglo de un
proveedor es una propuesta. En vez de un `tsc` por arreglo, se aplican varios
y se verifican juntos; este modulo reparte el veredicto por propuesta:

  accepted   las aristas `TS2305` del proveedor bajan a cero;
  partial    bajan sin llegar a cero;
  rejected   no bajan;
  no-edges   el proveedor no tenia aristas: no habia nada que aceptar.

`acceptance_rate` es la fraccion aceptada de las propuestas CON objeto, que es
la `alpha` del brief: mide cuanto rinde cada pasada del objetivo.

Por que el total no basta
--------------------------
Es la leccion de la perplexity aplicada a este ciclo: dos cifras totales solo
se comparan sobre el mismo universo (5 023 contra 4 919 fue el mismo commit con
dos linkers). Y aun sobre el mismo universo, un total que baja puede esconder
una propuesta que no rindio y un diagnostico nuevo que nadie reclama. Por eso
el lote reporta aparte los diagnosticos NUEVOS, y solo es limpio si todas las
propuestas con objeto se aceptan y no aparece ninguno.

Identidad estable
-----------------
La clave de un diagnóstico es ``archivo: código: mensaje``. Línea y columna
son coordenadas de presentación: una edición que inserta texto no convierte
un diagnóstico preexistente en uno nuevo.

Salidas del CLI: 0 lote limpio · 1 lote con rechazos o diagnosticos nuevos ·
2 un log ilegible o sin diagnosticos previos.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC, analyze, diagnostic_key


@dataclass(frozen=True)
class Verdict:
    provider: str
    edges_before: int
    edges_after: int
    outcome: str


@dataclass(frozen=True)
class Proposal:
    """Una edición propuesta por cualquier mecanismo del lazo."""

    proposal_id: str
    proposer: str
    targets: frozenset[str]
    files: frozenset[str]


@dataclass(frozen=True)
class ProposalVerdict:
    proposal_id: str
    proposer: str
    targets_before: int
    targets_after: int
    new_diagnostics: list[str]
    outcome: str


@dataclass(frozen=True)
class BatchReport:
    verdicts: list[Verdict | ProposalVerdict]
    total_before: int
    total_after: int
    new_diagnostics: list[str] = field(default_factory=list)

    @property
    def acceptance_rate(self) -> float:
        with_object = [
            v for v in self.verdicts
            if v.outcome not in ("no-edges", "no-targets")
        ]
        if not with_object:
            return 0.0
        return sum(v.outcome == "accepted" for v in with_object) / len(with_object)

    @property
    def clean(self) -> bool:
        return (not self.new_diagnostics
                and all(v.outcome in ("accepted", "no-edges", "no-targets")
                        for v in self.verdicts))


def _edges_by_provider(lines) -> Counter:
    counts: Counter = Counter()
    for edge in analyze(lines)["missing_exports"]:
        counts[edge["provider"]] += edge["count"]
    return counts


def diagnostic_key_from_line(raw: str) -> str:
    match = DIAGNOSTIC.match(raw.rstrip("\n"))
    if not match:
        raise ValueError(f"la línea no es un diagnóstico TypeScript: {raw!r}")
    return diagnostic_key(match)


def _diagnostic_keys(lines) -> Counter[str]:
    keys: Counter[str] = Counter()
    for raw in lines:
        match = DIAGNOSTIC.match(raw.rstrip("\n"))
        if match:
            keys[diagnostic_key(match)] += 1
    return keys


def _new_diagnostics(before_lines, after_lines) -> tuple[list[str], dict[str, list[str]]]:
    before = _diagnostic_keys(before_lines)
    remaining = before.copy()
    new: list[str] = []
    by_file: dict[str, list[str]] = {}
    for raw in after_lines:
        match = DIAGNOSTIC.match(raw.rstrip("\n"))
        if not match:
            continue
        key = diagnostic_key(match)
        if remaining[key] > 0:
            remaining[key] -= 1
            continue
        new.append(key)
        by_file.setdefault(match.group("file"), []).append(key)
    return sorted(new), by_file


def _outcome(before: int, after: int) -> str:
    if before == 0:
        return "no-edges"
    if after == 0:
        return "accepted"
    return "partial" if after < before else "rejected"


def verify_batch(before_lines, after_lines, providers) -> BatchReport:
    """El veredicto por propuesta y los diagnosticos que el lote introdujo."""
    before_lines, after_lines = list(before_lines), list(after_lines)
    total_before = analyze(before_lines)["diagnostics"]
    if total_before == 0:
        raise ValueError("el log previo no tiene diagnosticos: no hay contra que verificar")
    edges_before, edges_after = _edges_by_provider(before_lines), _edges_by_provider(after_lines)
    verdicts = [Verdict(p, edges_before[p], edges_after[p], _outcome(edges_before[p], edges_after[p]))
                for p in providers]
    new, _ = _new_diagnostics(before_lines, after_lines)
    return BatchReport(verdicts, total_before, analyze(after_lines)["diagnostics"], new)


def verify_proposals(before_lines, after_lines, proposals: list[Proposal]) -> BatchReport:
    """Verifica propuestas generales por objetivo y archivo tocado."""
    before_lines, after_lines = list(before_lines), list(after_lines)
    total_before = analyze(before_lines)["diagnostics"]
    if total_before == 0:
        raise ValueError("el log previo no tiene diagnosticos: no hay contra que verificar")

    before_keys = _diagnostic_keys(before_lines)
    after_keys = _diagnostic_keys(after_lines)
    new, new_by_file = _new_diagnostics(before_lines, after_lines)
    owners: Counter[str] = Counter(
        file for proposal in proposals for file in proposal.files
    )
    verdicts: list[ProposalVerdict] = []
    for proposal in proposals:
        targets_before = sum(before_keys[target] for target in proposal.targets)
        targets_after = sum(after_keys[target] for target in proposal.targets)
        attributable = sorted(
            key
            for file in proposal.files
            if owners[file] == 1
            for key in new_by_file.get(file, [])
        )
        ambiguous = any(
            owners[file] > 1 and new_by_file.get(file)
            for file in proposal.files
        )
        if targets_before == 0:
            outcome = "no-targets"
        elif targets_after:
            outcome = "partial" if targets_after < targets_before else "rejected"
        elif attributable:
            outcome = "rejected"
        elif ambiguous:
            outcome = "ambiguous"
        else:
            outcome = "accepted"
        verdicts.append(ProposalVerdict(
            proposal.proposal_id,
            proposal.proposer,
            targets_before,
            targets_after,
            attributable,
            outcome,
        ))
    return BatchReport(
        verdicts,
        total_before,
        analyze(after_lines)["diagnostics"],
        new,
    )


def read_proposals(path: Path) -> list[Proposal]:
    """Lee el contrato JSONL común a todos los proponentes."""
    proposals: list[Proposal] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            row = json.loads(raw)
            proposal_id = row["proposal_id"]
            proposer = row["proposer"]
            targets = row["targets"]
            files = row["files"]
        except (json.JSONDecodeError, KeyError, TypeError) as error:
            raise ValueError(
                f"propuesta inválida en {path}:{line_number}: {error}"
            ) from error
        if not isinstance(proposal_id, str) or not isinstance(proposer, str):
            raise ValueError(f"propuesta inválida en {path}:{line_number}: id/proposer no son texto")
        if not isinstance(targets, list) or not all(isinstance(x, str) for x in targets):
            raise ValueError(f"propuesta inválida en {path}:{line_number}: targets no es string[]")
        if not isinstance(files, list) or not all(isinstance(x, str) for x in files):
            raise ValueError(f"propuesta inválida en {path}:{line_number}: files no es string[]")
        proposals.append(Proposal(
            proposal_id,
            proposer,
            frozenset(targets),
            frozenset(files),
        ))
    if not proposals:
        raise ValueError(f"el manifiesto {path} no contiene propuestas")
    return proposals


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--before", type=Path, required=True, help="log de tsc antes del lote")
    parser.add_argument("--after", type=Path, required=True, help="log de tsc despues del lote")
    parser.add_argument("--proposals", type=Path,
                        help="manifiesto JSONL de propuestas generales")
    parser.add_argument("--verdicts-out", type=Path,
                        help="registro JSONL al que se AÑADE una fila por propuesta; "
                             "es la entrada --ledger de bin/tsc_schedule")
    parser.add_argument("providers", nargs="*", help="los proveedores TS2305 que el lote arreglo")
    args = parser.parse_args(argv)
    try:
        before = args.before.read_text(errors="replace").splitlines()
        after = args.after.read_text(errors="replace").splitlines()
        if args.proposals:
            if args.providers:
                raise ValueError("use --proposals o providers posicionales, no ambos")
            report = verify_proposals(before, after, read_proposals(args.proposals))
        else:
            if not args.providers:
                raise ValueError("declare --proposals o al menos un provider")
            report = verify_batch(before, after, args.providers)
    except (OSError, ValueError) as error:
        print(f"batch_verification: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    for v in report.verdicts:
        if isinstance(v, Verdict):
            print(f"{v.outcome:<9} {v.edges_before:>4} -> {v.edges_after:<4} {v.provider}")
        else:
            print(f"{v.outcome:<9} {v.targets_before:>4} -> {v.targets_after:<4} "
                  f"{v.proposer}/{v.proposal_id} · {len(v.new_diagnostics)} nuevo(s)")
    for key in report.new_diagnostics:
        print(f"nuevo     {key}")
    if args.verdicts_out:
        # Se añade y no se reescribe: el registro es la historia de la que el
        # planificador aprende, y un lote nuevo no borra los anteriores.
        with args.verdicts_out.open("a", encoding="utf-8") as ledger:
            for v in report.verdicts:
                if isinstance(v, Verdict):
                    row = {"proposal_id": v.provider, "proposer": "ts2305-facade",
                           "outcome": v.outcome, "targets_before": v.edges_before,
                           "targets_after": v.edges_after, "new_diagnostics": []}
                else:
                    row = {"proposal_id": v.proposal_id, "proposer": v.proposer,
                           "outcome": v.outcome, "targets_before": v.targets_before,
                           "targets_after": v.targets_after,
                           "new_diagnostics": v.new_diagnostics}
                row["total_before"], row["total_after"] = report.total_before, report.total_after
                ledger.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"batch_verification: alpha {report.acceptance_rate:.2f} · total "
          f"{report.total_before} -> {report.total_after} · "
          f"{len(report.new_diagnostics)} diagnostico(s) nuevo(s) "
          f"(alcance medido: {len(report.verdicts)} propuesta(s))")
    return 0 if report.clean else 1


if __name__ == "__main__":
    sys.exit(main())
