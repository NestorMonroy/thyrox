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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from paths.reach import (  # noqa: E402
    ENV_FILE_VAR, EXTRA_ROOTS_VARS, env_value, reach, root,
)

# --- El hogar de la declaración: un PARÁMETRO del consumidor (DEC-04) -------
#
# Qué addons tiene el árbol de la referencia, y con qué llave se emparejan con
# los nuestros, es dato DEL CONSUMIDOR: thyrox no sabe qué addons hospeda un
# kaupamex-* ni dónde guarda su declaración. La versión anterior la componía
# como archivo hermano de este módulo (`__file__.with_name`), y al mudar el
# censo a thyrox el archivo se quedó atrás: el censo moría con
# `FileNotFoundError` sobre una ruta que nunca existió aquí.
#
# LAS DOS ENTRADAS, con el nombre de cada una — no son la misma cosa mirada dos
# veces, son dos VÍAS de declaración de un dato único:
#
#     COUNTERPART_DECLARATION_VAR       <- el VALOR: la ruta del archivo
#     COUNTERPART_DECLARATION_FILE_VAR  <- la RUTA DEL ARCHIVO que la declara
#
# `env_value` las consulta en ese orden: el proceso primero, porque quien
# exporta para UNA invocación corrige a propósito lo que el archivo dice para
# todas.
#
# NO hay default, y es la divergencia deliberada con `agents_dir`/`skills_dir`:
# aquéllos resuelven artefactos DE thyrox, sobre cuyo árbol sí decide. Un
# default aquí decidiría por el consumidor dónde vive su declaración, que es
# exactamente la decisión que la directiva retira al emisor.
COUNTERPART_DECLARATION_VAR = "THYROX_COUNTERPART_DECLARATION"
COUNTERPART_DECLARATION_FILE_VAR = ENV_FILE_VAR


class DeclarationHomeError(Exception):
    """Se rehúsa cuando el consumidor no declaró dónde vive su declaración."""


def declaration_path(start: pathlib.Path | None = None) -> pathlib.Path:
    """La declaración declarada, o rehusar.

    NO se verifica que el archivo exista: una declaración declarada y ausente
    es un hecho del consumidor que su llamador tiene que poder ver. Crearla o
    silenciarla aquí escondería la divergencia que este mecanismo expone.
    """
    declared = env_value(COUNTERPART_DECLARATION_VAR, start)
    if declared:
        return pathlib.Path(declared)
    raise DeclarationHomeError(
        f"La declaración de contraparte no está declarada. Es una decisión del "
        f"consumidor, no de thyrox: declara {COUNTERPART_DECLARATION_VAR} en el "
        f"proceso, o en el archivo que nombra {COUNTERPART_DECLARATION_FILE_VAR} "
        f"(por defecto el .env del árbol). NO se emite una ruta por defecto: "
        f"inventarla decidiría por ti qué addons se censan."
    )


def parse_declaration(ruta: pathlib.Path) -> tuple[dict, dict, list]:
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
        line = cruda.split("#")[0].strip()
        if not line:
            continue
        fields = line.split()

        if fields[0].startswith("raiz:"):
            if len(fields) < 2:
                continue
            raices[fields[0][len("raiz:"):]] = fields[1]
            continue

        if len(fields) < 2:
            continue
        izquierda, nuestro = fields[0], fields[1]

        if "." in nuestro:          # fila de MODELO, otra unidad
            ignoradas.append(line)
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


def addons_of(raiz: pathlib.Path) -> set[str]:
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
    # Las tres rutas se RESUELVEN, no se codifican: `root()` las pide al
    # mecanismo de alcance, que sobrevive a que el árbol cambie de sitio.
    ap.add_argument("--nuestro", default=None,
                    help="repositorio propio cuyo árbol de addons se censa")
    ap.add_argument("--referencia", default=None,
                    help="repositorio de referencia (sólo lectura)")
    ap.add_argument("--declaracion", default=None)
    ap.add_argument("--quiet", action="store_true", help="sólo el resumen")
    ap.add_argument("--strict", action="store_true",
                    help="exit 1 si algún addon queda SIN-DECLARAR")
    args = ap.parse_args()

    try:
        nuestro_repo = (pathlib.Path(args.nuestro) if args.nuestro
                        else root("api"))
        # La referencia NO es un clon declarado del árbol: entra por el tramo
        # extensible del alcance, igual que en el ejecutable. Si no está, se
        # rehúsa nombrando la variable — un censo sin referencia mediría
        # «ninguna contraparte» y ese cero se leería como ausencia real.
        if args.referencia:
            ref_repo = pathlib.Path(args.referencia)
        else:
            alcanzables = reach()
            if "odoo-tools" not in alcanzables:
                raise DeclarationHomeError(
                    f"la referencia 'odoo-tools' no está en el alcance. "
                    f"Declárala en {EXTRA_ROOTS_VARS[0]} con su ruta absoluta, "
                    f"o pásala con --referencia. NO se compone una ruta por "
                    f"defecto: un censo contra una raíz vacía publica «sin "
                    f"contraparte» y parece sano."
                )
            ref_repo = alcanzables["odoo-tools"]
        decl = (pathlib.Path(args.declaracion) if args.declaracion
                else declaration_path())
    except (DeclarationHomeError, KeyError) as err:
        # 2, no 1: «no emití veredicto» y no «encontré un defecto». Un 0 aquí
        # se leería como «ningún addon SIN-DECLARAR», que es el verde falso.
        print(f"ERROR: {err}", file=sys.stderr)
        return 2
    raices, filas, ignoradas = parse_declaration(decl)

    if not raices:
        print("ERROR: la declaración no trae ninguna fila 'raiz:'", file=sys.stderr)
        return 2

    # Población de cada raíz declarada. Una raíz que no resuelve se reporta:
    # su silencio no puede leerse como ausencia de contraparte.
    population: dict[str, set[str]] = {}
    sin_resolver: list[str] = []
    for alias, rel in sorted(raices.items()):
        nombres = addons_of(ref_repo / rel)
        if not nombres:
            sin_resolver.append(f"{alias} -> {rel}")
        population[alias] = nombres

    nuestros = sorted(
        {d.name
         for base in ("addons", "src/addons")
         for d in (nuestro_repo / base).iterdir()
         if d.is_dir() and (d / "__manifest__.py").exists()}
    )

    conteo: dict[str, int] = {}
    sin_declarar: list[str] = []
    for name in nuestros:
        tipo, alias, ref = filas.get(name, (None, None, name))

        if tipo is None:
            donde = [a for a, ns in population.items() if name in ns]
            if donde:
                tipo, ref = "identidad", name
            else:
                tipo, ref = "SIN-DECLARAR", "—"
                sin_declarar.append(name)
                donde = []
        elif tipo == "sin-homonimo":
            donde = []
        else:
            candidatas = [alias] if alias else list(population)
            donde = [a for a in candidatas if ref in population.get(a, ())]
            if not donde:
                tipo = f"{tipo}-NO-RESUELVE"

        conteo[tipo] = conteo.get(tipo, 0) + 1
        if not args.quiet:
            print(f"{name}\t{tipo}\t{ref}\t{','.join(donde) or '—'}")

    print(f"\n-- censo de contraparte: {len(nuestros)} addons propios "
          f"contra {len(population)} raíces declaradas")
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
