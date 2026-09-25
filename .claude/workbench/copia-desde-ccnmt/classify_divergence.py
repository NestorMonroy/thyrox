"""Clasifica por qué un archivo de thyrox difiere de su par en ccnmt.

Tres cubos, del más barato de copiar al más caro:
  alias      idénticos tras reescribir `@claude-code-how-works/` → `@thyrox/`
  comentario idénticos además sin comentarios ni líneas en blanco
  codigo     el código difiere (correcciones, portes posteriores, divergencias)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ALIAS = re.compile(r"@claude-code-how-works/")
BLOCK = re.compile(r"/\*.*?\*/", re.S)
LINE = re.compile(r"(?m)^\s*//.*$|(?<=[;,{}()\s])//[^\n'\"`]*$")


def normalize(text: str, strip_comments: bool) -> str:
    text = ALIAS.sub("@thyrox/", text)
    if strip_comments:
        text = BLOCK.sub("", text)
        text = LINE.sub("", text)
    return "\n".join(line.rstrip() for line in text.splitlines() if line.strip())


def main(ours_root: Path, source_root: Path, listing: Path) -> None:
    for rel in listing.read_text().split():
        ours = (ours_root / rel).read_text(errors="ignore")
        source = (source_root / rel).read_text(errors="ignore")
        if normalize(ours, False) == normalize(source, False):
            bucket = "alias"
        elif normalize(ours, True) == normalize(source, True):
            bucket = "comentario"
        else:
            bucket = "codigo"
        print(f"{bucket}\t{rel}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
