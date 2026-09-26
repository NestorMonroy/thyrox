#!/usr/bin/env python3
"""La configuración con que se juzgó cada propuesta del lazo.

Origen: self-evolving-agents-2026, lección 2 (AgentOptimizer y ProRL):
«llevar control de versiones por separado del model, el harness, el reward y
el entorno, para evitar la imposibilidad de atribución». En este árbol esa
palabra se reserva para la del proveedor que hospeda al agente —hoy Claude
Code; thyrox admite n proveedores— y no nombra nada nuestro. Lo que aquí se
versiona se nombra por lo que es: la ruta, el modelo del pool, el `scaffold` (el CONTENIDO del
prompt de la ruta, término del glosario), el comando del verificador y la
política de aceptación. El entorno es el árbol, que ya versiona git.

`setup_record` es puro: describe y da un `setup_id` estable (sha256 del
registro canónico, sin la ruta del prompt). `register` lo guarda una vez por
corrida en `setups.jsonl`, y cada fila del ledger lleva sólo el id.

Ciega a: la versión del binario de `claude` y de `tsc`, que el comando no
fija; un cambio ahí no cambia el id.
"""
from __future__ import annotations

import collections
import hashlib
import json
import re
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


def _setups(run: Path) -> dict[str, dict]:
    path = run / SETUPS
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []
    return {row["setup_id"]: row for row in rows}


def scaffold_scores(run: Path, ledger: str = "ledger.jsonl") -> dict[str | None, dict]:
    """Cómo rindió cada configuración de paso (L02, optimizar el scaffold con
    sus trayectorias): intentos juzgados, media de Laplace de aceptación y
    los códigos TS que introducen sus rechazos —el material concreto para
    revisar la plantilla de esa ruta—. Las filas sin ``setup_id`` (anteriores
    a que el ledger lo guardara) se agrupan bajo ``None``, no se descartan.

    Ciega a: lo neutro (``partial``, ``revealed``) y a la diferencia entre
    dos configuraciones que sólo cambian en algo que el registro no guarda."""
    setups = _setups(run)
    path = run / ledger
    scores: dict[str | None, dict] = {}
    for line in path.read_text().splitlines() if path.exists() else []:
        if not line.strip():
            continue
        row = json.loads(line)
        outcome = row.get("outcome", "")
        if not outcome.startswith(("accepted", "rejected")):
            continue
        setup_id = row.get("setup_id")
        entry = scores.setdefault(setup_id, {"route": (setups.get(setup_id) or {}).get("route"),
                                             "scaffold": (setups.get(setup_id) or {}).get("scaffold"),
                                             "accepted": 0, "rejected": 0, "codes": collections.Counter()})
        if outcome.startswith("accepted"):
            entry["accepted"] += 1
        else:
            entry["rejected"] += 1
            entry["codes"].update(m for d in row.get("new_diagnostics") or [] for m in re.findall(r"TS\d+", d)[:1])
    for entry in scores.values():
        entry["trials"] = entry["accepted"] + entry["rejected"]
        entry["mean"] = round((entry["accepted"] + 1) / (entry["trials"] + 2), 4)
        entry["rejection_codes"] = dict(entry.pop("codes").most_common())
    return scores


def best_setup(run: Path, route: str, *, min_trials: int) -> str | None:
    """La configuración de ``route`` con mejor media entre las que tienen al
    menos ``min_trials`` intentos juzgados; ``None`` si ninguna tiene
    evidencia suficiente: con pocos intentos no se elige."""
    candidates = [(entry["mean"], setup_id) for setup_id, entry in scaffold_scores(run).items()
                  if setup_id and entry["route"] == route and entry["trials"] >= min_trials]
    return max(candidates)[1] if candidates else None
