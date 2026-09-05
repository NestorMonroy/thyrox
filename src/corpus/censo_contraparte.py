#!/usr/bin/env python3
"""Censo de contraparte — cada addon nuestro contra las raíces de la referencia.

Responde **una** pregunta y no lleva ningún registro del proyecto: ¿qué
contraparte tiene cada addon de nuestro árbol, y con qué llave se estableció?

El catálogo —qué addons hay, qué raíces existen, qué renombres se declararon—
vive **fuera** de este archivo: los addons se derivan del disco y las raíces y
los renombres se leen del archivo de declaración. Es la forma que exige
``calibration-verified-numbers.md``: el mecanismo aquí, el registro en datos y
en ``source/**``.

Tipos de contraparte que emite:

``identidad``    el mismo nombre existe en alguna raíz declarada
``renombre``     la declaración mapea nuestro nombre a otro de la referencia
``funcional``    no hay homónimo; la declaración nombra la contraparte con
                 forma divergente y la raíz donde vive
``sin-homonimo`` declarado con ``-``: ninguna llave medida ve contraparte
``SIN-DECLARAR`` ni homónimo ni fila — el hueco que este censo existe para ver

Salida en TSV por línea, más un resumen. ``--strict`` sale 1 si hay
``SIN-DECLARAR``.
"""
from __future__ import annotations

import argparse
import pathlib
import sys

DECLARACION = pathlib.Path(__file__).with_name("addon-alias.txt")


def parse_declaracion(ruta: pathlib.Path) -> tuple[dict, dict, list]:
    """Devuelve (raices, filas, ignoradas) desde el archivo de declaración.

    ``raices``   alias -> ruta relativa al repositorio de referencia
    ``filas``    nombre nuestro -> (tipo, alias_raiz|None, nombre en la referencia)
    ``ignoradas`` filas de nivel MODELO (columna derecha con punto), que este
                 censo no consume: su unidad es el addon, no el modelo.
    """
    raices: dict[str, str] = {}
    filas: dict[str, tuple[str, str | None, str]] = {}
    ignoradas: list[str] = []

    for cruda in ruta.read_text(encoding="utf-8").splitlines():
        linea = cruda.split("#")[0].strip()
        if not linea:
            continue
        campos = linea.split()

        if campos[0].startswith("raiz:"):
            if len(campos) < 2:
                continue
            raices[campos[0][len("raiz:"):]] = campos[1]
            continue

        if len(campos) < 2:
            continue
        izquierda, nuestro = campos[0], campos[1]

        if "." in nuestro:          # fila de MODELO, otra unidad
            ignoradas.append(linea)
            continue

        if izquierda == "-":
            filas[nuestro] = ("sin-homonimo", None, "-")
        elif izquierda.startswith("funcional:"):
            resto = izquierda[len("funcional:"):]
            alias, _, ref = resto.rpartition(":")
            filas[nuestro] = ("funcional", alias or None, ref)
        elif ":" in izquierda:
            alias, _, ref = izquierda.rpartition(":")
            filas[nuestro] = ("renombre", alias, ref)
        else:
            filas[nuestro] = ("renombre", None, izquierda)

    return raices, filas, ignoradas


def addons_de(raiz: pathlib.Path) -> set[str]:
    """Directorios con ``__manifest__.py`` — la única definición de addon."""
    if not raiz.is_dir():
        return set()
    return {
        d.name
        for d in raiz.iterdir()
        if d.is_dir() and (d / "__manifest__.py").exists()
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--nuestro", default="/home/user/kaupamex-api",
                    help="repositorio propio cuyo árbol de addons se censa")
    ap.add_argument("--referencia", default="/home/user/odoo-tools",
                    help="repositorio de referencia (sólo lectura)")
    ap.add_argument("--declaracion", default=str(DECLARACION))
    ap.add_argument("--quiet", action="store_true", help="sólo el resumen")
    ap.add_argument("--strict", action="store_true",
                    help="exit 1 si algún addon queda SIN-DECLARAR")
    args = ap.parse_args()

    nuestro_repo = pathlib.Path(args.nuestro)
    ref_repo = pathlib.Path(args.referencia)
    raices, filas, ignoradas = parse_declaracion(pathlib.Path(args.declaracion))

    if not raices:
        print("ERROR: la declaración no trae ninguna fila 'raiz:'", file=sys.stderr)
        return 2

    # Población de cada raíz declarada. Una raíz que no resuelve se reporta:
    # su silencio no puede leerse como ausencia de contraparte.
    poblacion: dict[str, set[str]] = {}
    sin_resolver: list[str] = []
    for alias, rel in sorted(raices.items()):
        nombres = addons_de(ref_repo / rel)
        if not nombres:
            sin_resolver.append(f"{alias} -> {rel}")
        poblacion[alias] = nombres

    nuestros = sorted(
        {d.name
         for base in ("addons", "src/addons")
         for d in (nuestro_repo / base).iterdir()
         if d.is_dir() and (d / "__manifest__.py").exists()}
    )

    conteo: dict[str, int] = {}
    sin_declarar: list[str] = []
    for nombre in nuestros:
        tipo, alias, ref = filas.get(nombre, (None, None, nombre))

        if tipo is None:
            donde = [a for a, ns in poblacion.items() if nombre in ns]
            if donde:
                tipo, ref = "identidad", nombre
            else:
                tipo, ref = "SIN-DECLARAR", "—"
                sin_declarar.append(nombre)
                donde = []
        elif tipo == "sin-homonimo":
            donde = []
        else:
            candidatas = [alias] if alias else list(poblacion)
            donde = [a for a in candidatas if ref in poblacion.get(a, ())]
            if not donde:
                tipo = f"{tipo}-NO-RESUELVE"

        conteo[tipo] = conteo.get(tipo, 0) + 1
        if not args.quiet:
            print(f"{nombre}\t{tipo}\t{ref}\t{','.join(donde) or '—'}")

    print(f"\n-- censo de contraparte: {len(nuestros)} addons propios "
          f"contra {len(poblacion)} raíces declaradas")
    for tipo, n in sorted(conteo.items()):
        print(f"   {tipo:24} {n}")
    if ignoradas:
        print(f"   (filas de nivel MODELO ignoradas: {len(ignoradas)})")
    for r in sin_resolver:
        print(f"   AVISO: raíz declarada sin addons: {r}")
    if sin_declarar:
        print(f"   SIN-DECLARAR: {' '.join(sin_declarar)}")

    return 1 if (args.strict and sin_declarar) else 0


if __name__ == "__main__":
    sys.exit(main())
