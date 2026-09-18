"""Censo de citas a una build de Claude Code que ya no es la vigente.

Por que un censo y no un `sed`: una cita a `2.1.266` puede ser CORRECTA. La
evidencia fechada de un episodio cito la build que medio ese dia, y reescribirla
borraria la memoria episodica — el mismo criterio con que
`referencia-odoo-gobierna-las-decisiones.md` conserva las citas historicas a
`odoo19x/`. Lo que si caduca es el PUNTERO A CORPUS: un documento que declara
`_references/claude-code-bin/<vieja>/claude_strings.txt` como la fuente contra
la que se lee el mecanismo VIGENTE apunta a otro ejecutable.

El instrumento reparte en cubos con su discriminador declarado y publica
`N de M`. No reescribe nada: la eleccion final entre «evidencia» y «puntero
caduco» es juicio de tema, y un patron lexico no lo cierra.

Metrica: lineas de `source/**` y `.claude/**` del consumidor que contienen el
literal de la build vieja, repartidas por su cubo.
Ciega a: una cita que nombre la build sin escribir su numero («la build
anterior»), y a la distincion entre un puntero legitimo a evidencia archivada y
uno que se lee como fuente vigente — esa la decide quien lee, no el cubo.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

# El sello ISO que un directorio de evidencia lleva en su propio nombre.
RUN_STAMP = re.compile(r"-\d{8}T\d{6}(?:/|$)")

# Un anclaje temporal EN LA LINEA: la fecha completa, o un verbo que declara
# que lo escrito describe un momento y no el estado de hoy.
DATED_IN_LINE = re.compile(
    r"\d{4}-\d{2}-\d{2}"
    r"|\bmedid[oa]s?\b|\bmedimos\b"
    r"|\bhistoric[oa]\b|\bhist[oó]ric[oa]\b"
    r"|\bentonces\b|\bese d[ií]a\b|\bya no\b",
    re.IGNORECASE,
)

# Un PUNTERO A CORPUS: la cita nombra el arbol de la build, no la build a secas.
CORPUS_POINTER = re.compile(
    r"claude-code-bin|claude_strings|bunfs-root|_references",
)

SKIPPED_DIRS = {".git", "node_modules", "build", "__pycache__", ".venv"}


@dataclass(frozen=True)
class Citation:
    path: str
    line_number: int
    cube: str
    text: str


def classify(relative_path: str, line: str, *, corpus_rule: bool = True) -> str:
    """El cubo de una cita. `corpus_rule=False` anula la mitad de puntero."""
    if RUN_STAMP.search(relative_path):
        return "dated_evidence_path"
    if corpus_rule and CORPUS_POINTER.search(line):
        return "corpus_pointer"
    if DATED_IN_LINE.search(line):
        return "dated_in_line"
    return "unclassified"


def iter_files(root: Path, subtrees: list[str]):
    for subtree in subtrees:
        base = root / subtree
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if SKIPPED_DIRS & set(path.parts):
                continue
            yield path


def collect(root: Path, build: str, subtrees: list[str],
            *, corpus_rule: bool = True) -> list[Citation]:
    found: list[Citation] = []
    for path in iter_files(root, subtrees):
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if build not in content:
            continue
        relative = str(path.relative_to(root))
        for number, line in enumerate(content.splitlines(), start=1):
            if build not in line:
                continue
            found.append(Citation(
                path=relative,
                line_number=number,
                cube=classify(relative, line, corpus_rule=corpus_rule),
                text=line.strip()[:200],
            ))
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="raiz del consumidor")
    parser.add_argument("--build", required=True, help="la build que ya no rige")
    parser.add_argument("--subtree", action="append", default=None)
    parser.add_argument("--out", default=None, help="destino JSONL")
    parser.add_argument("--no-corpus-rule", action="store_true",
                        help="anula la mitad de puntero a corpus (control)")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    subtrees = args.subtree or ["source", ".claude"]
    citations = collect(root, args.build, subtrees,
                        corpus_rule=not args.no_corpus_rule)

    cubes: dict[str, int] = {}
    for citation in citations:
        cubes[citation.cube] = cubes.get(citation.cube, 0) + 1
    files = len({c.path for c in citations})

    if args.out:
        destination = Path(args.out)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("w", encoding="utf-8") as handle:
            for citation in citations:
                handle.write(json.dumps(asdict(citation), ensure_ascii=False) + "\n")

    print(f"build={args.build} raiz={root}")
    print(f"citas={len(citations)} archivos={files} subarboles={','.join(subtrees)}")
    for cube in sorted(cubes):
        print(f"  {cube:<22} {cubes[cube]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
