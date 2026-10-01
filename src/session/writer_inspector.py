"""Quién tiene abierta una ruta en escritura — leído de ``/proc``.

Por qué existe
--------------
Un ítem de un pool no ha terminado porque su proceso principal salió: un hijo
en segundo plano puede seguir escribiendo en la salida del ítem segundos
después del veredicto (H-THYROX-257). Antes de dar un ítem por cerrado, o de
dejar que ``git`` vea un archivo, hay que poder responder «¿hay un proceso vivo
con esta ruta abierta en escritura?», y esa respuesta sólo está en el kernel.

Cómo mide
---------
Recorre ``/proc/<pid>/fd``: cada entrada es un enlace a lo que el descriptor
tiene abierto. Para las que apuntan a la ruta pedida —o a algo bajo ella, si es
un directorio— lee ``/proc/<pid>/fdinfo/<fd>``, cuya línea ``flags:`` trae en
octal los indicadores de ``open(2)``. El modo de acceso son sus dos bits bajos
(``O_ACCMODE``): ``O_WRONLY`` (1) u ``O_RDWR`` (2) es un escritor; ``O_RDONLY``
(0) no lo es.

Un archivo borrado mientras sigue abierto aparece como ``<ruta> (deleted)``, y
cuenta igual: el proceso sigue escribiendo en él.

Tres respuestas, no dos
-----------------------
``WriterScan.writers`` lista los escritores encontrados. ``unreadable_pids``
lista los procesos cuyo descriptor apunta a la ruta pero cuyo ``fdinfo`` no se
pudo leer: de ellos no se sabe el modo. ``assert_no_live_writers`` rehúsa en
los dos casos, con errores distintos, porque «no vi escritores» sólo prueba la
ausencia si se pudo mirar todo.

*Ciega a:* un proceso de otro espacio de nombres de PID que no aparezca en este
``/proc``, y un escritor que abre, escribe y cierra entre dos lecturas: el
recorrido es una foto, no una vigilancia.
"""
from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

#: Máscara del modo de acceso en los indicadores de ``open(2)``.
ACCESS_MODE_MASK = 0o3
#: Modos que permiten escribir: ``O_WRONLY`` y ``O_RDWR``.
WRITE_ACCESS_MODES = frozenset({0o1, 0o2})
#: Sufijo con que el kernel marca el destino de un archivo ya borrado.
DELETED_SUFFIX = " (deleted)"


@dataclass(frozen=True)
class OpenWriter:
    pid: int
    fd: int
    path: str


@dataclass
class WriterScan:
    writers: list[OpenWriter] = field(default_factory=list)
    unreadable_pids: list[int] = field(default_factory=list)


class LiveWriterError(RuntimeError):
    """Un proceso vivo tiene abierta en escritura una de las rutas pedidas."""


class UnprovableAbsenceError(RuntimeError):
    """No se pudo leer el modo de algún descriptor que apunta a las rutas."""


def _covers(target: str, opened: str) -> bool:
    return opened == target or opened.startswith(target.rstrip("/") + "/")


def _access_mode(fdinfo: Path) -> int | None:
    try:
        for line in fdinfo.read_text().splitlines():
            if line.startswith("flags:"):
                return int(line.split()[1], 8) & ACCESS_MODE_MASK
    except OSError:
        return None
    return None


def find_open_writers(
    targets: Iterable[str | os.PathLike[str]],
    *,
    proc_root: str | os.PathLike[str] = "/proc",
    access_mode_filter: bool = True,
) -> WriterScan:
    """Los procesos que tienen abierta en escritura alguna de ``targets``.

    ``access_mode_filter=False`` cuenta toda apertura como escritura; existe
    sólo como control de anulación de las pruebas.
    """
    wanted = [os.path.realpath(t) for t in targets]
    scan = WriterScan()
    proc = Path(proc_root)
    unreadable: set[int] = set()
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        try:
            descriptors = list((entry / "fd").iterdir())
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                opened = os.readlink(descriptor)
            except OSError:
                continue
            opened = opened.removesuffix(DELETED_SUFFIX)
            if not any(_covers(target, opened) for target in wanted):
                continue
            mode = _access_mode(entry / "fdinfo" / descriptor.name)
            if mode is None:
                unreadable.add(pid)
            elif not access_mode_filter or mode in WRITE_ACCESS_MODES:
                scan.writers.append(OpenWriter(pid, int(descriptor.name), opened))
    scan.unreadable_pids = sorted(unreadable)
    return scan


def has_live_writer(targets: Iterable[str | os.PathLike[str]], **scan_options) -> bool:
    return bool(find_open_writers(targets, **scan_options).writers)


def assert_no_live_writers(targets: Iterable[str | os.PathLike[str]], **scan_options) -> None:
    scan = find_open_writers(targets, **scan_options)
    if scan.writers:
        described = ", ".join(f"pid {w.pid} fd {w.fd} -> {w.path}" for w in scan.writers)
        raise LiveWriterError(f"escritores vivos: {described}")
    if scan.unreadable_pids:
        raise UnprovableAbsenceError(
            "no se pudo leer el modo de los descriptores de: "
            + ", ".join(str(pid) for pid in scan.unreadable_pids)
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Lista los procesos vivos que tienen abierta en escritura alguna ruta. "
        "Sale 0 sin escritores, 1 si hay alguno y 2 si la ausencia no se pudo demostrar."
    )
    parser.add_argument("paths", nargs="+", help="archivos o directorios (un directorio cubre lo de dentro)")
    arguments = parser.parse_args(argv)
    scan = find_open_writers(arguments.paths)
    for writer in scan.writers:
        print(f"escritor\t{writer.pid}\t{writer.fd}\t{writer.path}")
    for pid in scan.unreadable_pids:
        print(f"ilegible\t{pid}", file=sys.stderr)
    if scan.writers:
        return 1
    return 2 if scan.unreadable_pids else 0


if __name__ == "__main__":
    sys.exit(main())
