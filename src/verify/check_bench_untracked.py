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
import threading
from collections.abc import Iterator
from pathlib import Path

from session.pool_lifecycle import CLOSED_SUFFIX, item_of_artifact

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


#: Los caracteres de un token de nombre de banco. Un nombre se cita como TOKEN
#: delimitado por cualquier otro carácter (`/`, espacio, comilla invertida,
#: punto): así la cita de `bench-ab` no toca `bench-a`, que es lo que la búsqueda
#: por subcadena hacía, y `bench-a.` al final de una oración sí lo toca. El punto
#: queda fuera del token; un nombre que lo lleva se busca aparte.
BENCH_NAME_CHARS = frozenset(b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")

#: Tabla de `bytes.translate`: los caracteres de token quedan, el resto pasa a
#: espacio. Con ella el corte en tokens y el cruce con los nombres corren en C.
TOKEN_TABLE = bytes(byte if byte in BENCH_NAME_CHARS else 0x20 for byte in range(256))

#: Tamaño del tramo que se parte en tokens de una vez: acota la lista de tokens
#: viva en memoria sin importar el tamaño del blob.
TOKEN_CHUNK_BYTES = 4 * 1024 * 1024


def tokens_cited(blob: bytes, names: frozenset[bytes]) -> set[bytes]:
    """Los `names` que aparecen como token completo en `blob`, por tramos."""
    text = blob.translate(TOKEN_TABLE)
    found: set[bytes] = set()
    start, size = 0, len(text)
    while start < size:
        end = min(start + TOKEN_CHUNK_BYTES, size)
        if end < size:
            # El tramo termina en un espacio: ningún token queda partido.
            cut = text.find(b" ", end)
            end = size if cut < 0 else cut
        found.update(names.intersection(text[start:end].split()))
        start = end
    return found


def dotted_names_cited(blob: bytes, names: frozenset[bytes]) -> set[bytes]:
    """Los nombres con punto que aparecen delimitados por caracteres fuera del token.

    Son pocos (una versión en el nombre, `…-2.1.266-…`), así que la búsqueda
    directa por cada uno cuesta lo mismo que una pasada.
    """
    found: set[bytes] = set()
    for name in names:
        position = blob.find(name)
        while position >= 0:
            before = blob[position - 1] if position > 0 else 0x20
            after_index = position + len(name)
            after = blob[after_index] if after_index < len(blob) else 0x20
            if before not in BENCH_NAME_CHARS and before != 0x2E \
                    and after not in BENCH_NAME_CHARS:
                found.add(name)
                break
            position = blob.find(name, position + 1)
    return found


def staged_blobs(repo: Path, staged: list[str]) -> Iterator[bytes]:
    """El contenido de cada ruta en el ÍNDICE del commit, con UNA sola lectura.

    `git cat-file --batch` con `:<ruta>` respeta `GIT_INDEX_FILE` igual que
    `git show :<ruta>`: en un commit por pathspec el pre-commit ve el índice
    temporal, que es lo que viaja. Un solo proceso en vez de uno por archivo;
    una ruta ausente del índice responde `missing` y se salta.
    """
    if not staged:
        return
    request = "".join(f":{path}\n" for path in staged).encode()
    process = subprocess.Popen(["git", "cat-file", "--batch"], cwd=repo,
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    assert process.stdin is not None and process.stdout is not None
    # La petición se escribe entera antes de leer: con muchas rutas el
    # buffer de salida se llenaría y los dos procesos quedarían esperándose.
    writer = threading.Thread(target=_write_and_close, args=(process.stdin, request))
    writer.start()
    try:
        for _ in staged:
            header = process.stdout.readline()
            if not header:
                break
            fields = header.split()
            if len(fields) != 3:          # «<ruta> missing»: no está en el índice
                continue
            blob = process.stdout.read(int(fields[2]))
            process.stdout.read(1)        # el salto de línea que cierra el objeto
            yield blob
    finally:
        writer.join()
        process.stdout.close()
        process.wait()


def _write_and_close(stream, data: bytes) -> None:
    try:
        stream.write(data)
    finally:
        stream.close()


def cited_benches(repo: Path, staged: list[str]) -> set[str]:
    """Los bancos cuyo NOMBRE aparece como token en el contenido staged.

    Un banco también se toca citándolo: una prueba o un hallazgo que nombra el
    banco como su evidencia. Si todos los archivos nuevos del banco quedan
    fuera, ninguno está staged, y sólo la cita dice que el commit lo usa.

    Una sola pasada por el contenido: cada blob se parte en tokens y se cruza
    con los nombres de banco. El coste es el de los bytes staged, no el de
    bancos × bytes, que con 1845 bancos y 107 MB llevaba ~117 s por llamada.
    """
    by_name = {bench.rsplit("/", 1)[-1].encode(): bench for bench in existing_benches(repo)}
    if not by_name:
        return set()
    plain = frozenset(name for name in by_name if b"." not in name)
    dotted = frozenset(name for name in by_name if b"." in name)
    cited: set[bytes] = set()
    for blob in staged_blobs(repo, staged):
        cited |= tokens_cited(blob, plain)
        cited |= dotted_names_cited(blob, dotted - cited)
    return {by_name[name] for name in cited}


def touched_benches(repo: Path, staged: list[str]) -> set[str]:
    """Los bancos que el commit toca: por un archivo suyo staged o por su cita."""
    return {b for b in map(bench_of, staged) if b} | cited_benches(repo, staged)


def untracked_in_benches(repo: Path, staged: list[str],
                         benches: set[str] | None = None) -> dict[str, list[str]]:
    """Los archivos sin seguimiento de cada banco tocado.

    `benches` evita recalcular los bancos tocados cuando el llamador ya los
    tiene: `main` los usa también para publicar el alcance medido.
    """
    wanted = touched_benches(repo, staged) if benches is None else set(benches)
    if not wanted:
        return {}
    # Una sola consulta con todos los bancos como pathspec: una por banco
    # lanzaba un proceso por cada uno, y un contenido que cita casi todos los
    # bancos (un listado de directorios) llevaba a 1836 procesos, ~30 s.
    result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "--", *sorted(wanted)],
                            cwd=repo, capture_output=True, text=True, check=True)
    found: dict[str, list[str]] = {}
    for line in result.stdout.splitlines():
        bench = bench_of(line)
        if bench is not None:
            found.setdefault(bench, []).append(line)
    return {bench: sorted(files) for bench, files in sorted(found.items())}


def unsealed_pool_artifacts(repo: Path, staged: list[str]) -> list[str]:
    """Los artefactos de ítem del pool preparados en un banco sin su ``<n>.closed`` en el índice.

    Una salida del pool entra al banco completa o no entra: el sello se
    escribe el último. Un ``<n>.*`` sin su sello es una publicación que no
    terminó, y commitearlo lo presentaría como evidencia cerrada.
    """
    candidates = []
    for path in staged:
        if bench_of(path) is None:
            continue
        directory, _, name = path.rpartition("/")
        item = item_of_artifact(name)
        if item is not None:
            candidates.append((path, f"{directory}/{item}{CLOSED_SUFFIX}"))
    if not candidates:
        return []
    seals = sorted({seal for _, seal in candidates})
    listed = subprocess.run(["git", "ls-files", "--", *seals], cwd=repo,
                            capture_output=True, text=True, check=True).stdout.splitlines()
    return sorted(path for path, seal in candidates if seal not in set(listed))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("paths", nargs="*")
    args = parser.parse_args(argv)
    try:
        staged = args.paths or subprocess.run(
            ["git", "diff", "--cached", "--name-only"], cwd=args.repo,
            capture_output=True, text=True, check=True).stdout.splitlines()
        benches = touched_benches(args.repo, staged)
        found = untracked_in_benches(args.repo, staged, benches)
        unsealed = unsealed_pool_artifacts(args.repo, staged)
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
    print(f"check_bench_untracked: {sum(map(len, found.values()))} archivo(s) fuera "
          f"(alcance medido: {len(benches)} banco(s) tocado(s))", file=sys.stderr)
    for path in unsealed:
        print(f"check_bench_untracked: {path} es un artefacto del pool sin su {CLOSED_SUFFIX}",
              file=sys.stderr)
    if unsealed:
        print("  remedio: un ítem entra al banco sólo publicado; reconcile completa una "
              "publicación interrumpida", file=sys.stderr)
    return 1 if found or unsealed else 0


if __name__ == "__main__":
    raise SystemExit(main())
