#!/usr/bin/env python3
"""La configuración con que se juzgó cada propuesta del lazo.

Origen: self-evolving-agents-2026, lección 2 (AgentOptimizer y ProRL):
«llevar control de versiones por separado del model, el harness, el reward y
el entorno, para evitar la imposibilidad de atribución». En este árbol esa
palabra se reserva para la de Claude Code; lo que aquí se versiona se nombra
por lo que es: la ruta, el modelo del pool, el `scaffold` (el CONTENIDO del
prompt de la ruta, término del glosario), el comando del verificador y la
política de aceptación. El entorno es el árbol, que ya versiona git.

`setup_record` es puro: describe y da un `setup_id` estable (sha256 del
registro canónico, sin la ruta del prompt). `register` lo guarda una vez por
corrida en `setups.jsonl`, y cada fila del ledger lleva sólo el id.

Ciega a: la versión del binario de `claude` y de `tsc`, que el comando no
fija; un cambio ahí no cambia el id.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

SETUPS = "setups.jsonl"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def setup_record(*, route: str, model: str, scaffold: Path, verifier: list[str], policy: dict) -> dict:
    """El registro de la configuración de un paso, con su id estable."""
    record = {"route": route, "model": model, "scaffold": str(scaffold),
              "scaffold_sha256": _sha256(Path(scaffold).read_bytes()),
              "verifier": list(verifier), "policy": dict(sorted(policy.items()))}
    canonical = json.dumps({k: v for k, v in record.items() if k != "scaffold"}, sort_keys=True,
                           ensure_ascii=False)
    return {**record, "setup_id": _sha256(canonical.encode())[:16]}


def register(run: Path, record: dict) -> str:
    """Guarda el registro en la corrida si su id no está; devuelve el id."""
    path = run / SETUPS
    known = {json.loads(line)["setup_id"] for line in path.read_text().splitlines() if line.strip()} \
        if path.exists() else set()
    if record["setup_id"] not in known:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record["setup_id"]
