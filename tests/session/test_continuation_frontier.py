#!/usr/bin/env python3
"""Suite de ``src/session/continuation_frontier.py``: la frontera ejecutable del DAG.

Qué tiene que garantizar:
- la frontera es un CONJUNTO: todos los ítems sin aceptar cuyas dependencias están
  aceptadas, no el primero del plan;
- un ítem dependiente se libera en cuanto su dependencia se acepta, aunque otros
  ítems sigan corriendo;
- un fallo bloquea sólo a sus descendientes, nunca a una rama independiente;
- dos ítems que mutan el mismo checkout no corren a la vez; aislados en worktree y
  con archivos disjuntos, sí;
- un ítem que necesita una credencial expuesta no entra en la frontera;
- un fallo de una ejecución anterior no cuenta tras un nuevo ``start``; una
  aceptación sí;
- un plan sin ``dependsOn`` en ninguna fila es una secuencia (contrato heredado).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.continuation_frontier import (  # noqa: E402
    conflicts, doomed_items, item_states, runnable_items,
)
from session.task_continuation import PlanItem, plan_items_from_rows  # noqa: E402

OK = FAILED = 0


def check(name, expected, actual):
    global OK, FAILED
    if expected == actual:
        OK += 1
    else:
        FAILED += 1
        print(f"FALLA {name}: esperado {expected!r}, obtenido {actual!r}")


def item(identifier, depends=(), mutates=False, isolation="", owned=(), task="TASK-THYROX-0754", secrets=()):
    return PlanItem(id=identifier, prompt=f"{identifier}.md", verify="true", candidates=("m",),
                    depends_on=tuple(depends), mutates=mutates, isolation=isolation, owned=tuple(owned),
                    task_id=task, secrets=tuple(secrets))


def ids(items):
    return [entry.id for entry in items]


START = {"kind": "start"}
DAG = [item("T1"), item("T2"), item("T3", depends=["T1"]), item("T4")]

# la primera ola es un conjunto
check("primera ola T1 T2 T4", ["T1", "T2", "T4"], ids(runnable_items(DAG, item_states([START]))))
running = [START] + [{"kind": "dispatched", "item": i} for i in ("T1", "T2", "T4")]
check("mientras corren, nada nuevo", [], ids(runnable_items(DAG, item_states(running))))
released = running + [{"kind": "accepted", "item": "T1"}]
check("T3 se libera con T2 y T4 corriendo", ["T3"], ids(runnable_items(DAG, item_states(released))))
check("estado running", "running", item_states(released)["T2"])

# N tareas, no N slices de una
BATCH = [item("A1", task="TASK-BATCHA-0001"), item("A2", depends=["A1"], task="TASK-BATCHA-0001"),
         item("B1", task="TASK-BATCHB-0001"), item("C1", task="TASK-BATCHC-0001")]
check("lote: A1 B1 C1", ["A1", "B1", "C1"], ids(runnable_items(BATCH, item_states([START]))))

# un fallo bloquea sólo a sus descendientes
failed = [START, {"kind": "hard_block", "item": "T1"}]
check("tras el fallo de T1, T2 y T4 siguen", ["T2", "T4"], ids(runnable_items(DAG, item_states(failed))))
check("T3 queda condenada por T1", [("T3", "dependencia sin aceptar: T1")],
      [(entry.id, why) for entry, why in doomed_items(DAG, item_states(failed))])
check("una ejecución nueva reintenta lo fallido", ["T1", "T2", "T4"],
      ids(runnable_items(DAG, item_states(failed + [START]))))
check("una aceptación vale entre ejecuciones", ["T2", "T3", "T4"],
      ids(runnable_items(DAG, item_states([START, {"kind": "accepted", "item": "T1"}, START]))))

# exclusión de concurrencia
inplace_a, inplace_b = item("a", mutates=True, owned=["x"]), item("b", mutates=True, owned=["y"])
worktree_a = item("c", mutates=True, isolation="worktree", owned=["src/a.py"])
worktree_b = item("d", mutates=True, isolation="worktree", owned=["src/b.py"])
worktree_overlap = item("e", mutates=True, isolation="worktree", owned=["src"])
reader = item("r")
check("dos mutadores en el mismo checkout chocan", True, conflicts(inplace_a, inplace_b))
check("dos worktrees disjuntos no chocan", False, conflicts(worktree_a, worktree_b))
check("un worktree que solapa archivos choca", True, conflicts(worktree_a, worktree_overlap))
check("un lector no choca", False, conflicts(reader, inplace_a))
check("frontera respeta la exclusión", ["a", "c", "d", "r"],
      ids(runnable_items([inplace_a, inplace_b, worktree_a, worktree_b, reader], item_states([START]))))
check("un mutador en curso retiene al otro", ["c", "d", "r"],
      ids(runnable_items([inplace_a, inplace_b, worktree_a, worktree_b, reader],
                         item_states([START, {"kind": "dispatched", "item": "a"}]))))

# credencial expuesta: fuera de la frontera, condenada con su motivo
needs = item("s", secrets=["THYROX_REGISTRY_PUBLISHER_TOKEN"])
check("expuesta no entra", [], ids(runnable_items([needs], item_states([START]), exposed={"THYROX_REGISTRY_PUBLISHER_TOKEN"})))
check("expuesta condenada", [("s", "credencial expuesta: THYROX_REGISTRY_PUBLISHER_TOKEN")],
      [(entry.id, why) for entry, why in doomed_items([needs], item_states([START]), exposed={"THYROX_REGISTRY_PUBLISHER_TOKEN"})])

# plan heredado: sin dependsOn en ninguna fila es una secuencia
legacy = plan_items_from_rows([{"id": "p2a", "prompt": "a", "verify": "true", "candidates": ["m"]},
                               {"id": "p2b", "prompt": "b", "verify": "true", "candidates": ["m"]}], "TASK-THYROX-0743")
check("heredado encadena", ("p2a",), legacy[1].depends_on)
check("heredado hereda la tarea", "TASK-THYROX-0743", legacy[0].task_id)
declared = plan_items_from_rows([{"id": "x", "prompt": "a", "verify": "true", "candidates": ["m"], "dependsOn": []},
                                 {"id": "y", "prompt": "b", "verify": "true", "candidates": ["m"], "taskId": "TASK-THYROX-0001"}], "TASK-THYROX-0743")
check("declarado no encadena", (), declared[1].depends_on)
check("taskId por ítem", "TASK-THYROX-0001", declared[1].task_id)
check("isolation por defecto en el checkout", "", declared[0].isolation)
check("mutates por defecto", True, declared[0].mutates)

print(f"continuation_frontier: {OK} OK, {FAILED} FALLAN")
sys.exit(1 if FAILED else 0)
