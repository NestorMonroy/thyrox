#!/usr/bin/env python3
"""El typecheck POR PAQUETE, con baseline sobre los errores propios.

El defecto que cierra
---------------------

Repuntar el `exports` de los 42 hermanos a su declaracion saca del typecheck
del consumidor los errores que no son suyos — medido: **76 %** de los 2821 que
`check-cli-typecheck.sh` publica viven en otro paquete. Sacarlos sin un gate
que los recoja no es arreglarlos: es moverlos a donde nadie los mide, que es
exactamente lo que `metrica-decide-la-conclusion.md` llama lavanderia. Este
gate es la condicion previa del barrido, no su consecuencia.

Por que mide `own` y no el total
---------------------------------

`check_package` reporta lo que tsc vio, y tsc ve el cierre entero: sobre
`storage` son **7062** errores de los que solo **769** (10.9 %) son del
paquete. La cifra atribuible —y la unica sobre la que un baseline significa
algo— es `own_errors`, que `classify_errors` separa por la resolucion de cada
ruta. El total sigue publicandose al lado para que la diferencia se pueda leer.

Por que NO va en el pre-commit
-------------------------------

Cuesta ~28 s por paquete. Con los 43 del arbol son ~20 min en serie, y aun con
`--jobs 4` son varios minutos: un hook que tarda eso deja de correrse, o se
saltea con `--no-verify` hasta que el gate es decorativo. Se invoca a mano o en
segundo plano (`bash bin/thyrox-bg`), y su baseline es lo que viaja al commit.

Rehusa en vez de publicar un cero
----------------------------------

Sin `bunx`, o con `--strict` y sin baseline, sale **2 sin emitir conteo**: un 0
ahi no distinguiria «no hay errores» de «no pude medir».
"""
from __future__ import annotations

import argparse
import concurrent.futures
import os
import shutil
import sys
from pathlib import Path

from typescript.emit_declarations import _packages, check_package

#: El baseline es parametro de ESTE arbol, no del mecanismo (DEC-04). Congela
#: la deuda heredada por paquete: una entrada listada no bloquea, una cifra que
#: sube si.
BASELINE = Path(".claude/baselines/package_typecheck_baseline.txt")


def read_baseline(path: Path) -> dict:
    """El baseline como mapa paquete → errores propios congelados."""
    congelado = {}
    if not path.is_file():
        return congelado
    for linea in path.read_text(encoding="utf8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        nombre, _, cifra = linea.partition("\t")
        congelado[nombre.strip()] = int(cifra.strip() or 0)
    return congelado


def measure(root: Path, wanted, jobs: int):
    """Mide cada paquete y devuelve sus resultados en orden de nombre.

    Los hilos alcanzan porque el trabajo lo hace `tsc` en un subproceso: el GIL
    no lo retiene. La anchura por defecto es la de la maquina, igual que el
    pool de `src/session/run-task-pool.sh`, y por la misma razon medida — con
    `nproc` trabajadores la saturacion ya esta; mas anchura compra contencion.
    """
    targets = [p for p in _packages(root) if not wanted or p.name in wanted]
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        resultados = list(pool.map(check_package, targets))
    return sorted(resultados, key=lambda r: r.package)


def main(argv=None):
    parser = argparse.ArgumentParser(add_help=True, description=__doc__.strip().splitlines()[0])
    parser.add_argument("packages", nargs="*", help="los paquetes a medir; vacio = todos")
    parser.add_argument("--strict", action="store_true",
                        help="sale 1 si algun paquete supera su baseline")
    parser.add_argument("--write-baseline", action="store_true",
                        help="congela el conteo propio de hoy")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 1,
                        help="paquetes medidos a la vez (default: nproc)")
    parser.add_argument("--baseline", type=Path, default=None,
                        help="otra ruta de baseline")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))

    if not shutil.which("bunx"):
        print("check-package-typecheck: falta `bunx` — no se pudo medir.", file=sys.stderr)
        print("  NO se emite un conteo: un cero aqui seria un verde falso.", file=sys.stderr)
        return 2

    root = Path(os.environ.get("THYROX_ROOT", Path(__file__).resolve().parents[2]))
    baseline_path = args.baseline or (root / BASELINE)
    congelado = read_baseline(baseline_path)
    if args.strict and not congelado and not args.write_baseline:
        print(f"check-package-typecheck: no hay baseline en {baseline_path}.", file=sys.stderr)
        print("  NO se emite veredicto: sin el, `--strict` no distingue deuda", file=sys.stderr)
        print("  heredada de defecto nuevo. Congelalo con --write-baseline.", file=sys.stderr)
        return 2

    resultados = measure(root, set(args.packages), max(1, args.jobs))
    if not resultados:
        print(f"check-package-typecheck: ningun paquete coincide con {args.packages}",
              file=sys.stderr)
        return 2

    empeoran, propios = [], 0
    sin_medir = [r for r in resultados if r.unmeasurable]
    for resultado in resultados:
        if resultado.unmeasurable:
            print(f"  {resultado.verdict()}")
            continue
        propios += resultado.own_errors
        techo = congelado.get(resultado.package)
        marca = ""
        if techo is not None and resultado.own_errors > techo:
            empeoran.append((resultado.package, techo, resultado.own_errors))
            marca = f"  <- sube desde {techo}"
        elif techo is None and congelado:
            marca = "  <- sin baseline"
        print(f"  {resultado.package}: {resultado.own_errors} propio(s)"
              f" · {resultado.sibling_errors} de hermano"
              f" · {resultado.escaped_errors} fuera"
              f" (total {resultado.errors}){marca}")

    medidos = [r for r in resultados if not r.unmeasurable]
    if args.write_baseline:
        # Un paquete SIN MEDIR no entra al baseline: congelarlo con 0 seria
        # congelar la ausencia de medicion como si fuera ausencia de errores.
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        lineas = [f"{r.package}\t{r.own_errors}" for r in medidos]
        baseline_path.write_text("\n".join(lineas) + "\n", encoding="utf8")
        print(f"\ncheck-package-typecheck: baseline escrito en {baseline_path} "
              f"({len(lineas)} de {len(resultados)} paquete(s), "
              f"{propios} error(es) propio(s))")
        if sin_medir:
            print(f"  {len(sin_medir)} paquete(s) quedan FUERA del baseline "
                  f"por no haberse podido medir: "
                  f"{', '.join(r.package for r in sin_medir)}")
        return 0

    print(f"\ncheck-package-typecheck: {propios} error(es) propio(s) "
          f"(alcance medido: {len(medidos)} de {len(resultados)} paquete(s))")
    if sin_medir:
        print(f"  {len(sin_medir)} SIN MEDIR: "
              f"{', '.join(r.package for r in sin_medir)}")
        if args.strict:
            print("  NO se emite veredicto: el alcance esta incompleto y un 0",
                  file=sys.stderr)
            print("  aqui no distinguiria «no hay errores» de «no pude medir».",
                  file=sys.stderr)
            return 2
    if empeoran:
        print(f"  {len(empeoran)} paquete(s) suben sobre su baseline:")
        for nombre, techo, ahora in empeoran:
            print(f"    {nombre}: {techo} -> {ahora}")
        return 1 if args.strict else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
