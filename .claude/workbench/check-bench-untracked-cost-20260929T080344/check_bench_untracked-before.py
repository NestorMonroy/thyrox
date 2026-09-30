#!/usr/bin/env python3
"""Un commit que toca un banco no deja fuera los archivos nuevos del banco.

`git commit -- <banco>` commitea sólo lo que git ya sigue: un archivo nuevo sin
`git add -N` se queda fuera EN SILENCIO, y el banco publicado cita evidencia
que no viajó. Ocurrió en varios commits del lazo tsc cero, el último en el
mismo turno que escribió este gate.

Un banco es el directorio de primer nivel bajo una de `BENCH_ROOTS`. Se miran
SÓLO los bancos que el commit toca: un banco ajeno a medio escribir por otro
proceso no es asunto de este commit, y mirarlo bloquearía a todo escritor.

Un banco se toca de dos maneras: con un archivo suyo staged, o CITÁNDOLO desde
el contenido staged (una prueba o un hallazgo que lo nombra como evidencia).
La segunda faltaba, y es la forma completa del defecto: si todos los archivos
nuevos del banco quedan fuera, ninguno está staged, y el gate publicaba
«0 banco(s) tocado(s)» (82417e3d, dos archivos del banco que cuatro pruebas
citaban).

Uso: check_bench_untracked [--repo R] [ruta ...]  (sin rutas: las staged)
Salidas: 0 nada fuera · 1 algo fuera, nombrado · 2 no se pudo medir.

Métrica: archivos que `git ls-files --others --exclude-standard` da dentro de
cada banco tocado; la cita se busca por el nombre del banco en el contenido
del índice. Ciega a: un archivo ignorado por `.gitignore`, que no se commitea
con ni sin `add -N`, y a una cita que nombre el banco de otra forma que por su
nombre de directorio.
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


def existing_benches(repo: Path) -> list[str]:
    """Los bancos que hay en disco, como `<raíz><nombre>`."""
    benches = []
    for root in BENCH_ROOTS:
        directory = repo / root
        if directory.is_dir():
            benches.extend(root + entry.name for entry in directory.iterdir() if entry.is_dir())
    return benches


def staged_text(repo: Path, path: str) -> str:
    """El contenido de `path` en el ÍNDICE del commit, o vacío si no está.

    Se lee con `git show :<ruta>`, que respeta `GIT_INDEX_FILE`: en un commit
    por pathspec el pre-commit ve el índice temporal, que es lo que viaja.
    """
    result = subprocess.run(["git", "show", f":{path}"], cwd=repo, capture_output=True)
    return result.stdout.decode("utf-8", "replace") if result.returncode == 0 else ""


def cited_benches(repo: Path, staged: list[str]) -> set[str]:
    """Los bancos cuyo NOMBRE aparece en el contenido staged.

    Un banco también se toca citándolo: una prueba o un hallazgo que nombra el
    banco como su evidencia. Si todos los archivos nuevos del banco quedan
    fuera, ninguno está staged, y sólo la cita dice que el commit lo usa. El
    nombre lleva sello de tiempo, así que es un ancla distintiva.
    """
    candidates = existing_benches(repo)
    if not candidates:
        return set()
    texts = [staged_text(repo, path) for path in staged]
    return {bench for bench in candidates
            if any(bench.rsplit("/", 1)[-1] in text for text in texts)}


def touched_benches(repo: Path, staged: list[str]) -> set[str]:
    """Los bancos que el commit toca: por un archivo suyo staged o por su cita."""
    return {b for b in map(bench_of, staged) if b} | cited_benches(repo, staged)


def untracked_in_benches(repo: Path, staged: list[str]) -> dict[str, list[str]]:
    benches = sorted(touched_benches(repo, staged))
    found: dict[str, list[str]] = {}
    for bench in benches:
        result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "--", bench],
                                cwd=repo, capture_output=True, text=True, check=True)
        files = sorted(line for line in result.stdout.splitlines() if line)
        if files:
            found[bench] = files
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
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
    benches = touched_benches(args.repo, staged)
    print(f"check_bench_untracked: {sum(map(len, found.values()))} archivo(s) fuera "
          f"(alcance medido: {len(benches)} banco(s) tocado(s))", file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main())
