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


def pending_outside(run: Path, log_lines: list[str], files: list[str]) -> dict[str, dict[str, int]]:
    """Por patrón aprendido, los archivos FUERA de la candidata donde su señal
    sigue viva en el log, con multiplicidad (paso 4 del plan: aplicar lo
    aprendido a todo el código, no un archivo por paso)."""
    keys = [(m.group("file"), diagnostic_key(m)) for line in log_lines
            if (m := DIAGNOSTIC.match(line))]
    wanted = set(files)
    pending: dict[str, dict[str, int]] = {}
    for row in _read_jsonl(run / PATTERNS):
        regex = re.compile(row["signal"])
        rest: dict[str, int] = {}
        for file, key in keys:
            if file not in wanted and regex.search(key):
                rest[file] = rest.get(file, 0) + 1
        if rest:
            pending[row["name"]] = rest
    return pending


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
    args = parser.parse_args(argv)
    try:
        if args.command == "add":
            row = add(args.run, args.id, args.files, args.lesson,
                      args.before_log.read_text().splitlines(),
                      (args.step / "batch.log").read_text().splitlines())
            print(json.dumps(row, ensure_ascii=False))
        else:
            print(json.dumps(recall(args.run, args.files), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"tsc_reflect: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
