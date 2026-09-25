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
import subprocess
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
    """Las anclas de imports tras el último `import`; las de cuerpo, al final.
    Un nombre repetido (un ítem partido) lleva una sola ancla."""
    names = list(dict.fromkeys(names))
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


# Por debajo de estas líneas, un ayudante con un solo llamador ausente viaja
# con él (attachments-port-plan: absorbía sin partir el contexto del llamador).
SMALL_HELPER_LINES = 20
DECLARATIONS_ITEM = "__declarations__:types"


def plan(declarations: list[dict], present: set[str]) -> dict[str, list[str]]:
    """Reparte en ítems las declaraciones de nivel superior que el destino no
    tiene. Una función ausente es su propio ítem, salvo un ayudante pequeño con
    un solo llamador ausente, que sube hasta el primer dueño no absorbido; las
    declaraciones que no son funciones van juntas en un ítem aparte."""
    missing = {d["name"]: d for d in declarations if d["name"] not in present}
    functions = {n for n, d in missing.items() if d["kind"] == "function"}
    callers: dict[str, set[str]] = {n: set() for n in functions}
    for name in functions:
        for reference in missing[name].get("references", []):
            if reference in functions and reference != name:
                callers[reference].add(name)
    owner = {n: next(iter(callers[n])) for n in functions
             if len(callers[n]) == 1
             and missing[n]["end"] - missing[n]["start"] + 1 < SMALL_HELPER_LINES}

    def root(name: str) -> str:
        seen: set[str] = set()
        while name in owner and name not in seen:
            seen.add(name)
            name = owner[name]
        return name

    items: dict[str, list[str]] = {}
    for name in sorted(functions):
        items.setdefault(root(name), []).append(name)
    others = sorted(n for n in missing if n not in functions)
    if others:
        items[DECLARATIONS_ITEM] = others
    return {k: sorted(v) for k, v in items.items()}


THYROX = Path(__file__).resolve().parents[2]
EXTRACTOR = THYROX / "src/verify/top_level_declarations.ts"


def top_level_declarations(module: Path) -> list[dict]:
    """Las declaraciones de nivel superior de un módulo, por el compilador de
    TypeScript (`top_level_declarations.ts`); rehúsa si bun falla."""
    result = subprocess.run(["bun", str(EXTRACTOR), str(module)], capture_output=True, text=True, cwd=THYROX)
    if result.returncode != 0:
        raise RuntimeError(f"top_level_declarations {module}: {result.stderr.strip()}")
    return json.loads(result.stdout)


def item_text(target: str, source: str, name: str, members: list[str],
              ranges: dict[str, tuple[int, int]], uses: list[str]) -> str:
    """El texto de un ítem en el formato que `prompts/module-member-port.md` espera."""
    heading = ("Declaraciones de nivel superior a portar" if name == DECLARATIONS_ITEM
               else "Miembros a portar")
    lines = [f"Módulo destino: {target}", f"Ítem: {name}", f"Ancla de cuerpo: {SLOT.format(name)}",
             f"Ancla de imports: {IMPORTS.format(name)}", f"Fuente (sólo lectura): {source}", "",
             f"{heading} (nombre: líneas de la fuente):"]
    lines += [f"- {member}: {ranges[member][0]}-{ranges[member][1]}" for member in members]
    if uses:
        lines += ["", "Otros miembros del módulo que usan (existen o los porta otro ítem; "
                      "úsalos por su nombre): " + ", ".join(uses)]
    return "\n".join(lines) + "\n"


def write_plan(source: Path, target: Path, bench: Path) -> int:
    """Escribe `items/N.txt` e `items.txt`; devuelve cuántos ítems."""
    declarations = top_level_declarations(source)
    present = {d["name"] for d in top_level_declarations(target)} if target.is_file() else set()
    items = plan(declarations, present)
    ranges = {d["name"]: (d["start"], d["end"]) for d in declarations}
    functions = {d["name"] for d in declarations if d["kind"] == "function"}
    references = {d["name"]: set(d["references"]) for d in declarations}
    (bench / "items").mkdir(parents=True, exist_ok=True)
    lines = []
    for number, (name, members) in enumerate(items.items(), 1):
        used = set().union(*(references[m] for m in members)) & functions
        uses = sorted(used - set(members))
        path = bench / "items" / f"{number}.txt"
        path.write_text(item_text(str(target), str(source), name, members, ranges, uses), encoding="utf-8")
        lines.append(f"module:{target} {path}")
    (bench / "items.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(lines)


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
    parser.add_argument("command", choices=("assemble", "plan"))
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--source", type=Path, help="plan: el módulo de la fuente")
    parser.add_argument("--bench", type=Path, help="plan: el paso donde se escriben los ítems")
    parser.add_argument("--items", type=Path)
    parser.add_argument("--outputs", type=Path, action="append", default=[])
    parser.add_argument("--map", type=Path, action="append", default=[],
                        help="por ola a partir de la segunda: JSON con el número original de cada salida")
    args = parser.parse_args(argv)
    if args.command == "plan":
        if not (args.source and args.bench):
            parser.error("plan exige --source y --bench")
        count = write_plan(args.source, args.target, args.bench)
        print(f"member_port plan: {count} ítem(s) -> {args.bench / 'items.txt'}")
        return 0
    if not (args.items and args.outputs):
        parser.error("assemble exige --items y al menos un --outputs")
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
