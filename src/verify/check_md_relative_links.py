#!/usr/bin/env python3
"""Cada enlace relativo de Markdown apunta a un archivo que existe.

Un enlace roto no falla en ningún sitio: el lector lo sigue y no encuentra
nada. La mudanza de `.claude/references/` a `_references/` dejó así los
enlaces de las skills, y ningún gate lo veía — los dos de `.md` que había
miden otra cosa (una mención en `código` que debería ser enlace).

Uso: ``check_md_relative_links.py [RAIZ ...]`` — por defecto `.claude/skills`
del árbol. Sale 0 sin rotos, 1 con alguno, 2 si una raíz no existe (sin
conteo: un cero ahí no distinguiría «no hay rotos» de «no pude medir»).

Métrica: destinos `](ruta)` relativos de los `.md` bajo las raíces, sin el
fragmento, resueltos contra el directorio del archivo que los lleva.
Ciega a: enlaces de referencia (`[x][id]` con `[id]: ruta`), destinos con
marcadores (`{nombre}`, `<slug>`), que son plantillas y no rutas, y a si el
fragmento nombra una sección que exista.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

LINK = re.compile(r"\]\(([^()\s]+)(?:\s+\"[^\"]*\")?\)")
CODE_SPAN = re.compile(r"`+[^`]*`+")
FENCE = re.compile(r"^\s*(```|~~~)")
SCHEME = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")
PLACEHOLDER = re.compile(r"[{}<>*]")


def relative_targets(text: str):
    """(línea, destino) de cada enlace relativo fuera de código."""
    in_fence = False
    for number, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for match in LINK.finditer(CODE_SPAN.sub("", line)):
            target = match.group(1)
            if SCHEME.match(target) or target.startswith(("#", "/")) or PLACEHOLDER.search(target):
                continue
            yield number, target


def main(argv: list[str]) -> int:
    top = Path(__file__).resolve().parents[2]
    roots = [Path(a) for a in argv] or [top / ".claude" / "skills"]
    missing_roots = [r for r in roots if not r.is_dir()]
    if missing_roots:
        print(f"check_md_relative_links: REHÚSA — no existe {', '.join(map(str, missing_roots))}",
              file=sys.stderr)
        return 2
    broken: list[str] = []
    total = files = 0
    for root in roots:
        for path in sorted(root.rglob("*.md")):
            files += 1
            for number, target in relative_targets(path.read_text(encoding="utf-8", errors="replace")):
                total += 1
                if not (path.parent / target.split("#", 1)[0]).exists():
                    broken.append(f"{path.relative_to(root)}:{number}: {target}")
    for line in broken:
        print(line)
    print(f"check_md_relative_links: {len(broken)} enlace(s) roto(s) "
          f"(alcance medido: {total} enlace(s) relativo(s) en {files} archivo(s))")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
