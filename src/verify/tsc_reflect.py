#!/usr/bin/env python3
"""Memoria entre intentos del lazo tsc cero — Reflexion aplicada al compilador.

Origen: Shinn et al., «Reflexion: Language Agents with Verbal Reinforcement
Learning» (NeurIPS 2023), tal como la presenta Shunyu Yao en la lectura 11
de Berkeley LLM Agents (otoño 2024; `ai-course-notes: talks/berkeley-llm-
agents/f24/lecture11`, sección «长期记忆»): el agente intenta, falla,
escribe en lenguaje POR QUÉ falló, persiste ese texto y lo lee antes del
siguiente intento. No actualiza pesos: actualiza una memoria textual.

En el lazo, cada pieza del marco KOALA de la misma lectura tiene su lugar:

- memoria: el contexto del orquestador (se compacta y se pierde), el
  registro numérico (`ledger.jsonl`, del que el planificador saca su
  posterior) y — lo que faltaba — `reflections.jsonl`, el porqué en texto;
- espacio de acciones: las ediciones que `agent_proposal` convierte en
  candidata;
- procedimiento de decisión: Thompson sampling sobre el registro, y el
  veredicto de `tsc` con la política neta.

La señal externa sigue siendo el compilador: una reflexión nunca acepta ni
rechaza nada, sólo informa la siguiente propuesta. Además de reflexiones
guarda RECETAS — el asunto del commit de cada paso aceptado, indexado por
los archivos que tocó — para repetir un arreglo que ya funcionó (la
biblioteca de habilidades de Voyager, en su forma más simple).

Uso::

    bin/tsc_reflect add --run R --id agent:x --step R/step-019 \\
        --before-log R/step-018/final.log --lesson "texto" archivo...
    bin/tsc_reflect recall --run R archivo...
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key
from verify.batch_verification import _new_diagnostics

REFLECTIONS = "reflections.jsonl"
# La memoria de patrones la escribe `tsc_sweep` (esquema `name`/`signal`);
# aquí sólo se lee, para no importar `tsc_sweep`, que importa `agent_proposal`.
PATTERNS = "patterns.jsonl"


def revealed(before_lines: list[str], batch_lines: list[str]) -> list[str]:
    """Los diagnósticos del lote que el «antes» no tenía, con multiplicidad."""
    new, _ = _new_diagnostics(before_lines, batch_lines)
    return new


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def add(run: Path, proposal_id: str, files: list[str], lesson: str,
        before_lines: list[str], batch_lines: list[str]) -> dict:
    if not lesson.strip():
        raise ValueError("una reflexión sin lección no enseña nada")
    outcomes = [r["outcome"] for r in _read_jsonl(run / "ledger.jsonl") if r["proposal_id"] == proposal_id]
    row = {"proposal_id": proposal_id, "outcome": outcomes[-1] if outcomes else None,
           "files": sorted(files), "lesson": lesson.strip(),
           "revealed": revealed(before_lines, batch_lines)}
    with (run / REFLECTIONS).open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


def recall(run: Path, files: list[str]) -> dict:
    wanted = set(files)
    reflections = [r for r in _read_jsonl(run / REFLECTIONS) if wanted & set(r["files"])]
    recipes = []
    for report in sorted(run.glob("step-*/report.json")):
        data = json.loads(report.read_text())
        commit = report.parent / "commit.txt"
        if data.get("accepted") and wanted & set(data.get("files_kept", [])) and commit.exists():
            recipes.append({"step": report.parent.name,
                            "subject": commit.read_text().splitlines()[0]})
    return {"reflections": reflections, "recipes": recipes}


def pending_outside(run: Path, log_lines: list[str], files: list[str],
                    targets: list[str] | None = None) -> dict[str, dict[str, int]]:
    """Por patrón aprendido, los archivos FUERA de la candidata donde su señal
    sigue viva en el log, con multiplicidad (paso 4 del plan: aplicar lo
    aprendido a todo el código, no un archivo por paso).

    Un diagnóstico que la candidata declara como objetivo no queda pendiente
    aunque viva en otro archivo: el arreglo suele ir a la causa (el tipo, el
    esquema) y el error se ve en el consumidor."""
    claimed = set(targets or [])
    keys = [(m.group("file"), diagnostic_key(m)) for line in log_lines
            if (m := DIAGNOSTIC.match(line))]
    wanted = set(files)
    pending: dict[str, dict[str, int]] = {}
    for row in _read_jsonl(run / PATTERNS):
        regex = re.compile(row["signal"])
        # El `include` acota el arreglo a sus archivos (`tsc_sweep` barre sólo
        # ahí): fuera de él la señal no es trabajo pendiente del patrón. Sin
        # esto, un patrón de pruebas bloqueaba por los diagnósticos iguales
        # del código de producto, donde su arreglo no aplica.
        scope = re.compile(row.get("include") or "")
        rest: dict[str, int] = {}
        for file, key in keys:
            if file not in wanted and key not in claimed and scope.search(file) and regex.search(key):
                rest[file] = rest.get(file, 0) + 1
        if rest:
            pending[row["name"]] = rest
    return pending


def blocking_pending(run: Path, log_lines: list[str], files: list[str],
                     targets: list[str] | None = None) -> dict[str, dict[str, int]]:
    """Gate 4: lo pendiente que bloquea. Un patrón `closed` o un archivo en su
    `exclude` salen, y las dos salidas llevan su razón escrita en la memoria
    (`tsc_sweep close|exclude --reason`); todo lo demás exige aplicar el
    patrón antes de proponer otra cosa."""
    rows = {row["name"]: row for row in _read_jsonl(run / PATTERNS)}
    blocking = {}
    for name, found in pending_outside(run, log_lines, files, targets).items():
        row = rows[name]
        if row.get("status") == "closed":
            continue
        rest = {f: n for f, n in found.items() if f not in set(row.get("exclude", []))}
        if rest:
            blocking[name] = rest
    return blocking


def _accepted_targets(step: Path, accepted: list[str]) -> list[str]:
    path = step / "candidates.jsonl"
    wanted = set(accepted)
    return [t for row in _read_jsonl(path) if row.get("proposal_id") in wanted
            for t in row.get("targets", [])]


def uncovered_by_memory(run: Path, step: Path) -> list[str]:
    """Gate 3b: archivos que un paso con avance conservó sin que la memoria
    los cubra. Cubrir exige las dos cosas: un patrón cuya señal casa con los
    OBJETIVOS del paso (no basta con que la entrada tenga sus campos) y cuyo
    `applied` nombra el archivo."""
    report = json.loads((step / "report.json").read_text())
    kept = report.get("files_kept", [])
    if report.get("status") != "progress" or not kept:
        return []
    targets = _accepted_targets(step, report.get("accepted", []))
    covered: set[str] = set()
    for row in _read_jsonl(run / PATTERNS):
        regex = re.compile(row["signal"])
        if any(regex.search(t) for t in targets):
            covered |= set(row.get("applied", []))
    return [f for f in kept if f not in covered]


def audit(run: Path) -> dict:
    """Las dos preguntas de verificación del plan v2.2.0, con su denominador:
    cuántos pasos aceptados dejaron memoria que los cubre, y cuántos aplicaron
    un mismo patrón a más de un archivo de una vez."""
    accepted = covered = bulk = 0
    uncovered_steps = []
    patterns = _read_jsonl(run / PATTERNS)
    for report_path in sorted(run.glob("step-*/report.json")):
        step = report_path.parent
        report = json.loads(report_path.read_text())
        if report.get("status") != "progress" or not report.get("files_kept"):
            continue
        accepted += 1
        if uncovered_by_memory(run, step):
            uncovered_steps.append(step.name)
            continue
        covered += 1
        kept = set(report["files_kept"])
        targets = _accepted_targets(step, report.get("accepted", []))
        if len(kept) > 1 and any(kept <= set(p.get("applied", [])) and
                                 any(re.search(p["signal"], t) for t in targets) for p in patterns):
            bulk += 1
    return {"accepted": accepted, "covered": covered, "bulk": bulk,
            "uncovered_steps": uncovered_steps}


def sweep_gate(run: Path, step: Path) -> list[str]:
    """Gate 4 (plan v2.2.0), al cerrar un paso con avance. Con al menos un
    patrón abierto en la memoria, el paso tiene que haber REVISADO patrones
    (`gate4.json` los nombra: omitir el paso 4 es 0 revisados) y su log final
    no puede dejar viva ninguna instancia de un patrón que no esté aplicada,
    excluida con razón o cerrada. Devuelve los motivos de bloqueo; vacío si pasa.

    Antes el gate 4 vivía sólo en `agent_proposal`, y un camino de propuestas
    que no pasara por ahí (un pool de `claude -p` por archivo) lo saltaba."""
    rows = [row for row in _read_jsonl(run / PATTERNS) if row.get("status") != "closed"]
    if not rows:
        return []
    reasons = []
    record = step / "gate4.json"
    reviewed = json.loads(record.read_text()).get("reviewed", []) if record.exists() else []
    if not reviewed:
        reasons.append(f"el paso no revisó ningún patrón ({record.name} ausente o vacío) "
                       f"con {len(rows)} abierto(s) en la memoria: el paso 4 se omitió")
    final = step / "final.log"
    lines = final.read_text().splitlines() if final.exists() else []
    for name, found in blocking_pending(run, lines, []).items():
        reasons.append(f"{name}: {sum(found.values())} instancia(s) viva(s) en {len(found)} archivo(s) "
                       "sin aplicar, excluir ni cerrar")
    return reasons


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    add_p = sub.add_parser("add", help="escribe la reflexión de un paso no aceptado")
    add_p.add_argument("--run", type=Path, required=True)
    add_p.add_argument("--id", required=True)
    add_p.add_argument("--step", type=Path, required=True, help="banco del paso (lee batch.log)")
    add_p.add_argument("--before-log", type=Path, required=True)
    add_p.add_argument("--lesson", required=True)
    add_p.add_argument("files", nargs="+")
    recall_p = sub.add_parser("recall", help="reflexiones y recetas de unos archivos")
    recall_p.add_argument("--run", type=Path, required=True)
    recall_p.add_argument("files", nargs="+")
    gate_p = sub.add_parser("gate-memory", help="gate 3b: el paso deja memoria que lo cubre")
    gate_p.add_argument("--run", type=Path, required=True)
    gate_p.add_argument("--step", type=Path, required=True)
    sweep_p = sub.add_parser("gate-sweep", help="gate 4: el paso aplicó la memoria a todo el código")
    sweep_p.add_argument("--run", type=Path, required=True)
    sweep_p.add_argument("--step", type=Path, required=True)
    audit_p = sub.add_parser("audit", help="las dos preguntas de verificación del plan")
    audit_p.add_argument("--run", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "add":
            row = add(args.run, args.id, args.files, args.lesson,
                      args.before_log.read_text().splitlines(),
                      (args.step / "batch.log").read_text().splitlines())
            print(json.dumps(row, ensure_ascii=False))
        elif args.command == "recall":
            print(json.dumps(recall(args.run, args.files), ensure_ascii=False, indent=2))
        elif args.command == "gate-memory":
            missing = uncovered_by_memory(args.run, args.step)
            if missing:
                print(f"GATE 3b BLOQUEADO — {args.step.name} conservó {len(missing)} archivo(s) sin "
                      "un patrón cuya señal case sus objetivos y cuyo applied los nombre: "
                      f"{' '.join(missing)}. Registra con bin/tsc_sweep add-pattern y applied.",
                      file=sys.stderr)
                return 4
            print(f"gate 3b: {args.step.name} cubierto por la memoria")
        elif args.command == "gate-sweep":
            reasons = sweep_gate(args.run, args.step)
            if reasons:
                print(f"GATE 4 BLOQUEADO — {args.step.name}: " + "; ".join(reasons), file=sys.stderr)
                return 5
            print(f"gate 4: {args.step.name} aplicó o declaró la salida de cada patrón de la memoria")
        else:
            a = audit(args.run)
            print(f"aceptados con avance: {a['accepted']} · cubiertos por memoria: {a['covered']} · "
                  f"aplicaciones masivas de un patrón: {a['bulk']}")
            print("sin memoria: " + (" ".join(a["uncovered_steps"]) or "ninguno"))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"tsc_reflect: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
