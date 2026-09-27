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

Antes de medir, reconstruye los providers viejos
------------------------------------------------

El consumidor tipa contra el ``dist/*.d.ts`` de cada provider, asi que un
``dist/`` viejo le atribuye errores que no son suyos: ``app-host`` publico un
TS2305 porque el ``platform.d.ts`` de ``config`` no traia ``primePlatform``.
Por eso el gate, antes de medir, toma el cierre transitivo de providers de
workspace de cada consumidor y reconstruye solo los que ``is_stale`` declara
viejos, sellando cada uno. Un provider que no emite bloquea a quien dependa de
el: no se mide, y el gate sale 2 sin veredicto. ``--no-rebuild`` lo omite.

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
from collections.abc import Collection
from dataclasses import dataclass, field
from pathlib import Path

from paths import reach  # noqa: E402
from typescript.emit_declarations import (
    _packages,
    _read_manifest,
    check_package,
    emit_package,
    is_stale,
    write_digest,
)

#: El baseline es parametro de ESTE arbol, no del mecanismo (DEC-04). Congela
#: la deuda heredada por paquete: una entrada listada no bloquea, una cifra que
#: sube si.
BASELINE = Path(".claude/baselines/package_typecheck_baseline.txt")


def read_baseline(path: Path) -> dict:
    """El baseline como mapa paquete → errores propios congelados."""
    frozen = {}
    if not path.is_file():
        return frozen
    for line in path.read_text(encoding="utf8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name, _, figure = line.partition("\t")
        frozen[name.strip()] = int(figure.strip() or 0)
    return frozen


#: Las secciones del manifiesto cuyos nombres pueden ser paquetes del arbol.
DEPENDENCY_SECTIONS = ("dependencies", "devDependencies", "peerDependencies")


def packages_by_name(root: Path) -> dict:
    """Cada paquete del arbol por el nombre que declara su manifiesto."""
    index = {}
    for package_dir in _packages(root):
        name = _read_manifest(package_dir).get("name")
        if name:
            index[name] = package_dir
    return index


def workspace_providers(consumer: Path, index: dict) -> list:
    """El cierre transitivo de providers del arbol de un consumidor.

    Transitivo porque el ``.d.ts`` de un provider importa el de los suyos: si
    uno de esos esta viejo, el consumidor tipa contra el contrato viejo aunque
    su provider directo este al dia. Una dependencia que no es del arbol
    (``left-pad``) no tiene ``dist/`` que reconstruir y se ignora.
    """
    found, pending = {}, [consumer]
    while pending:
        manifest = _read_manifest(pending.pop())
        for section in DEPENDENCY_SECTIONS:
            for name in manifest.get(section, {}):
                provider = index.get(name)
                if provider is None or provider == consumer or provider.name in found:
                    continue
                found[provider.name] = provider
                pending.append(provider)
    return sorted(found.values(), key=lambda p: p.name)


@dataclass
class RefreshReport:
    rebuilt: list = field(default_factory=list)
    failed: list = field(default_factory=list)
    #: Consumidores con algun provider que no emitio: no se tipan.
    blocked: set = field(default_factory=set)


def refresh_providers(consumers, root: Path, emit=emit_package, jobs: int = 1) -> RefreshReport:
    """Reconstruye los providers viejos de ``consumers`` y los sella.

    Solo se emiten los que ``is_stale`` declara viejos; uno al dia no se toca.
    Un provider que no emite no se sella —su ``dist/`` no corresponde a su
    fuente— y bloquea a todo consumidor que dependa de el: tiparlo contra ese
    contrato publicaria errores que no son suyos, que es el defecto que este
    paso existe para cerrar.
    """
    index = packages_by_name(root)
    providers_of = {c.name: workspace_providers(c, index) for c in consumers}
    unique = {p.name: p for group in providers_of.values() for p in group}
    stale = [p for _, p in sorted(unique.items()) if is_stale(p)]
    report = RefreshReport()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        results = list(pool.map(emit, stale))
    for provider, result in zip(stale, results):
        if result.emitted:
            write_digest(provider)
            report.rebuilt.append(provider.name)
        else:
            report.failed.append(provider.name)
    failed = set(report.failed)
    report.blocked = {name for name, group in providers_of.items()
                      if failed & {p.name for p in group}}
    return report


def print_refresh(report: RefreshReport) -> None:
    if report.rebuilt:
        print(f"check-package-typecheck: {len(report.rebuilt)} provider(s) reconstruido(s) "
              f"por viejos: {', '.join(report.rebuilt)}")
    for name in report.failed:
        print(f"  provider {name}: la reconstruccion no emitio", file=sys.stderr)
    if report.blocked:
        print(f"  SIN TIPAR por un provider roto: {', '.join(sorted(report.blocked))}",
              file=sys.stderr)


def run_with_refresh(consumers, root: Path, emit=emit_package, check=check_package,
                     jobs: int = 1) -> int:
    """Refresca, mide a los no bloqueados y sale 2 si alguno quedo bloqueado."""
    report = refresh_providers(consumers, root, emit=emit, jobs=jobs)
    print_refresh(report)
    for consumer in consumers:
        if consumer.name not in report.blocked:
            print(f"  {check(consumer).verdict()}")
    return 2 if report.blocked else 0


def measure(root: Path, wanted, jobs: int, skip: Collection[str] = frozenset(),
            check=check_package):
    """Mide cada paquete y devuelve sus resultados en orden de nombre.

    Los hilos alcanzan porque el trabajo lo hace `tsc` en un subproceso: el GIL
    no lo retiene. La anchura por defecto es la de la maquina, igual que el
    pool de `src/session/run-task-pool.sh`, y por la misma razon medida — con
    `nproc` trabajadores la saturacion ya esta; mas anchura compra contencion.
    """
    targets = [p for p in _packages(root)
                if (not wanted or p.name in wanted) and p.name not in skip]
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        results = list(pool.map(check, targets))
    return sorted(results, key=lambda r: r.package)


def main(argv=None):
    parser = argparse.ArgumentParser(add_help=True,
                                     description=(__doc__ or "").strip().splitlines()[0])
    parser.add_argument("packages", nargs="*", help="los paquetes a medir; vacio = todos")
    parser.add_argument("--strict", action="store_true",
                        help="sale 1 si algun paquete supera su baseline")
    parser.add_argument("--write-baseline", action="store_true",
                        help="congela el conteo propio de hoy")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 1,
                        help="paquetes medidos a la vez (default: nproc)")
    parser.add_argument("--baseline", type=Path, default=None,
                        help="otra ruta de baseline")
    parser.add_argument("--no-rebuild", action="store_true",
                        help="no reconstruir los providers viejos antes de medir")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))

    if not shutil.which("bunx"):
        print("check-package-typecheck: falta `bunx` — no se pudo medir.", file=sys.stderr)
        print("  NO se emite un conteo: un cero aqui seria un verde falso.", file=sys.stderr)
        return 2

    root = reach.thyrox_root()
    baseline_path = args.baseline or (root / BASELINE)
    frozen = read_baseline(baseline_path)
    if args.strict and not frozen and not args.write_baseline:
        print(f"check-package-typecheck: no hay baseline en {baseline_path}.", file=sys.stderr)
        print("  NO se emite veredicto: sin el, `--strict` no distingue deuda", file=sys.stderr)
        print("  heredada de defecto nuevo. Congelalo con --write-baseline.", file=sys.stderr)
        return 2

    wanted = set(args.packages)
    report = RefreshReport()
    if not args.no_rebuild:
        consumers = [p for p in _packages(root) if not wanted or p.name in wanted]
        report = refresh_providers(consumers, root, jobs=max(1, args.jobs))
        print_refresh(report)
    results = measure(root, wanted, max(1, args.jobs), skip=report.blocked)
    if not results and not report.blocked:
        print(f"check-package-typecheck: ningun paquete coincide con {args.packages}",
              file=sys.stderr)
        return 2

    worsen, own = [], 0
    without_measure = [r for r in results if r.unmeasurable]
    for result in results:
        if result.unmeasurable:
            print(f"  {result.verdict()}")
            continue
        own += result.own_errors
        ceiling = frozen.get(result.package)
        mark = ""
        if ceiling is not None and result.own_errors > ceiling:
            worsen.append((result.package, ceiling, result.own_errors))
            mark = f"  <- sube desde {ceiling}"
        elif ceiling is None and frozen:
            mark = "  <- sin baseline"
        print(f"  {result.package}: {result.own_errors} propio(s)"
              f" · {result.sibling_errors} de hermano"
              f" · {result.escaped_errors} fuera"
              f" (total {result.errors}){mark}")

    measured = [r for r in results if not r.unmeasurable]
    if report.blocked:
        # Antes del baseline: congelarlo sin los bloqueados los sacaria de la
        # deuda medida sin que nadie lo decidiera.
        print("  NO se emite veredicto: un consumidor bloqueado por un provider roto",
              file=sys.stderr)
        print("  tiparia contra un contrato que no corresponde a su fuente.", file=sys.stderr)
        return 2
    if args.write_baseline:
        # Un paquete SIN MEDIR no entra al baseline: congelarlo con 0 seria
        # congelar la ausencia de medicion como si fuera ausencia de errores.
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [f"{r.package}\t{r.own_errors}" for r in measured]
        baseline_path.write_text("\n".join(lines) + "\n", encoding="utf8")
        print(f"\ncheck-package-typecheck: baseline escrito en {baseline_path} "
              f"({len(lines)} de {len(results)} paquete(s), "
              f"{own} error(es) propio(s))")
        if without_measure:
            print(f"  {len(without_measure)} paquete(s) quedan FUERA del baseline "
                  f"por no haberse podido medir: "
                  f"{', '.join(r.package for r in without_measure)}")
        return 0

    print(f"\ncheck-package-typecheck: {own} error(es) propio(s) "
          f"(alcance medido: {len(measured)} de {len(results)} paquete(s))")
    if without_measure:
        print(f"  {len(without_measure)} SIN MEDIR: "
              f"{', '.join(r.package for r in without_measure)}")
        if args.strict:
            print("  NO se emite veredicto: el alcance esta incompleto y un 0",
                  file=sys.stderr)
            print("  aqui no distinguiria «no hay errores» de «no pude medir».",
                  file=sys.stderr)
            return 2
    if worsen:
        print(f"  {len(worsen)} paquete(s) suben sobre su baseline:")
        for name, ceiling, now in worsen:
            print(f"    {name}: {ceiling} -> {now}")
        return 1 if args.strict else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
