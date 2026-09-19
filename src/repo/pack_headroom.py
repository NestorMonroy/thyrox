#!/usr/bin/env python3
"""¿Cabe un ``git gc``, o solo cabe empaquetar lo suelto?

El episodio que lo origina: dos ``git gc`` lanzados y muertos por disco, uno
en cada arbol, sin que nadie midiera antes si cabian.

La diferencia no es de grado, es de sujeto
-------------------------------------------

``git gc`` es ``git repack -a -d``, y el ``-a`` reescribe **todos** los objetos
a un paquete nuevo **antes** de borrar el viejo: durante la operacion conviven
los dos, asi que su pico escala con el repo entero.

``git repack -d`` sin ``-a`` empaqueta **solo lo suelto** y deja los paquetes
existentes donde estan: su pico escala con lo que hay suelto, que suele ser dos
ordenes de magnitud menos. En un repo cuyo crecimiento son versiones nuevas de
un archivo que cambia cada sesion, es exactamente el trabajo que hace falta —
un objeto suelto no lleva delta **por construccion**.

Las salidas son cuatro, y por que
----------------------------------

``0`` FULL_REPACK      cabe el completo: ``git gc``.
``1`` INCREMENTAL_ONLY no cabe el completo, si lo suelto: ``git repack -d``.
``3`` INSUFFICIENT     no cabe ninguno: liberar disco antes de lanzar nada.
``2`` rehusa           no es un clon; se declara y no se emite cifra.

Un guion de dos salidas —«cabe / no cabe»— no separa la primera de la segunda,
que es justo la decision que hacia falta tomar. Un verde que no discrimina es
el sub-patron D de ``metrica-decide-la-conclusion.md``.

**El codigo de salida es un veredicto, no un error.** Un ``1`` aqui significa
«cabe el incremental», no «fallo algo»: bajo ``set -e`` aborta la cadena que lo
invoque. Quien lo llame desde un guion compara el codigo explicitamente en vez
de dejar que el shell lo interprete.

*Métrica:* ``git count-objects -v`` (sueltos y su peso, paquetes y el suyo) y el
disco libre del sistema de archivos donde vive el clon.

*Ciega a:* cuanto **recuperaria** cada operacion — eso solo se sabe
ejecutandola; a los otros escritores del mismo sistema de archivos, que pueden
consumir el margen mientras el repack corre; y al hecho de que el paquete nuevo
suele salir **menor** que la suma vieja, asi que el pico del completo es una
cota superior, no la ocupacion real.
"""
from __future__ import annotations

import argparse
import dataclasses
import enum
import pathlib
import shutil
import subprocess
import sys

import clone

REFUSAL = 2

#: El pico calculado es una cota; el sistema de archivos tiene otros
#: escritores y git necesita sitio para su indice temporal. Se declara como
#: constante para que el control pueda ejercerla: el caso que cabe SIN margen
#: y no cabe CON el es el unico que la mide.
SAFETY_MARGIN = 1.15


class Advice(enum.Enum):
    """Que operacion cabe. El nombre dice la decision, no el comando."""

    FULL_REPACK = "repack completo"
    INCREMENTAL_ONLY = "solo lo suelto"
    INSUFFICIENT = "no cabe ninguno"

    @property
    def exit_code(self) -> int:
        return {Advice.FULL_REPACK: 0, Advice.INCREMENTAL_ONLY: 1,
                Advice.INSUFFICIENT: 3}[self]

    @property
    def command(self) -> str:
        return {
            Advice.FULL_REPACK: "git gc  (= git repack -a -d)",
            Advice.INCREMENTAL_ONLY: "git repack -d  (SIN -a: no reescribe los paquetes)",
            Advice.INSUFFICIENT: "ninguno — liberar disco antes; ni «git repack -d» cabe",
        }[self]


@dataclasses.dataclass(frozen=True)
class Headroom:
    """Lo que ocupa el object store y lo que queda libre para maniobrar."""

    loose_objects: int
    loose_bytes: int
    packed_objects: int
    pack_bytes: int
    free_bytes: int

    @property
    def full_peak(self) -> int:
        """El ``-a`` reescribe todo antes de borrar: conviven los dos."""
        return self.pack_bytes + self.loose_bytes

    @property
    def loose_peak(self) -> int:
        """Sin ``-a`` solo se escribe un paquete con lo suelto."""
        return self.loose_bytes


def decide(headroom: Headroom, margin: float = SAFETY_MARGIN) -> Advice:
    """Que operacion cabe en el disco libre, con el margen declarado."""
    if headroom.free_bytes >= headroom.full_peak * margin:
        return Advice.FULL_REPACK
    if headroom.free_bytes >= headroom.loose_peak * margin:
        return Advice.INCREMENTAL_ONLY
    return Advice.INSUFFICIENT


def measure(root: pathlib.Path) -> Headroom:
    """Los dos operandos del cociente, medidos en el mismo pase.

    ``count-objects -v`` publica los tamaños en KiB; el disco libre sale de
    ``statvfs`` sobre el propio clon, no de una constante escrita a mano.
    """
    done = subprocess.run(["git", "count-objects", "-v"], cwd=root,
                          capture_output=True, text=True, check=True)
    stats = {}
    for line in done.stdout.splitlines():
        key, _, value = line.partition(":")
        stats[key.strip()] = int(value.strip() or 0)
    return Headroom(
        loose_objects=stats.get("count", 0),
        loose_bytes=stats.get("size", 0) * 1024,
        packed_objects=stats.get("in-pack", 0),
        pack_bytes=stats.get("size-pack", 0) * 1024,
        free_bytes=shutil.disk_usage(root).free,
    )


def _mib(value: float) -> str:
    return f"{value / 1048576:.2f} MiB"


def report(headroom: Headroom, advice: Advice,
           margin: float = SAFETY_MARGIN) -> str:
    def _fits(peak: int) -> str:
        # El margen se aplica AQUI, en la comparacion — no al disco libre. La
        # version anterior colgaba «(margen aplicado ×1.15)» de la linea del
        # disco libre, y quien la leyera creeria que esa cifra ya venia
        # descontada. La forma que no se puede malleer es mostrar la
        # comparacion entera: el operando, el factor y el resultado.
        required = peak * margin
        return (f"{_mib(peak)} × {margin} = {_mib(required)}"
                f"   → {'cabe' if headroom.free_bytes >= required else 'NO cabe'}")

    return "\n".join([
        f"objetos sueltos   {headroom.loose_objects}"
        f"   ({_mib(headroom.loose_bytes)})",
        f"empaquetados      {headroom.packed_objects}"
        f"   ({_mib(headroom.pack_bytes)})",
        f"disco libre       {_mib(headroom.free_bytes)}   (crudo, sin margen)",
        f"pico completo     {_fits(headroom.full_peak)}",
        f"pico incremental  {_fits(headroom.loose_peak)}",
        f"VEREDICTO         {advice.value}",
        f"  lanzar: {advice.command}",
    ])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".", help="raiz del clon")
    parser.add_argument("--margin", type=float, default=SAFETY_MARGIN,
                        help="margen sobre el pico calculado")
    args = parser.parse_args(argv)

    root = pathlib.Path(args.root).resolve()
    if not clone.is_clone(root):
        # Rehusa sin cifra: un cero aqui se leeria como «no hay nada que
        # empaquetar», que es otra afirmacion.
        print(f"ERROR — «{root}» no es un clon de git; no se emite medicion.",
              file=sys.stderr)
        return REFUSAL

    headroom = measure(root)
    advice = decide(headroom, args.margin)
    print(report(headroom, advice, args.margin))
    return advice.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
