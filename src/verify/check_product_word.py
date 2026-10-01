#!/usr/bin/env python3
"""Gate — la palabra «Claude» donde el producto se llama thyrox.

El árbol se portó de un ejecutable cuyo producto es Claude Code, y arrastra
esa palabra en tres usos que no son el mismo:

- **el producto** — «Claude Code», la voz del agente («What should Claude do
  instead?»), identificadores como ``getClaudeConfigHomeDir``: aquí el
  programa es thyrox, y nombrarlo de otro modo describe un programa que el
  usuario no lanzó;
- **un servicio ajeno** que el código llama por su nombre —la cuenta de
  claude.ai (``isClaudeAISubscriber``), la extensión Claude in Chrome, Claude
  Desktop—: renombrarlo describiría mal a quién se llama;
- **un texto de Anthropic sobre su modelo** —el consentimiento de uso de datos
  («help improve Claude»)—: cambiarlo alteraría lo que el usuario acepta.

Decisión del ejecutor (2026-09-27): las TRES se renombran — todo texto dice
thyrox, también el que nombra una oferta o un servicio de Anthropic. El gate
cuenta toda aparición, por archivo versionado, y congela la deuda en un
baseline: una aparición nueva, o un archivo que crece, falla con
``--strict``. ``EXTERNAL_NAMES`` queda vacía y sirve para declarar, con su
razón, una excepción que se decida después.

Salidas: 0 sin deuda nueva · 1 con deuda nueva · 2 no pudo medir.

*Métrica:* apariciones de ``Claude`` (sensible a mayúsculas) fuera de un
nombre ajeno declarado, en ``.ts``/``.tsx``/``.js``/``.mjs``/``.py``/``.sh``.
*Ciega a:* ``claude`` en minúscula (rutas como ``~/.claude``, ids de modelo
``claude-*``, que son otra decisión), a un servicio ajeno que la lista no
nombre —lo contaría como producto— y a otras extensiones.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import subprocess
import sys

BASELINE = pathlib.Path(__file__).with_name("product_word_baseline.tsv")

MEASURED_EXTENSIONS = (".ts", ".tsx", ".js", ".mjs", ".py", ".sh")

#: Nombres ajenos que contienen «Claude» y se quedarían, cada uno con su razón.
#: VACÍA por decisión del ejecutor (2026-09-27): todo texto visible dice
#: thyrox, también el que nombra una oferta o un servicio de Anthropic
#: (claude.ai, Claude in Chrome, Claude Desktop, planes, referidos). El
#: mecanismo se conserva para declarar, con su razón, una excepción futura.
EXTERNAL_NAMES: tuple[tuple[str, str], ...] = ()
_EXTERNAL = re.compile("|".join(f"(?:{pattern})" for pattern, _ in EXTERNAL_NAMES)) if EXTERNAL_NAMES else None
_WORD = re.compile("Claude")


def product_occurrences(text: str) -> int:
    """Las apariciones de «Claude» que no caen dentro de un nombre ajeno."""
    external = [match.span() for match in _EXTERNAL.finditer(text)] if _EXTERNAL else []
    return sum(
        1 for match in _WORD.finditer(text)
        if not any(start <= match.start() < end for start, end in external)
    )


def measure(repo: pathlib.Path, root: str) -> dict[str, int]:
    """Apariciones por archivo versionado bajo ``root``; sólo los que tienen alguna."""
    listed = subprocess.run(
        ["git", "ls-files", "--cached", "--", root],
        cwd=repo, check=True, capture_output=True, text=True,
    ).stdout.split()
    counts: dict[str, int] = {}
    for relative in listed:
        if not relative.endswith(MEASURED_EXTENSIONS):
            continue
        path = repo / relative
        if not path.is_file():
            continue
        count = product_occurrences(path.read_text(errors="replace"))
        if count:
            counts[relative] = count
    return counts


def load_baseline(path: pathlib.Path) -> dict[str, int]:
    if not path.is_file():
        return {}
    baseline: dict[str, int] = {}
    for line in path.read_text().splitlines():
        if line.strip():
            relative, count = line.rsplit("\t", 1)
            baseline[relative] = int(count)
    return baseline


def write_baseline(path: pathlib.Path, counts: dict[str, int]) -> None:
    path.write_text("".join(f"{relative}\t{counts[relative]}\n" for relative in sorted(counts)))


def new_debt(measured: dict[str, int], baseline: dict[str, int]) -> dict[str, tuple[int, int]]:
    """Archivos que superan su baseline: ``{ruta: (permitido, medido)}``."""
    return {
        relative: (baseline.get(relative, 0), count)
        for relative, count in sorted(measured.items())
        if count > baseline.get(relative, 0)
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="La palabra del producto donde el producto se llama thyrox.")
    parser.add_argument("--repo", type=pathlib.Path, default=pathlib.Path.cwd())
    parser.add_argument("--root", default="src")
    parser.add_argument("--baseline", type=pathlib.Path, default=BASELINE)
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--write-baseline", action="store_true")
    options = parser.parse_args(argv)

    if not (options.repo / options.root).is_dir():
        print(f"check_product_word: no existe {options.repo / options.root}; NO se emite un conteo",
              file=sys.stderr)
        return 2
    measured = measure(options.repo, options.root)
    if options.write_baseline:
        write_baseline(options.baseline, measured)
    debt = new_debt(measured, load_baseline(options.baseline))
    for relative, (allowed, found) in debt.items():
        print(f"  {relative}: {found} (baseline {allowed})")
    total = sum(measured.values())
    print(f"check_product_word: {len(debt)} archivo(s) con deuda nueva; {total} aparición(es) "
          f"del producto en {len(measured)} archivo(s) (alcance medido: {options.root})")
    return 1 if debt and options.strict else 0


if __name__ == "__main__":
    sys.exit(main())
