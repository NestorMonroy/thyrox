#!/usr/bin/env python3
"""Archiva las builds viejas del corpus y deja en crudo solo las ultimas N.

`_references/claude-code-bin/` gana una build por extraccion y no pierde
ninguna. Medido al abrir TASK-THYROX-0160: 737 MB sobre un disco con 2.2 GB
libres (95 % ocupado) — la misma condicion que ya mato un `git gc`
(TASK-THYROX-0046). El corpus no se puede retirar: es el material contra el que
se construye. Lo que si se puede es dejar de tenerlo desplegado entero.

Por que `.7z` SOLIDO, y no lo que parece obvio
----------------------------------------------
La pregunta que lo origina fue «un .7z por archivo, o cual es mejor?». Medido
sobre el `bunfs-root` de 2.1.274 (1800 archivos), que es el caso real:

    tar.xz -9e solido     11 434 984 B   3.59x   20 s
    7z -t7z -mx9 solido   11 404 233 B   3.60x   10 s
    7z por archivo        14 992 823 B   2.74x    6 s

**Por archivo pierde 31 %.** El eje que decide no es el contenedor —`.7z` y
`tar.xz` comparten LZMA2— sino si el archivado es SOLIDO: un contenedor por
archivo arranca su diccionario de cero, asi que la redundancia entre los 1800
chunks del mismo minificador no se aprovecha. Entre las dos formas solidas,
`.7z` empata en tamano y tarda la mitad.

El primer control que se corrio para esto NO discriminaba: se midio sobre
2.1.251, que tiene DOS archivos, y las tres formas dieron lo mismo. Con dos
archivos la redundancia entre archivos no existe. Esta anotado porque es la
forma de `metrica-decide-la-conclusion.md` que mas barato sale de cometer.

Que hace, y que NO hace
-----------------------
Archiva y verifica. **No retira el crudo por su cuenta**: eso lo decide el
llamador con `--apply`, y lo hace con `git rm` cuando el contenido esta
versionado — nunca con `rm -rf` sobre algo que git rastrea.

El coste que el llamador debe conocer: el `.7z` se versiona, asi que ANADE a la
historia lo que ocupa. Git ya empaqueta el corpus crudo (medido: 175 MB de
`.git` para 737 MB de arbol), asi que la alternativa «`git rm` y recuperar con
`git show <sha>:<ruta>`» cuesta cero bytes nuevos. Se archiva igual porque un
contenedor efimero pierde lo que no esta en el arbol, y el MANIFEST anota el
`HEAD` donde el crudo existio por ultima vez — con eso el crudo se recupera por
cualquiera de las dos vias.
"""
from __future__ import annotations

import argparse
import hashlib
import pathlib
import shutil
import subprocess
import sys
from dataclasses import dataclass, field

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from corpus.list_corpus_builds import (  # noqa: E402
    BuildEntry, DEFAULT_ROOT_RELATIVE, human_size, scan_root, version_sort_key,
)
from paths.reach import thyrox_root  # noqa: E402

#: El subdirectorio donde aterrizan los archivos. Vive DENTRO del corpus, no
#: fuera: es el mismo material, sólo que plegado.
ARCHIVE_DIR_NAME = "_archived"

#: El indice del archivo. Lleva el `HEAD` donde el crudo existio por ultima
#: vez, que es lo que hace recuperable el crudo por la via de git ademas de
#: por la del `.7z`.
MANIFEST_NAME = "MANIFEST.tsv"
MANIFEST_HEADER = "build\traw_bytes\tarchive_bytes\tratio\tsha256\thead\n"

#: Cuantas builds se conservan desplegadas si nadie dice otra cosa.
DEFAULT_KEEP = 3


class SevenZipMissing(RuntimeError):
    """No hay `7z` con que archivar.

    Existe como clase propia para que el llamador pueda distinguir «no habia
    nada que archivar» de «no pude archivar». Devolver un plan vacio ante un
    `7z` ausente colapsaria los dos, y ese cero se leeria como exito.
    """


@dataclass(frozen=True)
class ArchivePlan:
    """El reparto: que se queda desplegado y que se pliega."""

    kept: list[BuildEntry] = field(default_factory=list)
    to_archive: list[BuildEntry] = field(default_factory=list)


@dataclass(frozen=True)
class ArchiveResult:
    """Lo que quedo tras archivar una build, con su prueba de integridad."""

    build_name: str
    archive_path: pathlib.Path
    raw_bytes: int
    archive_bytes: int
    sha256: str
    verified: bool

    @property
    def ratio(self) -> float:
        """Cuantas veces cabe el crudo en el archivo. 0 si no hubo archivo."""
        return (self.raw_bytes / self.archive_bytes) if self.archive_bytes else 0.0


def select_for_archive(root: pathlib.Path, keep: int = DEFAULT_KEEP) -> ArchivePlan:
    """Reparte las builds de `root` entre las que quedan y las que se pliegan.

    El corte es por VERSION BASE, no por directorio: una variante
    (`2.1.246-nombrado`) es una vista derivada de su version, el mismo criterio
    que `list_corpus_builds` ya declara. Asi que no consume uno de los N huecos
    y sigue la suerte de su base — si la base se archiva, la variante tambien,
    bajo su nombre literal.
    """
    entries = scan_root(root)
    versions = sorted({e.version for e in entries}, key=version_sort_key)
    surviving = set(versions[-keep:]) if keep > 0 else set()
    kept = [e for e in entries if e.version in surviving]
    to_archive = [e for e in entries if e.version not in surviving]
    return ArchivePlan(kept=kept, to_archive=to_archive)


def verify_archive(archive_path: pathlib.Path) -> bool:
    """`7z t` sobre el archivo: ¿sigue siendo legible lo que se escribio?

    Es el control que separa «archive» de «archive y puedo recuperarlo». Sin
    el, retirar el crudo apostaria a que el archivo sirve, y esa apuesta solo
    se descubre perdida cuando alguien lo necesita.
    """
    if shutil.which("7z") is None:
        raise SevenZipMissing("falta `7z`: no se puede verificar el archivo")
    completed = subprocess.run(
        ["7z", "t", str(archive_path)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    return completed.returncode == 0


def file_sha256(path: pathlib.Path) -> str:
    """El sha256 del archivo, leido por bloques.

    Por bloques y no de una: un `.7z` de una build grande no tiene por que
    caber en memoria, y leerlo entero para calcular un hash seria pagar dos
    veces el tamano que este guion existe para reducir.
    """
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def archive_build(build_dir: pathlib.Path,
                  destination: pathlib.Path) -> ArchiveResult:
    """Pliega una build a `<destination>/<nombre>.7z` y verifica el resultado.

    El `7z` se invoca con el cwd en el PADRE y el nombre relativo: asi el
    archivo guarda `<nombre>/...` y al desplegarlo reaparece donde estaba. Con
    una ruta absoluta guardaria el arbol entero desde la raiz, y el despliegue
    aterrizaria en otro sitio.
    """
    if shutil.which("7z") is None:
        raise SevenZipMissing("falta `7z`: no se puede archivar")
    destination.mkdir(parents=True, exist_ok=True)
    archive_path = destination / f"{build_dir.name}.7z"
    raw_bytes = sum(p.stat().st_size for p in build_dir.rglob("*") if p.is_file())

    # Idempotencia: un archivo que ya existe y verifica no se rehace. Rehacerlo
    # gastaria el tiempo de compresion y produciria otro sha256 por el instante
    # que 7z guarda, y el MANIFEST quedaria citando un hash que ya no es.
    if archive_path.exists() and verify_archive(archive_path):
        return ArchiveResult(
            build_name=build_dir.name, archive_path=archive_path,
            raw_bytes=raw_bytes, archive_bytes=archive_path.stat().st_size,
            sha256=file_sha256(archive_path), verified=True)

    archive_path.unlink(missing_ok=True)
    completed = subprocess.run(
        ["7z", "a", "-t7z", "-mx=9", str(archive_path.resolve()), build_dir.name],
        cwd=str(build_dir.parent),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    if completed.returncode != 0 or not archive_path.exists():
        return ArchiveResult(
            build_name=build_dir.name, archive_path=archive_path,
            raw_bytes=raw_bytes, archive_bytes=0, sha256="", verified=False)

    return ArchiveResult(
        build_name=build_dir.name, archive_path=archive_path,
        raw_bytes=raw_bytes, archive_bytes=archive_path.stat().st_size,
        sha256=file_sha256(archive_path), verified=verify_archive(archive_path))


def current_head(repository: pathlib.Path) -> str:
    """El `HEAD` del repo, o `(sin git)`. Es la otra via de recuperacion."""
    completed = subprocess.run(
        ["git", "-C", str(repository), "rev-parse", "HEAD"],
        capture_output=True, text=True, check=False)
    return completed.stdout.strip() if completed.returncode == 0 else "(sin git)"


def is_tracked(repository: pathlib.Path, path: pathlib.Path) -> bool:
    """¿git rastrea esta ruta? Decide si el crudo se retira con `git rm`.

    Un `rm -rf` sobre contenido versionado deja el indice creyendo que sigue
    ahi; un `git rm` lo retira de las dos. La pregunta se hace, no se supone.
    """
    completed = subprocess.run(
        ["git", "-C", str(repository), "ls-files", "--error-unmatch", str(path)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    return completed.returncode == 0


def remove_raw(repository: pathlib.Path, build_dir: pathlib.Path) -> str:
    """Retira el crudo por la via que corresponda a como git lo ve."""
    if is_tracked(repository, build_dir):
        subprocess.run(["git", "-C", str(repository), "rm", "-r", "-q",
                        str(build_dir)], check=True)
        return "git rm"
    shutil.rmtree(build_dir)
    return "rmtree"


def write_manifest(destination: pathlib.Path, results: list[ArchiveResult],
                   head: str) -> pathlib.Path:
    """Escribe (o amplia) el indice del archivo, ordenado y sin duplicar.

    Se relee lo que ya hubiera: una corrida posterior amplia el indice en vez
    de reemplazarlo, que es lo que hace idempotente al conjunto y no solo a
    cada archivo por separado.
    """
    manifest_path = destination / MANIFEST_NAME
    rows: dict[str, str] = {}
    if manifest_path.exists():
        for line in manifest_path.read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("build\t"):
                rows[line.split("\t", 1)[0]] = line
    for result in results:
        rows[result.build_name] = "\t".join([
            result.build_name, str(result.raw_bytes), str(result.archive_bytes),
            f"{result.ratio:.2f}", result.sha256, head])
    manifest_path.write_text(
        MANIFEST_HEADER + "\n".join(rows[k] for k in sorted(rows)) + "\n",
        encoding="utf-8")
    return manifest_path


def main(argv: "list[str] | None" = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=pathlib.Path, default=None,
                        help="raiz del corpus (default: la de thyrox)")
    parser.add_argument("--keep", type=int, default=DEFAULT_KEEP,
                        help=f"builds que quedan desplegadas (default {DEFAULT_KEEP})")
    parser.add_argument("--apply", action="store_true",
                        help="archiva de verdad; sin esto solo se reporta")
    args = parser.parse_args(argv)

    root = args.root or (thyrox_root() / DEFAULT_ROOT_RELATIVE)
    if not root.is_dir():
        print(f"archive_build_corpus: no hay corpus en {root}", file=sys.stderr)
        return 2
    if args.keep < 1:
        print("archive_build_corpus: --keep tiene que ser >= 1; con 0 se "
              "archivaria todo y el corpus dejaria de estar desplegado.",
              file=sys.stderr)
        return 2

    plan = select_for_archive(root, keep=args.keep)
    print(f"corpus   {root}")
    print(f"quedan   {len(plan.kept)}: {', '.join(e.name for e in plan.kept)}")
    print(f"archivar {len(plan.to_archive)}: "
          f"{', '.join(e.name for e in plan.to_archive) or '(ninguna)'}")
    freed = sum(e.size_bytes for e in plan.to_archive)
    print(f"crudo a plegar  {human_size(freed)}")

    if not plan.to_archive:
        print("nada que hacer (idempotente)")
        return 0
    if not args.apply:
        print("\n(simulacion — nada se toco. Con `--apply` se archiva y se "
              "retira el crudo.)")
        return 0
    if shutil.which("7z") is None:
        print("archive_build_corpus: falta `7z`. NO se emite un conteo de "
              "bytes liberados: un 0 ahi no distinguiria «nada que archivar» "
              "de «no pude archivar».", file=sys.stderr)
        return 2

    repository = thyrox_root()
    head = current_head(repository)
    destination = root / ARCHIVE_DIR_NAME
    results: list[ArchiveResult] = []
    for entry in plan.to_archive:
        build_dir = root / entry.name
        result = archive_build(build_dir, destination)
        if not result.verified:
            print(f"  FALLO  {entry.name}: el archivo no verifica — el crudo "
                  f"NO se retira", file=sys.stderr)
            return 1
        results.append(result)
        how = remove_raw(repository, build_dir)
        print(f"  ok     {entry.name}  {human_size(result.raw_bytes)} -> "
              f"{human_size(result.archive_bytes)}  ({result.ratio:.2f}x, {how})")

    manifest_path = write_manifest(destination, results, head)
    subprocess.run(["git", "-C", str(repository), "add", "-N",
                    str(destination)], check=False)
    print(f"\nindice   {manifest_path}")
    print(f"head     {head}  (donde el crudo existio por ultima vez)")
    print("El `.7z` y el indice quedan en el indice de git SIN commitear: "
          "el commit por pathspec lo hace quien invoca.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
