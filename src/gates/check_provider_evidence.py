#!/usr/bin/env python3
"""Gate — THYROX no emite evidencia dentro de su propio arbol.

`workbench/paths.py` ya lo declara: *«un banco vive en el arbol del CONSUMIDOR
y lo producen sus sesiones»*, y por eso `workbench_dir()` REHUSA en vez de
inventar un default — un hogar por defecto seria justo la decision que la
directiva le retira al emisor.

Lo que faltaba es el control. La prosa estaba escrita y no lo impidio: en la
sesion del 2026-09-07 escribi el banco de un episodio en
`thyrox/.claude/eventos/`, teniendo el modulo delante. Es el criterio que
`gitlink-bump-gate.md` ya dejo fijado — la leccion escrita no previene la
reincidencia, un gate ejecutable si.

Que mide: directorios bajo `<raiz>/.claude/eventos/` en el arbol del PROVEEDOR.
Ciega a: un banco emitido fuera de ese segmento (un `evidencia/` inventado), y
a si el contenido de un banco legitimo del consumidor es correcto — eso lo mide
el gate de manifiesto, otro instrumento.

Salidas: 0 sin bancos propios, o con bancos y sin `--strict` · 1 con bancos
propios bajo `--strict` · 2 no pudo medir. El veredicto de rehuse es 2 y va
**sin cifra**: un 0 ahi no distinguiria «no hay bancos» de «no pude mirar».

Y publica la SALIDA de `workbench_dir()`, que es la mitad que faltaba. La
funcion rehusaba con el texto correcto y su unico consumidor fuera de tests
importaba las constantes y no la funcion, asi que a la pregunta «si aun no se
selecciona el hogar, ¿que mensaje le dices al usuario?» la respuesta era
NINGUNO. Aqui el rehuse no corta la medicion —la ausencia de hogar no impide
contar lo que el proveedor emitio— pero si se dice, porque es la accion que le
queda pendiente a quien corre el gate.
"""
from __future__ import annotations

import argparse
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from workbench.paths import (  # noqa: E402
    WorkbenchHomeError, evidence_dir, state_dir, workbench_dir,
)

#: El marcador por el que se reconoce la raiz propia. Constante con su entrada
#: de entorno (DEC-04): cablearlo le quitaria al consumidor la decision de como
#: esta estructurado su arbol.
LOCATOR_VAR = "THYROX_LOCATOR"
LOCATOR_DEFAULT = pathlib.Path("src") / "paths" / "reach.py"


def own_root(start: pathlib.Path) -> pathlib.Path | None:
    """La raiz propia, por ascenso al marcador declarado."""
    marker = pathlib.Path(os.environ.get(LOCATOR_VAR) or LOCATOR_DEFAULT)
    for level in (start, *start.parents):
        if (level / marker).is_file():
            return level
    return None


def banks(root: pathlib.Path) -> list[str]:
    """Los bancos emitidos dentro del proveedor, por nombre."""
    home = evidence_home(root)
    if not home.is_dir():
        return []
    return sorted(p.name for p in home.iterdir() if p.is_dir())


def evidence_home(root: pathlib.Path) -> pathlib.Path:
    """El par ``<estado>/<evidencia>`` del arbol dado, resuelto CON ese arbol.

    ``root`` viaja como ``start`` a los dos resolutores: el ``.env`` que gobierna
    los nombres de los segmentos es el del arbol que se mide, no el del cwd
    desde el que se invoca el gate.
    """
    return root / state_dir(root) / evidence_dir(root)


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", help="raiz a medir (por defecto, la propia)")
    p.add_argument("--strict", action="store_true", help="exit 1 si hay bancos")
    args = p.parse_args(argv)

    if args.root:
        root = pathlib.Path(args.root).resolve()
        if not (root / LOCATOR_DEFAULT).is_file():
            print(f"check-provider-evidence: {root} no lleva el marcador "
                  f"{LOCATOR_DEFAULT} — NO se emite un conteo: un 0 aqui seria "
                  "un verde falso.", file=sys.stderr)
            return 2
    else:
        root = own_root(pathlib.Path(__file__).resolve().parent)
        if root is None:
            print("check-provider-evidence: no se hallo la raiz propia — "
                  "NO se emite un conteo: un 0 aqui seria un verde falso.",
                  file=sys.stderr)
            return 2

    found = banks(root)
    print(f"check-provider-evidence: {len(found)} banco(s) emitido(s) dentro "
          f"del proveedor (alcance medido: {evidence_home(root)})")
    for name in found:
        print(f"  {name} — un banco vive en el arbol del CONSUMIDOR")

    try:
        print(f"  hogar del banco: {workbench_dir(root)}")
    except WorkbenchHomeError as err:
        # El rehuse se PUBLICA y no cambia el veredicto: el hogar sin declarar
        # es trabajo pendiente del consumidor, no una medicion imposible.
        print(f"  {err}")

    return 1 if (found and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
