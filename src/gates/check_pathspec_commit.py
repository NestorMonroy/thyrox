#!/usr/bin/env python3
"""Gate — una ruta que `git add -N` declaró y el commit NO publicó.

EL DEFECTO, MEDIDO — y NO es el que la ficha enunciaba. ERR-31 lo describía
como «el archivo se publica VACÍO». Reproducido en git 2.43.0, eso **no
ocurre**: `git add -N a.txt` seguido de `git commit -- a.txt` publica los 12
bytes del disco, porque un commit por pathspec lee el árbol de trabajo.

Lo que sí ocurre, y produce el mismo síntoma para quien lee el resultado, es
la otra combinación:

    git add -N b.txt          # sólo la INTENCIÓN de añadir
    git commit -m "..."       # SIN pathspec: commitea lo que hay en el índice

El commit tiene éxito —publica lo demás— y `b.txt` **no entra en absoluto**:
`git cat-file -s HEAD:b.txt` responde *«exists on disk, but not in HEAD»*, que
es el literal que la ficha cita. El archivo no queda vacío: queda **ausente**,
y nada en la salida del commit lo anuncia.

Corregir la premisa importa: un gate construido sobre «vacío en el commit»
mide un fenómeno que este git no produce, y publicaría 0 para siempre. Es el
sub-patrón D en el instrumento mismo — un control que no puede fallar.

QUÉ MIDE. Las rutas que quedan en estado *intent-to-add* después del commit:
`git diff-files --diff-filter=A --name-only`, que las lista, mientras
`git diff --cached` no las ve. Se corre DESPUÉS de commitear.

Sin repo alcanzable REHÚSA con exit 2: un 0 ahí no distinguiría «nada quedó
sin publicar» de «no medí nada».
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

EXIT_OK, EXIT_VIOLATIONS, EXIT_GUARD = 0, 1, 2


def _git(repo: str, *args: str) -> tuple[int, str]:
    done = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    return done.returncode, done.stdout


def changed_paths(repo: str, commit: str) -> list[str]:
    """Rutas que el commit AÑADE o MODIFICA — el denominador del veredicto."""
    code, out = _git(repo, "diff-tree", "--no-commit-id", "--name-status",
                     "-r", "--diff-filter=AM", commit)
    if code != 0:
        return []
    return [line.split("\t", 1)[1] for line in out.splitlines()
            if len(line.split("\t", 1)) == 2]


def intent_to_add(repo: str) -> list[tuple[str, int]]:
    """Rutas declaradas con ``add -N`` y no publicadas, con su tamaño en disco.

    El instrumento es ``diff-files``, no ``diff --cached``: medido, una entrada
    *intent-to-add* aparece en el primero y **no** en el segundo, así que un
    gate montado sobre el índice publicaría 0 con el defecto delante.
    """
    code, out = _git(repo, "diff-files", "--diff-filter=A", "--name-only")
    if code != 0:
        return []
    pendientes = []
    for path in out.splitlines():
        if not path.strip():
            continue
        disco = Path(repo) / path
        try:
            pendientes.append((path, disco.stat().st_size))
        except OSError:
            pendientes.append((path, -1))
    return pendientes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", nargs="?", default=os.getcwd())
    parser.add_argument("--commit", default="HEAD",
                        help="el commit a medir (default: HEAD)")
    parser.add_argument("--quiet", action="store_true", help="sólo el conteo")
    args = parser.parse_args()

    code, _ = _git(args.repo, "rev-parse", "--is-inside-work-tree")
    if code != 0:
        print(f"ERROR — {args.repo} no es un repo git. NO se emite un conteo: un 0 "
              "aquí no distinguiría «ningún archivo salió vacío» de «no medí».",
              file=sys.stderr)
        return EXIT_GUARD

    code, _ = _git(args.repo, "rev-parse", "--verify", f"{args.commit}^{{commit}}")
    if code != 0:
        print(f"ERROR — {args.commit} no resuelve a un commit en {args.repo}. "
              "NO se emite un veredicto.", file=sys.stderr)
        return EXIT_GUARD

    tocadas = changed_paths(args.repo, args.commit)
    offenders = intent_to_add(args.repo)

    if args.quiet:
        print(len(offenders))
        return EXIT_VIOLATIONS if offenders else EXIT_OK

    for path, en_disco in offenders:
        print(f"DECLARADA Y NO PUBLICADA  {path}")
        detalle = f"{en_disco} bytes en disco" if en_disco >= 0 else "ausente del disco"
        print(f"    `git add -N` declaró la intención; el commit no la incluyó "
              f"({detalle}).")
    if offenders:
        print()
        print("Se arregla con `git add <ruta>` y un commit — o `git commit --amend` "
              "SÓLO si el anterior no se publicó.")

    print(f"{len(offenders)} ruta(s) declarada(s) y no publicada(s)  "
          f"(alcance medido: {len(tocadas)} ruta(s) que {args.commit} añade o "
          f"modifica)")
    print("Métrica: entradas intent-to-add vivas tras el commit "
          "(`git diff-files --diff-filter=A`).")
    print("Ciega a: la ruta que se declaró y se retiró a propósito, y al archivo "
          "publicado con contenido PARCIAL — mide presencia, no equivalencia.")
    return EXIT_VIOLATIONS if offenders else EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
