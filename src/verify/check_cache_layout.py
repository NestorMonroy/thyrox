#!/usr/bin/env python3
"""¿El cache dice qué guarda? Una carpeta por unidad, con su `README.md`.

`.claude/cache/` es el material reconstruible que existe para no rehacer
trabajo (`cache/paths.py`): sondas, listas de símbolos, logs de antes y
después de una medición. Se versiona para que cualquier `claude -p`, con el
modelo que sea, retome sin rehacerlo: la caché de prompt es por modelo y no
sobrevive a un cambio, el disco sí.

Para reutilizarlo hay que saber qué es, y por eso se organiza como `jobs/`:
`<carpeta>/` por unidad de trabajo, con un `README.md` que dice qué contiene,
de qué episodio sale y con qué comando se regenera. Un archivo suelto en la
raíz no lo dice, y una carpeta sin README tampoco.

Lo que escriben los mecanismos por su cuenta queda fuera: el índice de
`work_cache` (`.work-index.json`) y las copias de `annul_parallel.sh`
(`<nombre>/annul/<ejecución>/`).

El hogar NO es un literal: sale de `cache.paths.cache_dir()`, que honra
`THYROX_CACHE_<CLON>` y `THYROX_CACHE_DIR`.

*Métrica:* rutas versionadas (o preparadas, con `--staged`) bajo el hogar
del cache, agrupadas por su primer segmento.
*Ciega a:* si el README dice algo útil, y a lo no versionado.

Uso: check_cache_layout.py [--root R] [--cache C] [--staged] [--strict]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

INDEX_FILE = ".work-index.json"
README = "README.md"
# `annul_parallel.sh`: `<cache>/<name>/annul/<run-id>/<index>/…`.
_ANNUL = re.compile(r"^[^/]+/annul/\d{8}T\d{6}-\d+/")

LOOSE = "suelto en la raíz: va en <carpeta>/ con su README.md, como jobs/"
NO_README = "carpeta sin README.md: no dice qué guarda ni cómo se regenera"


def _mechanism(relative: str) -> bool:
    return Path(relative).name == INDEX_FILE or bool(_ANNUL.match(relative))


def problems(paths: set[str], only: set[str] | None = None) -> list[tuple[str, str]]:
    """Las unidades del cache que no dicen qué son. `paths` son rutas
    relativas al hogar; `only` acota el reporte a esas unidades (las que un
    commit toca), mientras el README se busca en todo `paths`."""
    found: dict[str, str] = {}
    for relative in sorted(paths):
        if _mechanism(relative):
            continue
        entry = relative.split("/", 1)[0]
        if only is not None and entry not in only:
            continue
        if "/" not in relative:
            found[entry] = LOOSE
        elif f"{entry}/{README}" not in paths:
            found.setdefault(entry, NO_README)
    return sorted(found.items())


def _git_paths(root: Path, home: Path, *args: str) -> list[str] | None:
    result = subprocess.run(["git", *args, "--", str(home)], cwd=root, capture_output=True, text=True)
    if result.returncode != 0:
        return None
    return [str((root / line).resolve().relative_to(home)) for line in result.stdout.splitlines() if line.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--cache", type=Path, help="el hogar; por defecto el que resuelve cache_dir()")
    parser.add_argument("--staged", action="store_true", help="sólo las unidades que el commit prepara")
    parser.add_argument("--strict", action="store_true", help="exit 1 si alguna unidad no dice qué es")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    if not root.is_dir():
        print(f"check_cache_layout: {root} no existe — no se publica una cifra", file=sys.stderr)
        return 2
    if args.cache:
        home = args.cache.resolve()
    else:
        from cache.paths import cache_dir  # noqa: PLC0415 — el hogar se resuelve al llamar
        home = cache_dir(root).resolve()
    tracked = _git_paths(root, home, "ls-files", "--cached")
    if tracked is None:
        print(f"check_cache_layout: {root} no es un repositorio que se pueda medir — no se publica una cifra",
              file=sys.stderr)
        return 2
    only = None
    if args.staged:
        staged = _git_paths(root, home, "diff", "--cached", "--name-only", "--diff-filter=ACMR") or []
        only = {path.split("/", 1)[0] for path in staged}
    found = problems(set(tracked), only)
    for entry, reason in found:
        print(f"  {entry}: {reason}")
    scope = f"{len(only)} unidad(es) tocada(s) por el commit" if only is not None else "todas las unidades"
    print(f"check_cache_layout: {len(found)} unidad(es) sin carpeta o sin README (alcance medido: {scope}, "
          f"de {len(tracked)} versionado(s) bajo {home})")
    return 1 if found and args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
