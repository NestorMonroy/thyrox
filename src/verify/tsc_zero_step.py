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
  6. el estado final —el log del lote si no se revirtió nada, otra pasada si
     sí— no puede traer un diagnóstico que el «antes» no tenía. Si lo trae,
     se BISECA lo aceptado (regla 2 del plan): la propuesta que sola destapa
     contratos queda `revealed`, se revierte y va a la cola residual
     (`residual.jsonl`, junto al registro) con los contratos que destapó. Las
     vueltas siguientes no vuelven a aplicar lo que está en la cola: sin eso
     el lazo se atascaría en la misma propuesta.

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
from verify.source_copy_step import reachable_copies
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


# Base de un archivo que la propuesta CREA (un porte de módulo trae módulos
# nuevos). Como toda base, se comprueba: si el archivo ya existe, no se aplica.
ABSENT_BASE = "absent"


def _write(root: Path, file: str, text: str | None) -> None:
    """Deja `file` con `text`; `None` es «no existía» y lo borra, porque un
    archivo vacío seguiría siendo un módulo que tsc compila."""
    path = root / file
    if text is None:
        path.unlink(missing_ok=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def _apply(root: Path, row: dict) -> dict[str, str | None] | None:
    """Aplica una propuesta y devuelve los textos originales (`None` para un
    archivo que crea), o None si alguna base cambió (entonces no escribe)."""
    originals: dict[str, str | None] = {}
    for file in row["files"]:
        path = root / file
        if row["bases"].get(file) == ABSENT_BASE:
            if path.exists():
                return None
            originals[file] = None
            continue
        text = path.read_text()
        if _sha(text) != row["bases"].get(file):
            return None
        originals[file] = text
    for file, original in originals.items():
        text = original or ""
        # En empate de posición va primero la edición POSTERIOR, para que quede
        # detrás de la anterior: `inferFromUsage` inserta la anotación y el `)`
        # en el mismo punto (el mismo orden que `tsLanguageService.applyEdits`).
        indexed = [(i, e) for i, e in enumerate(row["edits"]) if e["file"] == file]
        edits = [e for _, e in sorted(indexed, key=lambda pair: (-pair[1]["start"], -pair[0]))]
        for edit in edits:
            text = text[: edit["start"]] + edit["newText"] + text[edit["start"] + edit["length"]:]
        _write(root, file, text)
    return originals


def _append(ledger: Path, rows: list[dict]) -> None:
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def _queued(residual: Path) -> set[tuple[str, str]]:
    return {(row["proposal_id"], json.dumps(row["bases"], sort_keys=True)) for row in _read_jsonl(residual)}


def net_outcome(before_lines: list[str], after_lines: list[str], row: dict) -> tuple[str, list[str]]:
    """La política neta sobre UNA propuesta: se conserva si bajan sus
    objetivos y baja el total; lo que destapa EN OTROS ARCHIVOS se registra y
    no se revierte. Lo nuevo en los archivos que la propuesta edita la tumba:
    esos son suyos, y un error ahí es la propuesta incompleta, no un contrato
    destapado. Las dos veces que la neta conservó código roto fue así (pasos
    087 y 094, intento 1: un nombre sin importar y una propiedad de clase
    renombrada). Devuelve el veredicto y lo nuevo que dejó."""
    report = verify_proposals(before_lines, after_lines, [
        Proposal(row["proposal_id"], row["proposer"], frozenset(row["targets"]), frozenset(row["files"]))])
    verdict = report.verdicts[0]
    own = set(row["files"])
    breaks_own = any(d.split(": ", 1)[0] in own for d in verdict.new_diagnostics)
    if (not breaks_own and verdict.targets_after < verdict.targets_before
            and report.total_after < report.total_before):
        return "accepted-net", report.new_diagnostics
    return verdict.outcome, verdict.new_diagnostics


def run_step(root: Path, candidates: list[dict], tsc: list[str], ledger: Path, bench: Path, *,
             seed: int, epsilon: float, alpha0: float, max_batch: int | None,
             before_lines: list[str] | None = None, net: bool = False,
             accept_partial: bool = False) -> StepReport:
    runs = 0
    if before_lines is None:
        before_lines = run_tsc(root, tsc, bench / "before.log")
        runs += 1
    total_before = _count(before_lines)
    if total_before == 0:
        return StepReport("done", 0, 0, runs)

    residual = ledger.parent / "residual.jsonl"
    queued = _queued(residual)
    candidates = [row for row in candidates
                  if (row["proposal_id"], json.dumps(row["bases"], sort_keys=True)) not in queued]
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
    outcomes.update({v.proposal_id: v.outcome for v in report.verdicts})
    # Política neta: sólo con una propuesta por lote, porque el total no se
    # puede repartir entre varias (`net_outcome`).
    net_kept: str | None = None
    if net and len(applied) == 1 and len(report.verdicts) == 1:
        pid = report.verdicts[0].proposal_id
        if net_outcome(before_lines, after_lines, by_id[pid])[0] == "accepted-net":
            net_kept = pid
            outcomes[net_kept] = "accepted-net"

    # Parcial conservable: bajan sus objetivos sin llegar a cero. Se trata
    # como una aceptada, así que `settle` la revierte si deja algo nuevo.
    # La que ya deja algo nuevo en sus propios archivos no entra: el
    # verificador ya sabe que es culpable, y mandarla a `settle` cuesta
    # ~2·log2(n) pasadas de tsc por culpable (paso 098: 13 pasadas).
    if accept_partial:
        new_files = {d.split(": ", 1)[0] for d in report.new_diagnostics}
        for pid in applied:
            if pid != net_kept and outcomes[pid] == "partial" \
                    and not new_files & set(by_id[pid]["files"]):
                outcomes[pid] = "accepted-partial"

    keep = ("accepted", "accepted-net", "accepted-partial")
    patched = {pid: {file: (root / file).read_text() for file in applied[pid]} for pid in applied}
    accepted = [pid for pid in applied if outcomes[pid] in keep and pid != net_kept]
    if net_kept is not None:
        accepted = [net_kept]
    reverted = [pid for pid in applied if outcomes[pid] not in keep]
    for pid in reverted:
        for file, text in applied[pid].items():
            _write(root, file, text)

    revealed: dict[str, list[str]] = {}
    counter = {"n": 0}

    def write(pid: str, texts: dict[str, str | None]) -> None:
        for file, text in texts.items():
            _write(root, file, text)

    def settle(ids: list[str], base_lines: list[str], lines: list[str] | None) -> tuple[list[str], list[str]]:
        """El árbol tiene `ids` aplicados sobre una base limpia; devuelve lo
        que se conserva y el log de base + conservado."""
        if lines is None:
            counter["n"] += 1
            lines = run_tsc(root, tsc, bench / f"settle-{counter['n']}.log")
        new, _ = _new_diagnostics(before_lines, lines)
        if not new:
            return ids, lines
        if len(ids) == 1:
            write(ids[0], applied[ids[0]])
            revealed[ids[0]] = new
            return [], base_lines
        half = len(ids) // 2
        first, second = ids[:half], ids[half:]
        for pid in second:
            write(pid, applied[pid])
        kept_first, lines_first = settle(first, base_lines, None)
        for pid in second:
            write(pid, patched[pid])
        kept_second, lines_second = settle(second, lines_first, None)
        return kept_first + kept_second, lines_second

    kept: list[str] = []
    final_lines = before_lines
    if net_kept is not None:
        # No se biseca: lo destapado ya se aceptó al conservarla por el neto.
        kept, final_lines = [net_kept], after_lines
    elif accepted:
        lines = None if reverted else after_lines
        if lines is None:
            counter["n"] += 1
            lines = run_tsc(root, tsc, bench / f"settle-{counter['n']}.log")
        # Sólo es sospechosa la aceptada a cuyos archivos llega, por la cadena
        # de imports, el archivo que lleva lo nuevo: las demás no pueden
        # haberlo causado y no pagan bisección. Si el grafo no alcanza a
        # ninguna, se biseca el conjunto entero, como antes.
        new, new_by_file = _new_diagnostics(before_lines, lines)
        suspects = accepted
        if new:
            owned = {file for pid in accepted for file in applied[pid]}
            packages = root / "src" / "packages"
            reached = reachable_copies(root, set(new_by_file), owned, root,
                                       package_root=packages if packages.is_dir() else root)
            reached |= set(new_by_file) & owned
            hit = [pid for pid in accepted if set(applied[pid]) & reached]
            if not hit:
                # Nada llega a lo nuevo: antes de culpar a nadie se mide la
                # base con todo revertido. Si lo nuevo sigue, el árbol no es el
                # que midió `--before-log`, y bisecar culparía a inocentes
                # (paso 098: 22 pasadas, las 11 parciales culpadas por un
                # import sin usar que ninguna tocó).
                for pid in accepted:
                    write(pid, applied[pid])
                counter["n"] += 1
                base_now = run_tsc(root, tsc, bench / f"settle-{counter['n']}.log")
                drift, _ = _new_diagnostics(before_lines, base_now)
                if drift:
                    raise RuntimeError(
                        f"línea base desfasada: {len(drift)} diagnóstico(s) nuevo(s) con todas las "
                        f"propuestas revertidas; el árbol no coincide con el log previo ({drift[0]})")
                for pid in accepted:
                    write(pid, patched[pid])
            suspects = hit or accepted
        clean = [pid for pid in accepted if pid not in suspects]
        kept_suspects, final_lines = settle(suspects, before_lines, lines)
        kept = clean + kept_suspects
        if clean and final_lines is before_lines:
            # `settle` devolvió la base sin nada aplicado; las limpias siguen
            # en el árbol, así que el log final se mide.
            counter["n"] += 1
            final_lines = run_tsc(root, tsc, bench / f"settle-{counter['n']}.log")
        if clean and _new_diagnostics(before_lines, final_lines)[0]:
            # El grafo se equivocó: una limpia también rompe. Se biseca lo
            # conservado, que es lo que está aplicado.
            kept, final_lines = settle(kept, before_lines, final_lines)
    runs += counter["n"]
    for pid in revealed:
        outcomes[pid] = "revealed"
    ledger_out = rows + [{**row, "outcome": outcomes[row["proposal_id"]],
                          "new_diagnostics": (report.new_diagnostics if row["proposal_id"] == net_kept
                                              else revealed.get(row["proposal_id"], row["new_diagnostics"]))}
                         for row in ledger_rows(report)]
    _append(ledger, ledger_out)
    _append(residual, [{"proposal_id": pid, "proposer": by_id[pid]["proposer"], "bases": by_id[pid]["bases"],
                        "targets": by_id[pid]["targets"], "new_diagnostics": new}
                       for pid, new in revealed.items()])
    bench.mkdir(parents=True, exist_ok=True)
    (bench / "final.log").write_text("\n".join(final_lines) + "\n")
    files_kept = sorted({file for pid in kept for file in applied[pid]})
    status = "progress" if kept else "stalled"
    return StepReport(status, total_before, _count(final_lines), runs, kept, files_kept, outcomes)


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
    parser.add_argument("--net", action="store_true",
                        help="política neta: conservar una propuesta si bajan sus objetivos y el total")
    parser.add_argument("--accept-partial", action="store_true",
                        help="conservar la parcial que no deja nada nuevo en sus archivos")
    args = parser.parse_args(argv[:split])
    try:
        before = args.before_log.read_text().splitlines() if args.before_log else None
        report = run_step(args.root, _read_jsonl(args.candidates), argv[split + 1:], args.ledger,
                          args.bench, seed=args.seed, epsilon=args.epsilon, alpha0=args.alpha0,
                          max_batch=args.max_batch, before_lines=before, net=args.net,
                          accept_partial=args.accept_partial)
    except (OSError, ValueError, RuntimeError, KeyError, json.JSONDecodeError) as error:
        print(f"tsc_zero_step: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    print(json.dumps(report.__dict__, ensure_ascii=False))
    return {"done": 0, "progress": 1, "stalled": 3}[report.status]


if __name__ == "__main__":
    raise SystemExit(main())
