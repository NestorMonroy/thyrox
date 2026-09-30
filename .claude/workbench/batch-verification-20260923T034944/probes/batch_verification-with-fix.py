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

Ciego a
-------
La clave de un diagnostico es `archivo(linea,columna): codigo`. Un arreglo que
desplaza lineas en un archivo con otros errores los hace parecer nuevos: es un
falso positivo CONSERVADOR, que puede rechazar un lote sano pero nunca aceptar
uno roto.

Salidas del CLI: 0 lote limpio · 1 lote con rechazos o diagnosticos nuevos ·
2 un log ilegible o sin diagnosticos previos.
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC, analyze


@dataclass(frozen=True)
class Verdict:
    provider: str
    edges_before: int
    edges_after: int
    outcome: str


@dataclass(frozen=True)
class BatchReport:
    verdicts: list[Verdict]
    total_before: int
    total_after: int
    new_diagnostics: list[str] = field(default_factory=list)

    @property
    def acceptance_rate(self) -> float:
        with_object = [v for v in self.verdicts if v.outcome != "no-edges"]
        if not with_object:
            return 0.0
        return sum(v.outcome == "accepted" for v in with_object) / len(with_object)

    @property
    def clean(self) -> bool:
        return (not self.new_diagnostics
                and all(v.outcome in ("accepted", "no-edges") for v in self.verdicts))


def _edges_by_provider(lines) -> Counter:
    counts: Counter = Counter()
    for edge in analyze(lines)["missing_exports"]:
        counts[edge["provider"]] += edge["count"]
    return counts


def _diagnostic_keys(lines) -> set[str]:
    keys = set()
    for raw in lines:
        match = DIAGNOSTIC.match(raw.rstrip("\n"))
        if match:
            keys.add(f"{match.group('file')}({match.group('line')},"
                     f"{match.group('column')}): {match.group('code')}")
    return keys


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
    new = sorted(_diagnostic_keys(after_lines) - _diagnostic_keys(before_lines))
    return BatchReport(verdicts, total_before, analyze(after_lines)["diagnostics"], new)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--before", type=Path, required=True, help="log de tsc antes del lote")
    parser.add_argument("--after", type=Path, required=True, help="log de tsc despues del lote")
    parser.add_argument("providers", nargs="+", help="los proveedores que el lote arreglo")
    args = parser.parse_args(argv)
    try:
        report = verify_batch(args.before.read_text(errors="replace").splitlines(),
                              args.after.read_text(errors="replace").splitlines(),
                              args.providers)
    except (OSError, ValueError) as error:
        print(f"batch_verification: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    for v in report.verdicts:
        print(f"{v.outcome:<9} {v.edges_before:>4} -> {v.edges_after:<4} {v.provider}")
    for key in report.new_diagnostics:
        print(f"nuevo     {key}")
    print(f"batch_verification: alpha {report.acceptance_rate:.2f} · total "
          f"{report.total_before} -> {report.total_after} · "
          f"{len(report.new_diagnostics)} diagnostico(s) nuevo(s) "
          f"(alcance medido: {len(report.verdicts)} propuesta(s))")
    return 0 if report.clean else 1


if __name__ == "__main__":
    sys.exit(main())
