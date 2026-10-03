"""T005a: margen de disco previo a la ingesta, frente a la ruta de embeddings elegida.

Lee la fila de la ruta en ``T005c-route-comparison.json`` (alcance
``semantic_content``) y el libre OBSERVADO ahora del sistema de archivos del
árbol. Si el libre cubre lo requerido más el margen, T005a no borra nada y lo
declara; si no, falla sin borrar: la liberación es de T005a con su propio
registro (contrato §22.4), nunca un efecto lateral de esta sonda.

Uso: t005a_headroom.py <banco> <ruta> <salida.json>
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

GIB = 1024 ** 3
MARGIN_BYTES = 2 * GIB


def route_requirement(comparison: dict, route: str) -> dict:
    rows = [row for row in comparison["rows"] if row["route"] == route and row["scope"] == "semantic_content"]
    if len(rows) != 1:
        raise SystemExit(f"t005a: se espera una fila semantic_content de {route}, hay {len(rows)}")
    return rows[0]


def main() -> int:
    bench, route, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    comparison = json.loads((bench / "outputs" / "T005c-route-comparison.json").read_text())
    row = route_requirement(comparison, route)
    stats = os.statvfs(bench)
    free = stats.f_bavail * stats.f_frsize
    required = int(row["required_bytes"])
    enough = free >= required + MARGIN_BYTES
    report = {
        "route": route,
        "scope": "semantic_content",
        "required_bytes": required,
        "margin_bytes": MARGIN_BYTES,
        "free_bytes_observed": free,
        "deletion_required": not enough,
        "deleted": [],
        "source": "T005c-route-comparison.json",
    }
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    return 0 if enough else 1


if __name__ == "__main__":
    sys.exit(main())
