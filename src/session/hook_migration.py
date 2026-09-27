#!/usr/bin/env python3
"""El procedimiento para mover el archivo de un hook que el cliente ejecuta.

Un comando de hook es un contrato por ruta con la configuración viva: si la
ruta deja de existir, ``python3`` sale 2 y el cliente trata ese 2 como un
bloqueo de cada llamada a herramienta. Mover el archivo sigue
este orden, y cada paso que se puede medir tiene aquí su comando:

1. ``refs VIEJO``: todas las referencias al nombre, en thyrox y en cada
   consumidor, clasificadas por su ruta;
2. crear el archivo nuevo junto al viejo, y cambiar el cableado declarado y
   las configuraciones vivas al nuevo;
3. ``probe NUEVO VIEJO`` y, tras una llamada a herramienta,
   ``confirm NUEVO VIEJO``: el cliente ejecuta el nuevo y no el viejo;
4. retirar el viejo;
5. ``broken``: ningún ``settings`` apunta a un archivo ausente, y ``refs
   VIEJO`` sin referencias vivas.

Las clases de ``refs``: ``LIVE`` (código, pruebas, configuración: un error si
sigue nombrando lo viejo), ``CURRENT_DOC`` (reglas y documentación vigentes:
se actualizan), ``HISTORICAL`` (bancos, trabajos, eventos, respaldos, hallazgos
fechados: se conservan) y ``UNCLASSIFIED`` (una ruta que ninguna regla cubre:
la decide quien migra, no un default).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from paths import reach
from session.user_wiring import broken_targets

#: Por prefijo de ruta relativa al repositorio; gana el primero que casa.
PATH_CLASSES: tuple[tuple[str, str], ...] = (
    (".claude/settings-backups/", "HISTORICAL"),
    (".claude/workbench/", "HISTORICAL"),
    (".claude/jobs/", "HISTORICAL"),
    (".claude/eventos/", "HISTORICAL"),
    (".claude/build-logs/", "HISTORICAL"),
    (".claude/cache/", "HISTORICAL"),
    ("agent-results/", "HISTORICAL"),
    ("_references/", "HISTORICAL"),
    ("_archived/", "HISTORICAL"),
    ("source/gestion/pm/", "HISTORICAL"),
    (".claude/rules/", "CURRENT_DOC"),
    (".claude/skills/", "CURRENT_DOC"),
    (".claude/agents/", "CURRENT_DOC"),
    (".claude/commands/", "CURRENT_DOC"),
    (".claude/CLAUDE.md", "CURRENT_DOC"),
    ("CLAUDE.md", "CURRENT_DOC"),
    ("README", "CURRENT_DOC"),
    ("source/", "CURRENT_DOC"),
    (".claude/hooks/", "LIVE"),
    (".claude/scripts/", "LIVE"),
    (".claude/settings", "LIVE"),
    (".githooks/", "LIVE"),
    ("src/", "LIVE"),
    ("bin/", "LIVE"),
    ("tests/", "LIVE"),
    ("scripts/", "LIVE"),
)

#: Lo que ``refs`` deja pasar: sólo la evidencia fechada puede seguir nombrando lo viejo.
PASSING_KINDS = frozenset({"HISTORICAL"})

#: El atime con que ``probe`` marca un archivo: cualquier lectura posterior lo supera.
PROBE_ATIME = 1


def classify_path(rel: str) -> str:
    """La clase de una ruta relativa a su repositorio."""
    for prefix, kind in PATH_CLASSES:
        if rel.startswith(prefix):
            return kind
    return "UNCLASSIFIED"


@dataclass(frozen=True)
class Reference:
    kind: str
    root: Path
    path: str
    line: int


def find_references(name: str, roots: list[Path]) -> list[Reference]:
    """Cada línea que nombra ``name`` en los repositorios, versionada o no ignorada."""
    found: list[Reference] = []
    for root in roots:
        result = subprocess.run(
            ["git", "-C", str(root), "grep", "-n", "-I", "-F", "--untracked", "-e", name],
            capture_output=True, text=True)
        if result.returncode not in (0, 1):
            raise RuntimeError(f"git grep no pudo buscar en {root}: {result.stderr.strip()}")
        for hit in result.stdout.splitlines():
            path, line, _ = hit.split(":", 2)
            found.append(Reference(classify_path(path), Path(root), path, int(line)))
    return found


def refs_verdict(refs: list[Reference]) -> int:
    """0 si sólo queda evidencia fechada; 1 si algo vivo, vigente o sin clasificar la nombra."""
    return 0 if all(r.kind in PASSING_KINDS for r in refs) else 1


def broken_hook_commands(roots: list[Path], user_settings: list[Path]) -> list[dict]:
    """Los comandos de hook cuyo archivo no existe, en cada ``settings`` que el cliente puede cargar.

    Los de un repositorio se resuelven contra su raíz, que es el cwd de una
    sesión abierta en él; los del usuario, contra el cwd del hook.
    """
    broken: list[dict] = []
    candidates = [(Path(root) / ".claude" / name, str(root))
                  for root in roots for name in ("settings.json", "settings.local.json")]
    candidates += [(Path(path), None) for path in user_settings]
    for settings, cwd in candidates:
        if not settings.is_file():
            continue
        data = json.loads(settings.read_text())
        for entry in broken_targets(data, cwd=cwd):
            broken.append({**entry, "settings": str(settings)})
    return broken


def probe(paths: list[Path]) -> None:
    """Marca cada archivo con un atime anterior a cualquier lectura, sin tocar su mtime."""
    for path in paths:
        os.utime(path, (PROBE_ATIME, path.stat().st_mtime))


def read_since_probe(paths: list[Path]) -> list[bool]:
    """Por archivo, si alguien lo leyó después de ``probe``."""
    return [path.stat().st_atime > PROBE_ATIME for path in paths]


def atime_observable(directory: Path) -> bool:
    """Si una lectura en ``directory`` actualiza el atime; con ``noatime``, ``confirm`` no puede medir."""
    with tempfile.NamedTemporaryFile("w", dir=directory, delete=False) as handle:
        handle.write("x")
    path = Path(handle.name)
    try:
        probe([path])
        path.read_text()
        return read_since_probe([path])[0]
    finally:
        path.unlink()


def default_roots() -> list[Path]:
    """thyrox y cada consumidor declarado."""
    return [reach.thyrox_root(), *(Path(p) for p in reach.paths())]


def default_user_settings() -> list[Path]:
    home = Path.home() / ".claude"
    return [home / "settings.json", home / "settings.local.json"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    refs_cmd = commands.add_parser("refs", help="clasifica cada referencia a un nombre")
    refs_cmd.add_argument("name")
    refs_cmd.add_argument("--root", action="append", type=Path)
    broken_cmd = commands.add_parser("broken", help="comandos de hook con archivo ausente")
    broken_cmd.add_argument("--root", action="append", type=Path)
    broken_cmd.add_argument("--user-settings", action="append", type=Path)
    for name, text in (("probe", "marca los archivos antes de una llamada a herramienta"),
                       ("confirm", "dice cuáles se leyeron desde la marca")):
        sub = commands.add_parser(name, help=text)
        sub.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args(argv)

    if args.command == "refs":
        refs = find_references(args.name, args.root or default_roots())
        for r in refs:
            print(f"{r.kind}\t{r.root}/{r.path}:{r.line}")
        counts = {kind: sum(r.kind == kind for r in refs)
                  for kind in ("LIVE", "CURRENT_DOC", "UNCLASSIFIED", "HISTORICAL")}
        print(" ".join(f"{kind}={n}" for kind, n in counts.items()))
        return refs_verdict(refs)
    if args.command == "broken":
        broken = broken_hook_commands(args.root or default_roots(), args.user_settings or default_user_settings())
        for entry in broken:
            print(f"{entry['settings']}\t{entry['event']}\t{entry['path']}")
        print(f"rotos={len(broken)}")
        return 1 if broken else 0
    if not atime_observable(args.paths[0].parent):
        print("hook_migration: REHUSA — este sistema de archivos no actualiza el atime al leer; "
              "no se puede saber qué archivo ejecuta el cliente", file=sys.stderr)
        return 2
    if args.command == "probe":
        probe(args.paths)
        print(f"marcados={len(args.paths)}")
        return 0
    seen = read_since_probe(args.paths)
    for path, was_read in zip(args.paths, seen):
        print(f"{'leido' if was_read else 'sin-leer'}\t{path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
