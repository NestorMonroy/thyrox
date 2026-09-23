#!/usr/bin/env python3
"""Un commit que toca un banco no deja fuera los archivos nuevos del banco.

`git commit -- <banco>` commitea sólo lo que git ya sigue: un archivo nuevo sin
`git add -N` se queda fuera EN SILENCIO, y el banco publicado cita evidencia
que no viajó. Ocurrió en varios commits del lazo tsc cero, el último en el
mismo turno que escribió este gate.

Un banco es el directorio de primer nivel bajo una de `BENCH_ROOTS`. Se miran
SÓLO los bancos que el commit toca: un banco ajeno a medio escribir por otro
proceso no es asunto de este commit, y mirarlo bloquearía a todo escritor.

Uso: check_bench_untracked [--repo R] [ruta ...]  (sin rutas: las staged)
Salidas: 0 nada fuera · 1 algo fuera, nombrado · 2 no se pudo medir.

Métrica: archivos que `git ls-files --others --exclude-standard` da dentro de
cada banco tocado. Ciega a: un archivo ignorado por `.gitignore`, que no se
commitea con ni sin `add -N`.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

BENCH_ROOTS = (".claude/workbench/", ".claude/jobs/")


def bench_of(path: str) -> str | None:
    for root in BENCH_ROOTS:
        if path.startswith(root):
            name = path[len(root):].split("/", 1)[0]
            return root + name if name else None
    return None


def untracked_in_benches(repo: Path, staged: list[str]) -> dict[str, list[str]]:
    benches = sorted({b for b in map(bench_of, staged) if b})
    found: dict[str, list[str]] = {}
    for bench in benches:
        result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "--", bench],
                                cwd=repo, capture_output=True, text=True, check=True)
        files = sorted(line for line in result.stdout.splitlines() if line)
        if files:
            found[bench] = files
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("paths", nargs="*")
    args = parser.parse_args(argv)
    try:
        staged = args.paths or subprocess.run(
            ["git", "diff", "--cached", "--name-only"], cwd=args.repo,
            capture_output=True, text=True, check=True).stdout.splitlines()
        found = untracked_in_benches(args.repo, staged)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"check_bench_untracked: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    for bench, files in found.items():
        print(f"check_bench_untracked: {bench} deja fuera {len(files)} archivo(s) nuevo(s):",
              file=sys.stderr)
        for file in files:
            print(f"  {file}", file=sys.stderr)
    if found:
        print("  remedio: git add -N <archivo> antes del commit por pathspec", file=sys.stderr)
    benches = {b for b in map(bench_of, staged) if b}
    print(f"check_bench_untracked: {sum(map(len, found.values()))} archivo(s) fuera "
          f"(alcance medido: {len(benches)} banco(s) tocado(s))", file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main())
