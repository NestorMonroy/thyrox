#!/usr/bin/env python3
"""¿Lo que entra a la historia bajo `.claude/cache/` es índice?

`cache/paths.py` define tres hogares hermanos, y NO son el mismo:

- `jobs/`      — la salida de un proceso, `<nombre>-<ISO>/` con su manifiesto;
- `workbench/` — la evidencia de un episodio, con su README;
- `cache/`     — el ÍNDICE reconstruible, que existe para no rehacer trabajo.

Lo único que el contrato de `cache/` declara es el índice de `work_cache`
(`.work-index.json`) y las copias de trabajo de `annul_parallel.sh`
(`<nombre>/annul/<ejecución>/…`). Medido al escribir este gate: 0 de 97
archivos versionados eran eso. Eran logs de antes y después, sondas,
respaldos y una herramienta, sueltos y sin procedencia, porque `cache/` se usó
como borrador y nada medía su forma.

*Métrica:* rutas versionadas o preparadas bajo la raíz del cache.
*Ciega a:* lo que está en disco sin versionar —un índice no se versiona por
fuerza— y al contenido: un `.work-index.json` con otra cosa dentro pasa.

Uso: check_cache_layout.py [--root R] [--cache C] [--strict]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

INDEX_FILE = ".work-index.json"
# `annul_parallel.sh`: `.claude/cache/<name>/annul/<run-id>/<index>/…`.
_ANNUL = re.compile(r"^[^/]+/annul/\d{8}T\d{6}-\d+/")
HOME_HINT = ("no es índice: la evidencia de un episodio va a .claude/workbench/<episodio>/, "
             "la salida de un proceso a .claude/jobs/ (thyrox-bg)")


def belongs(relative: str) -> bool:
    """¿La ruta, relativa a la raíz del cache, es algo que su contrato declara?"""
    return Path(relative).name == INDEX_FILE or bool(_ANNUL.match(relative))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--cache", type=Path, help="raíz del cache (por defecto <root>/.claude/cache)")
    parser.add_argument("--strict", action="store_true", help="exit 1 si hay algo que no es índice")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    cache = (args.cache or root / ".claude" / "cache").resolve()
    listed = subprocess.run(["git", "ls-files", "--cached", "--", str(cache)], cwd=root,
                            capture_output=True, text=True) if root.is_dir() else None
    if listed is None or listed.returncode != 0:
        print(f"check_cache_layout: {root} no es un repositorio que se pueda medir — no se publica una cifra",
              file=sys.stderr)
        return 2
    tracked = [line for line in listed.stdout.splitlines() if line.strip()]
    prefix = str(cache.relative_to(root)) + "/"
    foreign = [path for path in tracked if not belongs(path.removeprefix(prefix))]
    for path in foreign:
        print(f"  {path}")
    if foreign:
        print(f"  -> {HOME_HINT}")
    print(f"check_cache_layout: {len(foreign)} ajeno(s) al índice (alcance medido: de {len(tracked)} "
          f"versionado(s) bajo {prefix})")
    return 1 if foreign and args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
