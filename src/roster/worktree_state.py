#!/usr/bin/env python3
"""¿Se puede retirar el worktree de un agente? Tres veredictos, y el candado
de git NO es uno de sus insumos.

El cliente bloquea el worktree de cada agente con un motivo de la forma
`claude agent agent-<id> (pid P start S)`, donde P es el pid del CLIENTE —el
de la sesión—, no el del agente. El candado dura lo que dure la sesión, y la
limpieza automática del cliente sólo retira un worktree limpio y sin commits
propios; el de un agente que commiteó se queda para siempre. Leer ese
candado como «el agente sigue» fue el reporte erróneo que origina esto: tres
agentes que ya habían entregado se declararon en uso.

Lo que sí decide:

- **si entregó** — `roster.delivery` sobre su transcript;
- **si su rama está fusionada** en el HEAD del árbol principal;
- **si su árbol tiene cambios seguidos** sin commitear.

*Métrica:* esos tres ejes por worktree de agente (`git worktree list`).
*Ciega a:* un archivo nuevo que el agente no llegó a añadir (se miran sólo
los seguidos: un `node_modules` instalado no es trabajo), y a una rama
fusionada por otro camino que no deje a su punta como ancestro de HEAD.

Uso: worktree_state.py [--repo R] --tasks-dir D
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from roster import delivery  # noqa: E402

RETIRABLE = "retirable"
UNMERGED = "sin-fusionar"
NOT_DELIVERED = "sin-entregar"
VERDICTS = (RETIRABLE, UNMERGED, NOT_DELIVERED)

#: Qué se hace con cada veredicto. «Sin fusionar» es trabajo HECHO que espera
#: entrar: su acción es fusionarlo, midiendo antes; ninguna acción retira un
#: worktree cuyo trabajo no está en HEAD.
ACTION_REMOVE = "retirar el worktree (su trabajo ya está en HEAD)"
ACTION_MERGE = "medir la rama (tsc y tests derivados) y fusionarla"
ACTION_COMMIT_THEN_MERGE = "commitear en su rama los cambios sueltos, medir y fusionar"
ACTION_RESUME = "reanudar al agente (SendMessage) para que entregue; su trabajo queda en su rama"

_LOCK = re.compile(r"claude agent agent-(?P<agent>[0-9a-z]+) \(pid (?P<pid>\d+)")
_PATH = re.compile(r"agent-(?P<agent>[0-9a-z]+)$")


def parse_lock_reason(reason: str) -> dict | None:
    """El agente y el pid que nombra el candado del cliente, o None."""
    match = _LOCK.search(reason or "")
    return {"agent_id": match["agent"], "pid": int(match["pid"])} if match else None


def verdict(delivery_verdict: str, *, dirty: bool, merged: bool) -> str:
    if delivery_verdict != delivery.DELIVERED:
        return NOT_DELIVERED
    if dirty or not merged:
        return UNMERGED
    return RETIRABLE


def action(verdict_value: str, *, dirty: bool) -> str:
    if verdict_value == RETIRABLE:
        return ACTION_REMOVE
    if verdict_value == UNMERGED:
        return ACTION_COMMIT_THEN_MERGE if dirty else ACTION_MERGE
    return ACTION_RESUME


def _git(cwd: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)


def _worktrees(repo: Path) -> list[dict]:
    rows, current = [], {}
    for line in _git(repo, "worktree", "list", "--porcelain").stdout.splitlines() + [""]:
        if not line:
            if current:
                rows.append(current)
            current = {}
            continue
        key, _, value = line.partition(" ")
        current[key] = value
    return rows


def scan(repo: Path, tasks_dir: Path) -> list[dict]:
    """Un veredicto por worktree de agente del repositorio."""
    repo = repo.resolve()
    found = []
    for row in _worktrees(repo):
        path = Path(row["worktree"])
        lock = parse_lock_reason(row.get("locked", ""))
        match = _PATH.search(path.name)
        agent_id = lock["agent_id"] if lock else (match["agent"] if match else None)
        if agent_id is None or path == repo:
            continue
        transcript = tasks_dir / f"{agent_id}.output"
        try:
            text = Path(os.path.realpath(transcript)).read_text(encoding="utf-8", errors="ignore")
            delivered = delivery.classify(text)
        except OSError:
            delivered = delivery.UNDECIDABLE
        dirty = bool(_git(path, "status", "--porcelain", "--untracked-files=no").stdout.strip())
        branch = row.get("branch", "").removeprefix("refs/heads/")
        merged = bool(branch) and _git(repo, "merge-base", "--is-ancestor", branch, "HEAD").returncode == 0
        found.append({"agent_id": agent_id, "path": str(path), "branch": branch, "delivery": delivered,
                      "dirty": dirty, "merged": merged, "locked": "locked" in row,
                      "verdict": verdict(delivered, dirty=dirty, merged=merged)})
        found[-1]["action"] = action(found[-1]["verdict"], dirty=dirty)
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--tasks-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    rows = scan(args.repo, args.tasks_dir)
    for row in rows:
        print(f"  {row['verdict']:<13} {row['agent_id']}  entrega={row['delivery']} fusionada={row['merged']}"
              f" cambios={row['dirty']} candado={row['locked']}  {row['path']}")
        print(f"                -> {row['action']}")
    counts = {v: sum(r["verdict"] == v for r in rows) for v in VERDICTS}
    print("worktree_state: " + " · ".join(f"{v} {n}" for v, n in counts.items())
          + f" (alcance medido: {len(rows)} worktree(s) de agente)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
