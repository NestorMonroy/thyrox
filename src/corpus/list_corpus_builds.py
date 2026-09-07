#!/usr/bin/env python3
"""Inventario de builds vendorizadas bajo `_references/claude-code-bin/`.

El README de esa carpeta traía un diagrama a mano con seis builds cuando el
directorio ya tenía ocho, y describía `2.1.258` como «SÓLO claude_strings.txt»
cuando esa build trae también `MANIFEST.tsv` y `bunfs-root/` (le falta `src/`,
no todo). Es la forma que `calibration-verified-numbers.md` prohíbe en su
corolario "una cifra que vive en código NO se transcribe a prosa": el árbol
crece con cada extracción — de hecho creció otra vez mientras se escribía este
mismo guion (`2.1.263` no existía al abrir la tarea) — así que cualquier tabla
fijada en el README envejece antes de que alguien vuelva a leerla.

El arreglo no es corregir la tabla: eso trata el síntoma y garantiza la
reincidencia (la lección de H-DOCS-139). Este guion es el comando que el
README nombra en su lugar, igual que ya nombra `wc` para el tamaño del volcado
de cada build en vez de transcribirlo.

Qué mide
--------
Para cada directorio con forma de versión (`X.Y.Z` o `X.Y.Z-sufijo`) bajo la
raíz, cuáles de los cinco marcadores conocidos existen dentro: `bunfs-root/`,
`src/`, `MANIFEST.tsv`, `claude_strings.txt`, `README.md`. Un sufijo
(`2.1.246-nombrado`) cuenta como VISTA DERIVADA de su versión base — mismo
criterio que ya declara `check_corpus_al_dia.py` para el mismo caso — y no
como un build aparte.

*Métrica:* existencia (`Path.exists()`) de los cinco marcadores conocidos,
dentro de cada directorio cuyo nombre empieza por `X.Y.Z`.
*Ciega a:* si el CONTENIDO del marcador es fiel a esa versión (un directorio
puede llamarse `2.1.258` y tener un `bunfs-root/` de otro build — la
fidelidad la garantiza el guard de re-extracción, que es otro instrumento);
a un directorio sin forma de versión (un README.md suelto, por ejemplo, que
por eso se ignora); y a marcadores que este guion no conoce.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from paths.reach import thyrox_root  # noqa: E402

#: Los cinco marcadores que distinguen "extracción completa" de "sólo
#: volcado de cadenas" o de "vista derivada". El orden es el que se imprime.
CONTENT_MARKERS: tuple[str, ...] = (
    "bunfs-root", "src", "MANIFEST.tsv", "claude_strings.txt", "README.md",
)

#: Ruta del corpus relativa a la raíz de thyrox, para el valor por defecto.
DEFAULT_ROOT_RELATIVE = pathlib.Path("_references") / "claude-code-bin"

RE_VERSION_PREFIX = re.compile(r"^(\d+\.\d+\.\d+)(.*)$")


class BuildEntry:
    """Un directorio de build: su nombre, su versión base y lo que trae."""

    __slots__ = ("name", "version", "suffix", "present", "size_bytes")

    def __init__(self, name: str, version: str, suffix: str | None,
                 present: tuple[str, ...], size_bytes: int) -> None:
        self.name = name
        self.version = version
        self.suffix = suffix
        self.present = present
        self.size_bytes = size_bytes


def detect_markers(path: pathlib.Path) -> tuple[str, ...]:
    """Cuáles de los cinco marcadores existen dentro de `path`.

    Es EL MECANISMO que distingue una extracción completa de un volcado
    suelto o de una vista derivada. Sin este chequeo (ver el control de
    anulación de la suite), cualquier directorio se reportaría con todo
    presente, y esa distinción es justo la que el README necesitaba y no
    tenía.
    """
    return tuple(marker for marker in CONTENT_MARKERS if (path / marker).exists())


def directory_size(path: pathlib.Path) -> int:
    """Bytes de contenido, sumando sólo archivos regulares.

    No se usa `du` externo: un total en Python puro no depende de que el
    binario esté instalado ni de la locale de su salida.
    """
    total = 0
    for hijo in path.rglob("*"):
        if hijo.is_file():
            try:
                total += hijo.stat().st_size
            except OSError:
                continue
    return total


def human_size(num_bytes: int) -> str:
    """Forma legible del tamaño (B/K/M/G/T), sin depender de `du`."""
    valor = float(num_bytes)
    for unidad in ("B", "K", "M"):
        if valor < 1024:
            return f"{valor:.0f}{unidad}" if unidad == "B" else f"{valor:.1f}{unidad}"
        valor /= 1024
    return f"{valor:.1f}G"


def version_sort_key(version: str) -> tuple[int, int, int]:
    partes = version.split(".")
    return tuple(int(p) for p in partes)  # type: ignore[return-value]


def scan_root(root: pathlib.Path) -> list[BuildEntry]:
    """Los directorios con forma de versión bajo `root`, con su inventario.

    Recorrido no recursivo (`iterdir`, sin bajar a subdirectorios de un
    build): sólo interesa qué builds hay al primer nivel.
    """
    if not root.is_dir():
        return []
    entradas: list[BuildEntry] = []
    for hijo in sorted(root.iterdir()):
        if not hijo.is_dir():
            continue
        coincide = RE_VERSION_PREFIX.match(hijo.name)
        if not coincide:
            continue
        version, sufijo = coincide.group(1), coincide.group(2)
        presentes = detect_markers(hijo)
        entradas.append(BuildEntry(
            name=hijo.name, version=version, suffix=sufijo or None,
            present=presentes, size_bytes=directory_size(hijo),
        ))
    entradas.sort(key=lambda e: (version_sort_key(e.version), e.suffix or ""))
    return entradas


def format_table(entries: list[BuildEntry]) -> str:
    if not entries:
        return "sin builds bajo la raiz medida."
    ancho_nombre = max(len(e.name) for e in entries)
    lineas = []
    for e in entries:
        etiqueta = e.name.ljust(ancho_nombre)
        marcadores = ", ".join(e.present) if e.present else "(vacio)"
        derivado = f"  [vista derivada de {e.version}]" if e.suffix else ""
        lineas.append(
            f"{etiqueta}  {human_size(e.size_bytes):>7}  {marcadores}{derivado}"
        )
    return "\n".join(lineas)


def format_summary(entries: list[BuildEntry], root: pathlib.Path) -> str:
    """El pie con el denominador — nunca un conteo suelto sin su universo."""
    total = len(entries)
    con_volcado = sum(1 for e in entries if "claude_strings.txt" in e.present)
    con_bunfs = sum(1 for e in entries if "bunfs-root" in e.present)
    con_src = sum(1 for e in entries if "src" in e.present)
    con_manifest = sum(1 for e in entries if "MANIFEST.tsv" in e.present)
    derivadas = sum(1 for e in entries if e.suffix)
    return (
        f"{total} builds bajo {root} — "
        f"{con_volcado} con claude_strings.txt, {con_bunfs} con bunfs-root, "
        f"{con_src} con src, {con_manifest} con MANIFEST.tsv, "
        f"{derivadas} vista(s) derivada(s) por sufijo"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--root", default=None,
        help="raiz del corpus (default: _references/claude-code-bin de este arbol)",
    )
    args = parser.parse_args(argv)

    root = (
        pathlib.Path(args.root) if args.root
        else thyrox_root() / DEFAULT_ROOT_RELATIVE
    )
    entries = scan_root(root)

    print(f"raiz: {root}")
    print(format_table(entries))
    print()
    print(format_summary(entries, root))
    return 0


if __name__ == "__main__":
    sys.exit(main())
