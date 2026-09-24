#!/usr/bin/env python3
"""El cambio del agente como candidato del lazo tsc cero.

El lazo (`tsc_zero_step`) sabía juzgar propuestas, pero sólo las recibía de
proponentes mecánicos (`bin/tsc_proposers`: los code fixes del compilador), que
no atacan causas raíz. Esta pieza es el proponente con juicio: el agente edita
el árbol, y aquí esa edición se convierte en un candidato —una edición mínima
por archivo, su base de `HEAD` y los objetivos que el agente declara con un
patrón sobre el log de partida— y el archivo vuelve a su base. Así no decide
el agente si su arreglo funcionó: lo aplica el paso y lo juzga `tsc`.

Uso::

    bin/agent_proposal --before-log L --pattern REGEX --id NOMBRE archivo... >> candidatos.jsonl

Salidas del CLI: 0 candidato emitido · 2 rehúsa (sin cambios, sin objetivos).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key
from verify.tsc_reflect import recall


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _head_text(root: Path, file: str) -> str:
    return subprocess.run(["git", "show", f"HEAD:{file}"], cwd=root, check=True,
                          capture_output=True, text=True).stdout


def _minimal_edit(file: str, base: str, edited: str) -> dict:
    """Una sola edición: el tramo entre el prefijo y el sufijo comunes."""
    start = 0
    limit = min(len(base), len(edited))
    while start < limit and base[start] == edited[start]:
        start += 1
    end_base, end_edited = len(base), len(edited)
    while end_base > start and end_edited > start and base[end_base - 1] == edited[end_edited - 1]:
        end_base -= 1
        end_edited -= 1
    return {"file": file, "start": start, "length": end_base - start,
            "newText": edited[start:end_edited]}


def build(root: Path, files: list[str], before_lines: list[str], pattern: str, name: str) -> dict:
    """Candidato a partir de la edición del agente; deja cada archivo en su base."""
    regex = re.compile(pattern)
    # Las líneas de continuación de un mensaje encadenado no son diagnósticos.
    matches = (DIAGNOSTIC.match(line.rstrip("\n")) for line in before_lines)
    targets = sorted({key for match in matches if match
                      if regex.search(key := diagnostic_key(match))})
    bases, edits, restore = {}, [], {}
    for file in files:
        base = _head_text(root, file)
        edited = (root / file).read_text()
        if edited == base:
            raise ValueError(f"{file} no difiere de HEAD: no hay edición que proponer")
        bases[file] = _sha(base)
        edits.append(_minimal_edit(file, base, edited))
        restore[file] = base
    if not targets:
        raise ValueError(f"el patrón {pattern!r} no nombra ningún diagnóstico del log de partida")
    for file, base in restore.items():
        (root / file).write_text(base)
    return {"proposal_id": f"agent:{name}", "proposer": "agent", "targets": targets,
            "files": list(files), "edits": edits, "bases": bases}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--before-log", type=Path, required=True)
    parser.add_argument("--pattern", required=True, help="regex sobre `archivo: TSxxxx: mensaje`")
    parser.add_argument("--id", required=True)
    parser.add_argument("--run", type=Path,
                        help="corrida del lazo: antes de salir, recuerda sus reflexiones y recetas")
    parser.add_argument("files", nargs="+")
    args = parser.parse_args(argv)
    try:
        row = build(args.root, args.files, args.before_log.read_text().splitlines(), args.pattern,
                    args.id)
    except (ValueError, OSError, re.error, subprocess.CalledProcessError) as error:
        print(f"agent_proposal: REHÚSA — {error}", file=sys.stderr)
        return 2
    if args.run is not None:
        # Reflexion: leer la memoria de estos archivos ANTES de que tsc juzgue.
        memory = recall(args.run, args.files)
        for item in memory["reflections"]:
            print(f"memoria [{item['outcome']}] {item['proposal_id']}: {item['lesson']}",
                  file=sys.stderr)
        for item in memory["recipes"]:
            print(f"receta {item['step']}: {item['subject']}", file=sys.stderr)
    print(json.dumps(row, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
