#!/usr/bin/env python3
"""Como organiza el CLIENTE su propio estado en disco, censado por subarbol.

THYROX declara tres hogares —banco de evidencia, trabajos y cache— y los
resuelve por variable (DEC-04: el mecanismo es del proveedor, el valor del
consumidor). El cliente tiene su propia particion bajo `~/.claude`, y hasta
ahora este arbol la conocia por listados sueltos. Este censo la mide: que
subarboles hay, con que extension escriben, cuanto pesan y en que fecha.

**Reusa el recorrido acotado del arbol** (`src/session/bounded_scan.py`) en vez
de un `rglob`. `~/.claude/projects` contiene los transcripts de sesion —el mas
grande medido pesa 21.8 MB— asi que un recorrido sin cota sobre esa raiz es la
forma que `trabajo-en-segundo-plano.md` prohibe: no falla, gira. Y `walk`
declara su corte con `complete`/`reason`, que es lo que impide que una salida
parcial se lea como completa.

*Metrica:* por subarbol de primer nivel de la raiz del cliente — numero de
archivos, bytes, reparto por extension, y la fecha del mas reciente.
*Ciega a:* el CONTENIDO de cada archivo (mide la organizacion, no lo que
guarda); a los subarboles vacios, que existen en disco y no aportan archivo; y
al enlace simbolico, que `walk` no sigue — un subarbol al que solo se llegue
por enlace no aparece.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import importlib.util
import json
import os
import pathlib
import sys

def _thyrox_root() -> pathlib.Path:
    """La raiz por MARCADOR, no por `parents[N]`.

    `parents[N]` cuenta niveles del arbol de ORIGEN: al mover el archivo, el
    indice sigue resolviendo y apunta a otro sitio — falla en silencio. Este
    arbol lo prohibe y lo barrio (`bin/check_path_arithmetic`). El marcador es
    el mismo que `reach.THYROX_MARKER` declara; se repite aqui, y solo aqui,
    porque este es el arranque: no se puede importar `reach` sin localizarlo.
    """
    aqui = pathlib.Path(__file__).resolve()
    marcador = pathlib.Path("src") / "paths" / "reach.py"
    for nivel in (aqui.parent, *aqui.parents):
        if (nivel / marcador).is_file():
            return nivel
    raise RuntimeError(f"no se encontro la raiz de thyrox ascendiendo desde {aqui}")


ROOT = _thyrox_root()

_spec = importlib.util.spec_from_file_location(
    "bounded_scan", ROOT / "src" / "session" / "bounded_scan.py")
bounded_scan = importlib.util.module_from_spec(_spec)
# Registrar ANTES de ejecutar: `@dataclass` resuelve su modulo por
# `sys.modules[cls.__module__]`, y sin la entrada revienta con un
# `AttributeError` sobre `None` que no nombra la causa.
sys.modules["bounded_scan"] = bounded_scan
_spec.loader.exec_module(bounded_scan)

# El resolutor de claves del arbol. `os.environ.get` NO basta: las claves viven
# en el `.env` del clon (DEC-04), y un proceso que no lo haya cargado las lee
# como ausentes — que es lo que hizo la primera version de este censo, y
# publico «SIN DECLARAR» sobre cuatro claves que si estan declaradas. Rehusar
# era correcto; leer la fuente equivocada, no.
sys.path.insert(0, str(ROOT / "src" / "paths"))
import reach  # noqa: E402

#: El hogar del cliente. Se declara por variable como todo hogar de este arbol
#: —`THYROX_USER_CLAUDE_DIR` ya existe en el contrato— y el literal es el
#: respaldo, no la definicion.
CLIENT_HOME_VAR = "THYROX_USER_CLAUDE_DIR"


def client_home() -> pathlib.Path:
    declared = reach.env_value(CLIENT_HOME_VAR)
    return pathlib.Path(declared) if declared else pathlib.Path.home() / ".claude"


def human(size: int) -> str:
    for unit in ("B", "K", "M", "G"):
        if size < 1024 or unit == "G":
            return f"{size:.0f}{unit}" if unit == "B" else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}G"


def census(home: pathlib.Path, deadline: float) -> tuple[dict, bounded_scan.ScanResult]:
    """Un registro por subarbol de primer nivel, mas el de la propia raiz."""
    resultado = bounded_scan.walk(home, deadline=deadline,
                                  max_entries=500_000, prune=())
    por_subarbol: dict[str, dict] = {}
    for ruta in resultado.paths:
        relativa = pathlib.Path(ruta).relative_to(home)
        # El nombre del primer segmento, o `(raiz)` para un archivo suelto.
        clave = relativa.parts[0] if len(relativa.parts) > 1 else "(raiz)"
        registro = por_subarbol.setdefault(clave, {
            "archivos": 0, "bytes": 0,
            "extensiones": collections.Counter(), "mas_reciente": 0.0})
        try:
            estado = os.stat(ruta)
        except OSError:
            # Un archivo que desaparece entre el recorrido y el stat es la
            # sesion viva escribiendo. Se cuenta como archivo y no como bytes:
            # descartarlo entero perderia que el subarbol esta activo.
            registro["archivos"] += 1
            continue
        registro["archivos"] += 1
        registro["bytes"] += estado.st_size
        registro["extensiones"][pathlib.Path(ruta).suffix or "(sin extension)"] += 1
        registro["mas_reciente"] = max(registro["mas_reciente"], estado.st_mtime)
    return por_subarbol, resultado


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--home", default=None,
                        help=f"raiz del cliente; por defecto {CLIENT_HOME_VAR} o ~/.claude")
    parser.add_argument("--deadline", type=float, default=120.0)
    parser.add_argument("--json", action="store_true",
                        help="emite JSONL, un registro por subarbol")
    args = parser.parse_args(argv[1:])

    home = pathlib.Path(args.home) if args.home else client_home()
    por_subarbol, resultado = census(home, args.deadline)

    if resultado.exit_code == bounded_scan.EXIT_REFUSED:
        print(f"ERROR: {resultado.reason}", file=sys.stderr)
        print("  No se emite censo: un cero aqui no distingue «no hay estado»",
              file=sys.stderr)
        print("  de «no pude medir».", file=sys.stderr)
        return bounded_scan.EXIT_REFUSED

    if args.json:
        for nombre, registro in sorted(por_subarbol.items()):
            print(json.dumps({
                "kind": "subtree", "name": nombre,
                "files": registro["archivos"], "bytes": registro["bytes"],
                "extensions": dict(registro["extensiones"].most_common()),
                "newest": dt.datetime.utcfromtimestamp(
                    registro["mas_reciente"]).isoformat() if registro["mas_reciente"] else None,
            }, ensure_ascii=False, sort_keys=True))
        print(json.dumps({"kind": "meta", "home": str(home),
                          "visited": resultado.visited,
                          "complete": resultado.complete,
                          "reason": resultado.reason}, sort_keys=True))
        return resultado.exit_code

    print(f"raiz del cliente: {home}")
    print()
    print(f"{'subarbol':<24} {'archivos':>9} {'peso':>9}  {'mas reciente':<20} extensiones")
    print("-" * 100)
    for nombre, registro in sorted(por_subarbol.items(),
                                   key=lambda kv: -kv[1]["bytes"]):
        reciente = (dt.datetime.utcfromtimestamp(registro["mas_reciente"])
                    .strftime("%Y-%m-%dT%H:%M:%S") if registro["mas_reciente"] else "—")
        extensiones = " ".join(f"{e}:{n}" for e, n
                               in registro["extensiones"].most_common(4))
        print(f"{nombre:<24} {registro['archivos']:>9} "
              f"{human(registro['bytes']):>9}  {reciente:<20} {extensiones}")
    total_archivos = sum(r["archivos"] for r in por_subarbol.values())
    total_bytes = sum(r["bytes"] for r in por_subarbol.values())
    print("-" * 100)
    print(f"{'TOTAL':<24} {total_archivos:>9} {human(total_bytes):>9}"
          f"   ({len(por_subarbol)} subarboles)")
    print()
    print("== LOS TRES HOGARES DE THYROX, contra los del cliente ==")
    # THYROX resuelve cada hogar por variable (DEC-04: el mecanismo es del
    # proveedor, el valor del consumidor). El cliente no: los compone sobre su
    # raiz. Por eso esta tabla lee la variable y NO un literal — si un clon
    # declara otro valor, el censo lo sigue.
    for clave, papel in (("THYROX_WORKBENCH_DIR", "banco de evidencia"),
                         ("THYROX_JOBS_DIR", "trabajos"),
                         ("THYROX_CACHE_DIR", "cache"),
                         ("THYROX_BACKGROUND_LOG_DIR", "logs de segundo plano")):
        declarado = reach.env_value(clave)
        if not declarado:
            print(f"  {clave:<28} SIN DECLARAR — el censo no inventa un default")
            continue
        ruta = pathlib.Path(declarado)
        if not ruta.is_dir():
            print(f"  {clave:<28} declarado y AUSENTE en disco: {ruta}")
            continue
        sub = bounded_scan.walk(ruta, deadline=30.0, prune=())
        peso = sum(os.stat(f).st_size for f in sub.paths if os.path.exists(f))
        print(f"  {clave:<28} {len(sub.paths):>6} archivos {human(peso):>8}  "
              f"[{papel}] {ruta}")
    print()

    # El corte se DECLARA. Sin esto, un recorrido truncado publica la misma
    # tabla que uno completo y nadie puede notarlo.
    if resultado.complete:
        print(f"recorrido COMPLETO: {resultado.visited} entradas en "
              f"{resultado.elapsed:.2f} s")
        print("  Ese plazo es el del RECORRIDO, no el del censo: el `stat` de")
        print("  cada archivo corre despues y no entra en la cifra.")
    else:
        print(f"recorrido TRUNCADO: {resultado.reason}")
        print("  La tabla de arriba es PARCIAL. No se lee como el universo.")
    return resultado.exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
