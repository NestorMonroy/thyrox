#!/usr/bin/env python3
"""¿El superproyecto apunta al commit que el submodulo tiene hoy?

``gitlink-bump-gate.md`` nacio de L-004: el agente comitea en un submodulo,
pushea y declara «publicado» sin bumpear el gitlink del padre. Desde el
superproyecto ese commit **no existe**. La leccion se registro, y en el
checkpoint siguiente el defecto se repitio — que es lo que esa misma regla
concluye: *la leccion escrita no previene la reincidencia; solo un gate
ejecutable integrado en el flujo lo hace*.

Esa frase se cita en comentarios de media docena de mecanismos del proveedor.
La regla que la enuncia **no tenia gate**. Este modulo lo es.

Las TRES salidas, y por que no son dos
---------------------------------------

``0`` MATCHES          el gitlink lleva el commit que el submodulo tiene.
``1`` DRIFTED          divergencia — el defecto de L-004, con los dos hashes.
``2`` NO_SUPERPROJECT  no hay nada que verificar, y se dice.

La tercera es la que hace honesto al gate. Hoy el superproyecto esta
**ausente por decision del ejecutor** (2026-08-07): el arbol tiene los cinco
clones hermanos, no el padre. Un guion que saliera 0 en ese caso no
distinguiria «el gitlink coincide» de «no mire ningun gitlink» — el
sub-patron D de ``metrica-decide-la-conclusion.md``, un verde que no puede
fallar. Por eso la ausencia **nunca** se redacta como «publicado».

Qué mide, y qué NO
-------------------

*Métrica:* el hash que ``git ls-tree HEAD <submodulo>`` registra en el padre,
contra el ``HEAD`` del clon del submodulo.

*Ciega a:* si ese ``HEAD`` esta **pusheado**. Un gitlink puede coincidir con un
commit que solo existe en local, y desde el remoto el padre seguiria roto. Esa
mitad la cubre el gate de trabajo sin publicar, no este modulo. Ciega tambien
al submodulo cuyo directorio no esta poblado: sin arbol no hay ``HEAD`` que
comparar, y eso se declara como ausencia, no como coincidencia.

La referencia se declara, y por que importa
--------------------------------------------

Por defecto la referencia es el arbol del submodulo bajo el padre — la
divergencia que ``git status`` ya reporta. Pero en kaupamex el trabajo **no
pasa por ahi**: la regla lista una «Ruta local» por submodulo
(``/home/user/kaupamex-docs`` y sus cuatro hermanos), y es en ese clon donde se
comitea. Si el hermano avanzo y el padre no, el arbol del padre coincide
consigo mismo y el gate publicaria COINCIDE midiendo el sujeto equivocado —
un falso verde, no un fallo del comando. Por eso ``source`` existe: nombra
cual de los dos clones es la referencia.
"""
from __future__ import annotations

import argparse
import dataclasses
import enum
import pathlib
import subprocess
import sys

GITLINK_MODE = "160000"


class Status(enum.Enum):
    """Los tres desenlaces. El tercero es un veredicto, no un fallo."""

    MATCHES = "coincide"
    DRIFTED = "divergencia"
    NO_SUPERPROJECT = "ausente"


@dataclasses.dataclass(frozen=True)
class Verdict:
    """El veredicto sobre un gitlink, con los dos hashes que lo sustentan."""

    status: Status
    submodule: str
    submodule_head: str | None = None
    recorded_head: str | None = None
    reference: str = ""
    reason: str = ""

    @property
    def exit_code(self) -> int:
        return {Status.MATCHES: 0, Status.DRIFTED: 1,
                Status.NO_SUPERPROJECT: 2}[self.status]


def _run(root: pathlib.Path, *args: str) -> str | None:
    """La salida del comando, o ``None`` si git no pudo responder."""
    try:
        done = subprocess.run(["git", *args], cwd=root, capture_output=True,
                              text=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError,
            NotADirectoryError, PermissionError):
        return None
    return done.stdout


def _recorded_head(parent: pathlib.Path, submodule: str) -> str | None:
    """El hash que el padre tiene registrado para ese submodulo.

    Una entrada de submodulo es un objeto de modo ``160000``. Cualquier otro
    modo es un archivo o un directorio corriente: no hay gitlink que mirar.
    """
    listing = _run(parent, "ls-tree", "HEAD", submodule)
    if not listing:
        return None
    fields = listing.split()
    if len(fields) < 3 or fields[0] != GITLINK_MODE:
        return None
    return fields[2]


def inspect(parent: pathlib.Path, submodule: str,
            source: pathlib.Path | None = None) -> Verdict:
    """Compara el gitlink registrado con el ``HEAD`` de su clon de referencia.

    ``source`` nombra ese clon. Sin el, la referencia es el arbol del submodulo
    bajo el padre; con el, el clon hermano donde de verdad se comitea.
    """
    if _run(parent, "rev-parse", "--git-dir") is None:
        return Verdict(Status.NO_SUPERPROJECT, submodule,
                       reason=f"«{parent}» no es un clon de git: "
                              "el superproyecto esta ausente de la sesion")

    recorded = _recorded_head(parent, submodule)
    if recorded is None:
        return Verdict(Status.NO_SUPERPROJECT, submodule,
                       reason=f"el padre no registra un gitlink para "
                              f"«{submodule}»: no hay bump que verificar")

    reference = source if source is not None else parent / submodule
    head = _run(reference, "rev-parse", "HEAD")
    if head is None:
        return Verdict(Status.NO_SUPERPROJECT, submodule,
                       recorded_head=recorded,
                       reason=f"«{reference}» no es un clon poblado: no hay "
                              "HEAD de referencia que comparar")

    head = head.strip()
    status = Status.MATCHES if head == recorded else Status.DRIFTED
    return Verdict(status, submodule, submodule_head=head,
                   recorded_head=recorded, reference=str(reference))


def report(verdict: Verdict) -> str:
    """El texto del veredicto. La ausencia nunca dice «publicado»."""
    if verdict.status is Status.NO_SUPERPROJECT:
        return (f"AUSENTE — {verdict.reason}.\n"
                "  No se declara bumpeado ni pendiente: el estado del gitlink "
                "no se puede medir desde aqui.")
    if verdict.status is Status.MATCHES:
        return (f"COINCIDE — el gitlink de «{verdict.submodule}» lleva "
                f"{verdict.recorded_head}.")
    return (f"DIVERGENCIA — el gitlink de «{verdict.submodule}» esta atrasado.\n"
            f"  la referencia        {verdict.reference}\n"
            f"  el submodulo tiene   {verdict.submodule_head}\n"
            f"  el padre registra    {verdict.recorded_head}\n"
            "  bumpear antes de declarar publicado (L-004).")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("submodule", help="ruta del submodulo dentro del padre")
    parser.add_argument("--root", default=".", help="raiz del superproyecto")
    parser.add_argument("--source", default=None,
                        help="clon de referencia (por defecto, el arbol del "
                             "submodulo bajo el padre)")
    args = parser.parse_args(argv)

    verdict = inspect(pathlib.Path(args.root).resolve(), args.submodule,
                      pathlib.Path(args.source).resolve() if args.source else None)
    print(report(verdict))
    return verdict.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
