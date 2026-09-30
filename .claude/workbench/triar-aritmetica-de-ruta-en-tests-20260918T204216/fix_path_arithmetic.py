#!/usr/bin/env python3
"""Sustituye la aritmetica `parents[N]` prohibida por el localizador.

TASK-THYROX-0087. El gate `verify.check_path_arithmetic` marca todo
`<algo>.parents[N]` cuyo statement envolvente NO sea una llamada a
`sys.path.insert`. Su docstring afirma que la forma partida en dos lineas
—variable, y la insercion en la siguiente— esta admitida; **es falso**, y su
propia suite lo afirma al reves con su razon (bloque 4 de
`tests/verify/test_path_arithmetic.py`): admitirla habria dejado sin gate los
sitios que el barrido de TASK-DOCS-0504 reemplazo.

Dos formas, un solo arreglo. En las dos la raiz pasa a salir de
`reach.thyrox_root()`, que es un localizador por marcador y no cuenta niveles
del arbol:

- **ruta-a-un-archivo** — `_MODULE = ...parents[2] / "src/x/y.py"`. Es la forma
  MUDA que el gate existe para ver: si el archivo se mueve no revienta, apunta
  a otro sitio y el consumidor sigue con datos vacios.
- **bootstrap-en-dos-lineas** — `HERE = ...parents[2]` y luego
  `sys.path.insert(0, str(HERE / "src"))`.

El bootstrap de UNA linea se conserva: es la unica aritmetica que el propio
localizador no puede reemplazar — no se puede pedir `reach.thyrox_root()`
antes de que `import reach` funcione.

NO escribe fuera de `tests/`. Los bancos de `.claude/workbench/` son evidencia
fechada y su desenlace es otro (ver el manifiesto de este banco).
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

from paths import reach
from verify import check_path_arithmetic as gate

#: El bootstrap de una linea, que el gate admite y que hace importable a
#: `paths.reach`. Es la precondicion de poder usar el localizador.
BOOTSTRAP = ('sys.path.insert(0, str(pathlib.Path(__file__).resolve()'
             '.parents[{n}] / "src"))')
BOOTSTRAP_PATHLIB_CORTO = ('sys.path.insert(0, str(Path(__file__).resolve()'
                           '.parents[{n}] / "src"))')

ASIGNACION = re.compile(
    r"^(?P<sangria>\s*)(?P<nombre>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*"
    r"(?P<prefijo>(?:pathlib\.)?Path\(__file__\)\.resolve\(\)"
    r"\.parents\[(?P<n>\d+)\])(?P<resto>.*)$")


def usa_path_corto(texto: str) -> bool:
    """`from pathlib import Path` (corto) contra `import pathlib` (largo)."""
    return bool(re.search(r"^from pathlib import .*\bPath\b", texto, re.M))


def tiene_bootstrap(texto: str) -> bool:
    return "sys.path.insert" in texto


def importa_reach(texto: str) -> bool:
    return bool(re.search(r"^from paths import .*\breach\b", texto, re.M))


def inserta_bootstrap(lineas: list[str], n: int, corto: bool) -> list[str]:
    """Pone el bootstrap de una linea + el import de `reach` tras los imports."""
    plantilla = BOOTSTRAP_PATHLIB_CORTO if corto else BOOTSTRAP
    bloque = [
        "# El bootstrap de UNA linea es la unica aritmetica que el gate admite,",
        "# y la unica que el localizador no puede reemplazar: no se puede pedir",
        "# `reach.thyrox_root()` antes de que `import reach` funcione.",
        plantilla.format(n=n),
        "from paths import reach  # noqa: E402",
    ]
    # Tras el ultimo import de nivel superior que no sea `from paths import`.
    ultimo = 0
    for i, l in enumerate(lineas):
        if re.match(r"^(import |from )", l):
            ultimo = i
    return lineas[:ultimo + 1] + [""] + bloque + lineas[ultimo + 1:]


def arregla(ruta: pathlib.Path, lineas_objetivo: set[int]) -> tuple[bool, list[str]]:
    texto = ruta.read_text(encoding="utf-8")
    lineas = texto.splitlines()
    corto = usa_path_corto(texto)
    notas: list[str] = []
    profundidad = None

    for numero in sorted(lineas_objetivo):
        idx = numero - 1
        if idx >= len(lineas):
            continue
        m = ASIGNACION.match(lineas[idx])
        if m:
            profundidad = int(m.group("n"))
            lineas[idx] = (f'{m.group("sangria")}{m.group("nombre")} = '
                           f'reach.thyrox_root(){m.group("resto")}')
            notas.append(f"{ruta.name}:{numero} asignacion -> reach.thyrox_root()")
            continue
        # Forma incrustada: la aritmetica dentro de una expresion mayor.
        patron = re.compile(r"(?:pathlib\.)?Path\(__file__\)\.resolve\(\)"
                            r"\.parents\[(\d+)\]")
        m2 = patron.search(lineas[idx])
        if m2:
            profundidad = int(m2.group(1))
            lineas[idx] = patron.sub("reach.thyrox_root()", lineas[idx])
            notas.append(f"{ruta.name}:{numero} incrustada -> reach.thyrox_root()")

    if not notas:
        return False, [f"{ruta}: NINGUNA linea coincidio — revisar a mano"]

    texto_nuevo = "\n".join(lineas)
    if not importa_reach(texto_nuevo):
        n = profundidad if profundidad is not None else 2
        lineas = inserta_bootstrap(lineas, n, corto)
        notas.append(f"{ruta.name}: bootstrap de una linea + import reach anadidos")
        texto_nuevo = "\n".join(lineas)

    ruta.write_text(texto_nuevo + "\n", encoding="utf-8")
    return True, notas


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--raiz-relativa", default="tests",
                   help="solo se toca lo que cuelga de aqui")
    args = p.parse_args(argv)

    raiz = reach.thyrox_root()
    hallados, medidos = gate.measure(raiz)
    if not hallados:
        print("check-path-arithmetic no reporta infractores — nada que arreglar",
              file=sys.stderr)
        return 2

    # Lo CONGELADO no se arregla: el baseline no es deuda por omision — cada
    # entrada declara su razon en el propio codigo. `test_rst_gate_root.py:57`
    # es un control NEGATIVO deliberado, la aritmetica vieja reproducida a
    # proposito para probar que ya no acierta. Convertirla al localizador
    # destruiria el control que ese bloque existe para ser.
    congelado = gate.read_baseline(gate.BASELINE)

    porArchivo: dict[str, set[int]] = {}
    for h in hallados:
        if h in congelado:
            continue
        ruta, _, linea = h.rpartition(":")
        if not ruta.startswith(args.raiz_relativa + "/"):
            continue
        porArchivo.setdefault(ruta, set()).add(int(linea))

    print(f"infractores totales={len(hallados)} (alcance medido: {medidos} archivos)")
    print(f"bajo {args.raiz_relativa}/: {sum(len(v) for v in porArchivo.values())} "
          f"en {len(porArchivo)} archivo(s)")
    if args.dry_run:
        for ruta, ls in sorted(porArchivo.items()):
            print(f"  {ruta}: {sorted(ls)}")
        return 0

    tocados = 0
    for ruta, ls in sorted(porArchivo.items()):
        ok, notas = arregla(raiz / ruta, ls)
        tocados += 1 if ok else 0
        for n in notas:
            print(f"  {n}")
    print(f"archivos reescritos: {tocados}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
