#!/usr/bin/env python3
"""Control de `roster.worktree_state` — ¿se puede retirar el worktree de un
agente?

El reporte erróneo que lo origina: tres worktrees de agentes que YA habían
entregado se declararon «bloqueados por el cliente, en uso», leyendo el
motivo del candado de git. El candado lo pone el cliente con SU pid, no el del
agente, y dura lo que dure la sesión; y la limpieza automática del cliente no
toca un worktree con commits. Así que el candado no dice nada de si el agente
sigue: lo dice su transcript, y si se puede retirar lo dicen la rama y el
árbol.

Qué haría fallar a este control:
- leer el candado como «en uso» (el caso del reporte erróneo);
- declarar retirable un worktree cuya rama no está fusionada, o con cambios
  seguidos sin commitear;
- declarar retirable el de un agente que no entregó.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from roster import worktree_state as ws  # noqa: E402

PASSED = FAILED = 0


def check(label: str, expected, actual) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {actual!r}")


def git(cwd: pathlib.Path, *args: str) -> str:
    return subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=cwd,
                          check=True, capture_output=True, text=True).stdout


def transcript(path: pathlib.Path, blocks: list[dict]) -> None:
    lines = [{"type": "user", "message": {"role": "user", "content": "tarea"}},
             {"type": "assistant", "message": {"role": "assistant", "content": blocks}},
             {"type": "attachment", "attachment": {}}]
    path.write_text("".join(json.dumps(line) + "\n" for line in lines))


print("test_worktree_state:")

check("el motivo del candado del cliente nombra al agente y al pid del CLIENTE",
      {"agent_id": "a3a9b8c62afb01d1c", "pid": 105},
      ws.parse_lock_reason("claude agent agent-a3a9b8c62afb01d1c (pid 105 start 733)"))
check("un candado ajeno no nombra agente", None, ws.parse_lock_reason("mantenimiento manual"))

check("entregó, limpio y fusionado: retirable", ws.RETIRABLE, ws.verdict("delivered", dirty=False, merged=True))
check("entregó pero su rama no está en HEAD: sin fusionar", ws.UNMERGED,
      ws.verdict("delivered", dirty=False, merged=False))
check("entregó con cambios seguidos sin commitear: sin fusionar", ws.UNMERGED,
      ws.verdict("delivered", dirty=True, merged=True))
check("cortado: sin entregar, no se toca", ws.NOT_DELIVERED, ws.verdict("cut", dirty=False, merged=True))
check("indecidible: sin entregar, no se toca", ws.NOT_DELIVERED,
      ws.verdict("undecidable", dirty=False, merged=True))

with tempfile.TemporaryDirectory() as directory:
    base = pathlib.Path(directory)
    repo, tasks = base / "repo", base / "tasks"
    repo.mkdir()
    tasks.mkdir()
    (repo / "a.txt").write_text("a\n")
    git(repo, "init", "-q", "-b", "main")
    git(repo, "add", ".")
    git(repo, "commit", "-qm", "base")

    def agent(agent_id: str, *, commit: bool, merge: bool, delivered: bool, dirty: bool = False) -> None:
        wt = repo / ".claude/worktrees" / f"agent-{agent_id}"
        git(repo, "worktree", "add", "-q", "-b", f"worktree-agent-{agent_id}", str(wt))
        if commit:
            (wt / f"{agent_id}.txt").write_text("x\n")
            git(wt, "add", ".")
            git(wt, "commit", "-qm", agent_id)
        if merge:
            git(repo, "merge", "-q", "--no-ff", "-m", f"merge {agent_id}", f"worktree-agent-{agent_id}")
        if dirty:
            (wt / "a.txt").write_text("cambio sin commitear\n")
        # El candado que pone el cliente: su propio pid, no el del agente.
        git(repo, "worktree", "lock", "--reason", f"claude agent agent-{agent_id} (pid 1 start 1)", str(wt))
        transcript(tasks / f"{agent_id}.output",
                   [{"type": "text", "text": "reporte"}] if delivered
                   else [{"type": "tool_use", "id": "t", "name": "Bash", "input": {}}])

    agent("done1", commit=True, merge=True, delivered=True)
    agent("open1", commit=True, merge=False, delivered=True)
    agent("dirty1", commit=True, merge=True, delivered=True, dirty=True)
    agent("cut1", commit=True, merge=True, delivered=False)
    rows = {row["agent_id"]: row["verdict"] for row in ws.scan(repo, tasks)}
    check("scan: un worktree con candado del cliente, entregado y fusionado, es retirable", ws.RETIRABLE,
          rows.get("done1"))
    check("scan: la rama sin fusionar se detecta", ws.UNMERGED, rows.get("open1"))
    check("scan: los cambios seguidos se detectan", ws.UNMERGED, rows.get("dirty1"))
    check("scan: un agente cortado no se declara retirable", ws.NOT_DELIVERED, rows.get("cut1"))
    check("scan: sólo mira worktrees de agente, no el árbol principal", 4, len(rows))

    (tasks / "done1.output").unlink()
    rows = {row["agent_id"]: row["verdict"] for row in ws.scan(repo, tasks)}
    check("sin transcript no hay veredicto de entrega: no se declara retirable", ws.NOT_DELIVERED,
          rows.get("done1"))

# El veredicto no basta: «sin fusionar» es trabajo HECHO que espera entrar,
# no algo que descartar. Cada veredicto dice qué se hace con él, y ninguno
# retira un worktree cuyo trabajo no está en HEAD.
check("retirable: se retira", ws.ACTION_REMOVE, ws.action(ws.RETIRABLE, dirty=False))
check("sin fusionar con commits: se mide y se fusiona", ws.ACTION_MERGE, ws.action(ws.UNMERGED, dirty=False))
check("sin fusionar con cambios sueltos: se commitean en su rama antes de fusionar", ws.ACTION_COMMIT_THEN_MERGE,
      ws.action(ws.UNMERGED, dirty=True))
check("sin entregar: se reanuda al agente, su trabajo queda intacto", ws.ACTION_RESUME,
      ws.action(ws.NOT_DELIVERED, dirty=False))
check("ninguna acción de un worktree con trabajo fuera de HEAD es retirarlo", False,
      ws.ACTION_REMOVE in {ws.action(ws.UNMERGED, dirty=d) for d in (True, False)}
      | {ws.action(ws.NOT_DELIVERED, dirty=d) for d in (True, False)})

print(f"test_worktree_state: {PASSED + FAILED} aserciones — {PASSED} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
