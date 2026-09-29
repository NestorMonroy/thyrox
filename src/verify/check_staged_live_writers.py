#!/usr/bin/env python3
"""Un commit no se lleva un archivo que un proceso vivo sigue escribiendo.

Por qué existe
--------------
Un commit por pathspec toma el contenido del archivo en el instante del
``git add``. Si un proceso vivo lo tiene abierto en escritura —el ``stream`` de
un ítem de pool que escribe directamente en un banco, un log que alguien sigue
anexando—, lo commiteado es un corte arbitrario de algo que aún no terminó, y
el commit lo presenta como evidencia cerrada. El runtime de ``pool_lifecycle``
evita que el pool lo haga; este gate atrapa a cualquier otro escritor.

Cómo mide
---------
Toma las rutas preparadas en el índice (``git diff --cached --name-only``,
sin las borradas) y pregunta a ``writer_inspector`` si algún proceso las tiene
abiertas con ``O_WRONLY`` u ``O_RDWR``. Un lector no bloquea; un escritor de un
archivo NO preparado tampoco: el commit no se lo lleva.

Salidas: 0 ningún escritor vivo · 1 hay escritores, nombrados con pid y fd ·
2 no se pudo demostrar la ausencia (un ``fdinfo`` ilegible), sin veredicto.

*Ciega a:* un escritor que abre, escribe y cierra entre el ``git add`` y este
gate, y un proceso de otro espacio de nombres de PID.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from session.writer_inspector import find_open_writers


def staged_paths(repo: Path) -> list[Path]:
    out = subprocess.run(["git", "-C", str(repo), "diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRT"],
                         capture_output=True, check=True).stdout
    return [repo / name for name in out.decode().split("\0") if name]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("paths", nargs="*", type=Path, help="rutas a medir en vez de las preparadas")
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    paths = [p if p.is_absolute() else repo / p for p in args.paths] or staged_paths(repo)
    if not paths:
        print("check_staged_live_writers: 0 escritor(es) vivo(s) (alcance medido: 0 ruta(s) preparada(s))")
        return 0
    scan = find_open_writers(paths)
    if scan.unreadable_pids:
        print(f"check_staged_live_writers: no se pudo leer fdinfo de {len(scan.unreadable_pids)} proceso(s) "
              f"({', '.join(map(str, scan.unreadable_pids))}); NO se emite veredicto.", file=sys.stderr)
        return 2
    print(f"check_staged_live_writers: {len(scan.writers)} escritor(es) vivo(s) "
          f"(alcance medido: {len(paths)} ruta(s) preparada(s))")
    for writer in scan.writers:
        print(f"    {Path(writer.path).relative_to(repo) if writer.path.startswith(str(repo)) else writer.path}: "
              f"pid {writer.pid} fd {writer.fd}")
    if scan.writers:
        print("  Un proceso vivo sigue escribiendo lo que este commit se llevaría. Espera a que termine,\n"
              "  o saca la ruta del commit; si es la salida de un pool, se publica sola al cerrarse.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
