#!/usr/bin/env python3
"""Gate — cada entrada de ``toctree`` resuelve, y ningun documento queda fuera.

Origen: la reestructuracion de ``source/`` por emprendimiento, 2026-09-20.
Mover 640 archivos rompe indices, no referencias: un ``:doc:`` absoluto grita,
pero una entrada de ``toctree`` que dejo de resolver solo produce un WARNING
en un build que —por decision del ejecutor— no se corre.

Medido antes de escribirlo: ``check_rst_referencias`` cubre ``:doc:`` y
``:ref:`` y menciona ``toctree`` **cero veces**. No habia gate para esto.

Que mide
--------

Dos fenomenos que un ``:doc:`` no ve:

1. **Entrada rota** — una linea de ``toctree`` que no resuelve a ningun
   documento bajo ``source/``.
2. **Huerfano** — un ``.rst`` al que no se llega desde ``index.rst``
   siguiendo ``toctree``. Existe, se publica y nadie lo indexa.

*Metrica:* entradas de ``toctree`` sin destino, y archivos no alcanzables
desde la raiz.
*Ciega a:* la directiva ``:orphan:``, que marca un documento como huerfano a
proposito; a si el orden del indice tiene sentido; y a un documento
alcanzable pero citado desde ningun sitio.

Las dos cegueras que tuvo este instrumento, y que son su leccion
-----------------------------------------------------------------

Nacio en un banco de trabajo y **publico dos cifras falsas** antes de
corregirse. Las dos quedan fijadas por su suite:

- **No expandia** ``:glob:``. Todo hogar que indexa con ``*/index`` dejaba a
  sus hijos como huerfanos aparentes: reporto **568** donde habia **0**.
- **No saltaba los bloques literales.** Una plantilla MUESTRA su ``toctree``
  dentro de un ``.. code-block:: rst``, apuntando a documentos que solo
  existen al materializarla. Contarlos como entradas rotas es marcar en rojo
  justo lo que esta bien.

Uso
---

    bash bin/check_rst_toctree              # reporte, exit 0
    bash bin/check_rst_toctree --strict     # exit 1 si hay algo roto
    bash bin/check_rst_toctree RAIZ         # acotar a otra raiz de source/
"""
from __future__ import annotations

import pathlib
import re
import sys

from paths import reach

TOC_OPEN = re.compile(r"^(\s*)\.\.\s+toctree::")
LITERAL_DIRECTIVE = re.compile(
    r"^(\s*)\.\.\s+(?:code-block|code|literalinclude|highlight|raw)::"
)
OPTION = re.compile(r"^\s*:[a-z-]+:")


def source_root() -> pathlib.Path:
    return reach.consumer_root() / "source"


def toctree_entries(text: str) -> list[tuple[int, str]]:
    """``(linea, entrada)`` de cada ``toctree``, saltando bloques literales."""
    lines = text.split("\n")
    out: list[tuple[int, str]] = []
    i = 0
    literal_indent: int | None = None
    while i < len(lines):
        raw = lines[i]
        if raw.strip():
            indent = len(raw) - len(raw.lstrip())
            if literal_indent is not None and indent <= literal_indent:
                literal_indent = None
            if literal_indent is None and LITERAL_DIRECTIVE.match(raw):
                literal_indent = indent
                i += 1
                continue
        if literal_indent is not None:
            i += 1
            continue
        m = TOC_OPEN.match(raw)
        if not m:
            i += 1
            continue
        indent = len(m.group(1))
        i += 1
        while i < len(lines):
            entry = lines[i]
            if not entry.strip():
                i += 1
                continue
            sangria = len(entry) - len(entry.lstrip())
            if sangria <= indent:
                break
            body = entry.strip()
            if not OPTION.match(body) and "<" not in body:
                out.append((i + 1, body))
            i += 1
    return out


def resolve(root: pathlib.Path, origin: pathlib.Path, entry: str) -> list[pathlib.Path]:
    """Los documentos que la entrada alcanza. Vacio si no resuelve."""
    base = root if entry.startswith("/") else origin.parent
    rel = entry.lstrip("/")
    if "*" in rel:
        return sorted(
            {p.resolve() for p in base.glob(rel + ".rst")}
            | {p.resolve() for p in base.glob(rel + "/index.rst")}
        )
    for cand in ((base / rel).with_suffix(".rst"), base / rel / "index.rst"):
        if cand.is_file():
            return [cand.resolve()]
    return []


def audit(root: pathlib.Path):
    """``(entradas rotas, huerfanos, alcanzables, total)``."""
    root = root.resolve()
    start = root / "index.rst"
    if not start.is_file():
        raise SystemExit(f"check-rst-toctree: no existe la raiz del indice: {start}")

    broken: list[str] = []
    seen = {start.resolve()}
    stack = [start]
    while stack:
        actual = stack.pop()
        text = actual.read_text(encoding="utf-8", errors="replace")
        for line_no, entry in toctree_entries(text):
            targets = resolve(root, actual, entry)
            if not targets:
                broken.append(f"{actual.relative_to(root)}:{line_no}: -> {entry}")
                continue
            for d in targets:
                if d not in seen:
                    seen.add(d)
                    stack.append(d)

    # Las entradas de un documento huerfano tambien se comprueban: un indice
    # que nadie alcanza puede estar roto, y callarlo esconde dos defectos.
    all = {p.resolve() for p in root.rglob("*.rst")}
    for f in sorted(all - seen):
        text = f.read_text(encoding="utf-8", errors="replace")
        for line_no, entry in toctree_entries(text):
            if not resolve(root, f, entry):
                broken.append(f"{f.relative_to(root)}:{line_no}: -> {entry}")

    huerfanos = sorted(p.relative_to(root) for p in all - seen)
    return broken, huerfanos, len(seen), len(all)


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    roots = [a for a in argv[1:] if not a.startswith("-")]
    root = pathlib.Path(roots[0]) if roots else source_root()

    broken, huerfanos, reachable, total = audit(root)
    for row in broken:
        print(f"ROTA      {row}")
    for h in huerfanos:
        print(f"HUERFANO  {h}")

    if broken or huerfanos:
        print(f"\ncheck-rst-toctree: {len(broken)} entrada(s) rota(s), "
              f"{len(huerfanos)} huerfano(s)")
    else:
        print("check-rst-toctree: OK — todas las entradas resuelven y ningun "
              "documento queda fuera del indice")
    print(f"  (alcance medido: {reachable} alcanzable(s) de {total} .rst)")
    return 1 if ((broken or huerfanos) and strict) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
