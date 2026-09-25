#!/usr/bin/env python3
"""El porte de un módulo grande, repartido por miembros.

POR QUÉ. Un módulo demasiado grande para un `claude -p` no cabe en un ítem:
el porte entero de `attachments.ts` (3824 líneas en la fuente) agotó 31
turnos en el paso 130. Se reparte en ítems, uno por miembro, que corren a la
vez y escriben el MISMO archivo. Para que no choquen, cada ítem tiene dos
anclas propias —la de cuerpo y la de imports— y sólo puede reemplazarlas a
ellas (`src/verify/prompts/module-member-port.md`).

Esta pieza es la parte determinista, sin modelo: pone las anclas, aplica de
cada salida sólo lo que reemplaza un ancla del propio ítem, fusiona los
imports que varios ítems pidieron por separado y retira las anclas que nadie
usó. Juzgar qué escribir es del pool; aplicar y dejar el archivo coherente es
de aquí.

*Ciega a:* si lo que un ítem escribió compila; eso lo dice tsc después.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from verify.pool_pipeline import read_output

SLOT = "// @port-slot: {}"
IMPORTS = "// @port-imports: {}"
_ANCHOR_LINE = re.compile(r"^// @port-(?:slot|imports): .*(?:\n|$)", re.M)
_IMPORT_START = re.compile(r"^import\b")
_IMPORT_END = re.compile(r"""(?:\bfrom\s+['"][^'"]+['"]|^import\s+['"][^'"]+['"])\s*;?\s*$""")
_NAMED = re.compile(r"""^import\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"][^'"]+['"])\s*;?\s*$""", re.S)
_LOCAL_DECLARATION = re.compile(
    r"^(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:async\s+)?"
    r"(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)", re.M)


def _import_statements(lines: list[str]) -> list[tuple[int, int]]:
    """Los `import` de nivel superior, como pares (primera, última) línea."""
    spans, index = [], 0
    while index < len(lines):
        if _IMPORT_START.match(lines[index]):
            end = index
            while end < len(lines) - 1 and not _IMPORT_END.search(lines[end]):
                end += 1
            spans.append((index, end))
            index = end + 1
            continue
        index += 1
    return spans


def insert_anchors(text: str, names: list[str]) -> str:
    """Las anclas de imports tras el último `import`; las de cuerpo, al final."""
    lines = text.split("\n")
    spans = _import_statements(lines)
    at = spans[-1][1] + 1 if spans else 0
    lines[at:at] = [IMPORTS.format(name) for name in names]
    body = "\n".join(lines).rstrip("\n")
    slots = "\n".join(SLOT.format(name) for name in names)
    return f"{body}\n\n// --- porte por miembros: un ancla por ítem ---\n{slots}\n"


def read_outputs(directory: Path, names: list[str]) -> dict[str, dict]:
    """La propuesta de cada ítem, por su número; la que no trae JSON no cuenta."""
    proposals: dict[str, dict] = {}
    for number, name in enumerate(names, 1):
        output = read_output(directory / f"{number}.json")
        block = re.search(r"\{.*\}", (output or {}).get("result", "") or "", re.S)
        if not block:
            continue
        try:
            proposals[name] = json.loads(block.group(0))
        except ValueError:
            continue
    return proposals


def _anchor_line(anchor: str) -> re.Pattern[str]:
    """Un ancla es una línea entera: `getNested` no debe casar dentro de
    `getNestedForFile`."""
    return re.compile(rf"^{re.escape(anchor)}$", re.M)


def apply_outputs(text: str, target: str, proposals: dict[str, dict]) -> tuple[str, dict]:
    """Aplica de cada propuesta sólo las ediciones que reemplazan un ancla del
    propio ítem en el archivo destino."""
    report: dict = {"applied": [], "rejected": {}}
    for name, proposal in proposals.items():
        own = {SLOT.format(name), IMPORTS.format(name)}
        for edit in proposal.get("edits", []) or []:
            reason = None
            if edit.get("file") != target:
                reason = f"{edit.get('file')}: fuera del destino"
            elif edit.get("old_string") not in own:
                reason = f"{target}: no reemplaza un ancla del ítem"
            elif len(_anchor_line(edit["old_string"]).findall(text)) != 1:
                reason = f"{target}: el ancla no está una sola vez"
            if reason:
                report["rejected"].setdefault(name, []).append(reason)
                continue
            replacement = edit.get("new_string", "")
            text = _anchor_line(edit["old_string"]).sub(lambda _: replacement, text, count=1)
        if name not in report["rejected"]:
            report["applied"].append(name)
    return text, report


def _local_name(specifier: str) -> str:
    return specifier.split(" as ")[-1].replace("type ", "").strip()


def merge_imports(text: str) -> str:
    """Un `import {…}` por módulo y por clase (`type` o valor), sin nombres
    repetidos ni nombres que el archivo ya declara localmente."""
    lines = text.split("\n")
    spans = _import_statements(lines)
    if not spans:
        return text
    local = set(_LOCAL_DECLARATION.findall(text))
    merged: dict[tuple[str, str], list[str]] = {}
    # Un mismo nombre importado desde dos módulos es TS2300: gana el primero.
    bound: set[str] = set()
    keep: list[str] = []
    for start, end in spans:
        statement = "\n".join(lines[start:end + 1])
        match = _NAMED.match(statement)
        if not match:
            if statement not in keep:
                keep.append(statement)
            continue
        key = ((match.group(1) or "").strip(), match.group(3))
        names = merged.setdefault(key, [])
        for specifier in (s.strip() for s in match.group(2).split(",")):
            name = _local_name(specifier) if specifier else ""
            if specifier and specifier not in names and name not in local and name not in bound:
                names.append(specifier)
                bound.add(name)
    rebuilt = keep + [f"import {kind + ' ' if kind else ''}{{ {', '.join(names)} }} from {module}"
                      for (kind, module), names in merged.items() if names]
    first = spans[0][0]
    drop = {i for start, end in spans for i in range(start, end + 1)}
    body = [line for i, line in enumerate(lines) if i not in drop]
    insert_at = sum(1 for i in range(first) if i not in drop)
    body[insert_at:insert_at] = rebuilt
    return "\n".join(body)


def strip_anchors(text: str) -> str:
    """Retira las anclas que ningún ítem reemplazó."""
    return _ANCHOR_LINE.sub("", text)


def assemble(text: str, target: str, names: list[str], proposals: dict[str, dict]) -> tuple[str, dict]:
    """El archivo destino con todas las propuestas aplicadas: anclas, ediciones
    de ancla, imports fusionados y anclas sin usar retiradas."""
    text, report = apply_outputs(insert_anchors(text, names), target, proposals)
    report["missing"] = [name for name in names if name not in proposals]
    return strip_anchors(merge_imports(text)), report


def item_name(item_file: Path) -> str:
    """El nombre del ítem, de su línea `Ítem: <nombre>`."""
    for line in item_file.read_text().splitlines():
        if line.startswith("Ítem: "):
            return line.split(": ", 1)[1]
    raise ValueError(f"{item_file}: sin línea 'Ítem:'")


def wave_numbers(waves: int, maps: list[list[int]], items: int) -> list[list[int]]:
    """El número original de cada salida, por ola. Con un mapa por ola, cada
    una usa el suyo; con uno menos, la primera numera todos los ítems."""
    if len(maps) == waves:
        return maps
    if len(maps) == waves - 1:
        return [list(range(1, items + 1)), *maps]
    raise ValueError(f"{len(maps)} mapa(s) para {waves} ola(s): se esperan {waves} o {waves - 1}")


def main(argv: list[str] | None = None) -> int:
    """`member_port.py assemble --target F --items items.txt --outputs D [--outputs D2 --map M]`.

    `--outputs` se repite por ola; la segunda ola numera sus salidas desde 1
    sobre un subconjunto de ítems, así que lleva un `--map` con el número
    original de cada uno. Escribe el destino y el informe en JSON por stdout.
    """
    import argparse
    import sys
    parser = argparse.ArgumentParser(description="porte de un módulo por miembros")
    parser.add_argument("command", choices=("assemble",))
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--items", type=Path, required=True)
    parser.add_argument("--outputs", type=Path, action="append", required=True)
    parser.add_argument("--map", type=Path, action="append", default=[],
                        help="por ola a partir de la segunda: JSON con el número original de cada salida")
    args = parser.parse_args(argv)
    lines = args.items.read_text().splitlines()
    names = [item_name(Path(line.split()[1])) for line in lines]
    proposals: dict[str, dict] = {}
    numbering = wave_numbers(len(args.outputs), [json.loads(m.read_text()) for m in args.map], len(names))
    for directory, numbers in zip(args.outputs, numbering):
        wave_names = [names[n - 1] for n in numbers]
        for name, proposal in read_outputs(directory, wave_names).items():
            if any("@port-" in (e.get("old_string") or "") for e in proposal.get("edits", []) or []):
                proposals[name] = proposal
    text, report = assemble(args.target.read_text(), str(args.target), names, proposals)
    args.target.write_text(text)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
