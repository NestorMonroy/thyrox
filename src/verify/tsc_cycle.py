#!/usr/bin/env python3
"""El driver por fases del lazo tsc cero (plan v3: tres rutas).

    tsc_cycle classify --log L --packages P --out O.json

Cada fase es un subcomando que lee y escribe en el banco del paso, así una
fase se repite sin rehacer las anteriores. `tsc_zero_loop` sigue siendo el
lazo de proponentes deterministas; éste envuelve lo que hasta el paso 112 se
hacía a mano: pool, pipeline, revisión, rechazo, memoria y cierre.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from verify import tsc_routes


def cmd_classify(args) -> int:
    diagnostics = tsc_routes.parse_diagnostics(args.log.read_text(encoding="utf-8", errors="ignore"))
    if not diagnostics:
        # Un log vacío no distingue «cero errores» de «tsc no corrió»: el
        # veredicto de cero lo da la medición, no la clasificación.
        print(f"tsc_cycle classify: {args.log} sin diagnósticos — no se clasifica nada", file=sys.stderr)
        return 2
    duplicates = tsc_routes.duplicated_types(args.packages)
    routes = tsc_routes.classify(diagnostics, duplicates)
    counts = {"total": len(diagnostics), **{name: len(found) for name, found in routes.items()}}
    data = {
        "log": str(args.log),
        "counts": counts,
        "queue": tsc_routes.shared_queue(routes["shared"], duplicates),
        "routes": {name: [f"{d.file}({d.line}): {d.code}: {d.message}" for d in found]
                   for name, found in routes.items()},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("classify: " + " ".join(f"{k}={v}" for k, v in counts.items()) + f" duplicated_types={len(duplicates)}"
          f" -> {args.out}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("classify", help="reparte los diagnósticos de un log en las tres rutas")
    p.add_argument("--log", type=Path, required=True)
    p.add_argument("--packages", type=Path, default=Path("src/packages"))
    p.add_argument("--out", type=Path, required=True)
    p.set_defaults(func=cmd_classify)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
