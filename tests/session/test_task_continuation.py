#!/usr/bin/env python3
"""Suite de ``src/session/task_continuation.py``: el controlador de continuación.

Qué tiene que garantizar:
- el siguiente ítem es el primero declarado sin aceptación: el plan es la autoridad;
- las reglas deterministas clasifican lo inequívoco (502 transitorio, 401 permanente,
  verificación roja = fallo de tarea, verificación verde = éxito);
- un clasificador aprendido sólo llena lo ambiguo, nunca sobreescribe una regla ni concede éxito;
- un 502 no cuenta contra el candidato; un fallo de tarea sí;
- el candidato sale SÓLO de los permitidos por el ítem;
- el prompt de un reintento lleva la evidencia del fallo y no cambia el objetivo.
"""
from __future__ import annotations

import json
import random
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.task_continuation import (  # noqa: E402
    Evidence, PlanItem, attempt_prompt, candidate_counts, choose_candidate, classify,
    classify_deterministic, load_plan, next_item, transition,
)

OK = FAILED = 0


def check(name, expected, actual):
    global OK, FAILED
    if expected == actual:
        OK += 1
    else:
        FAILED += 1
        print(f"FALLA {name}: esperado {expected!r}, obtenido {actual!r}")


ITEM = PlanItem(id="p2a", prompt="p2a.md", verify="true", candidates=("qwen3.8-flash", "deepseek-v4.1-flash"))
PLAN = [ITEM, PlanItem(id="p2b", prompt="p2b.md", verify="true", candidates=("qwen3.8-flash",))]

# el plan manda el orden
check("primer ítem sin aceptar", "p2a", next_item(PLAN, []).id)
check("tras aceptar p2a, p2b", "p2b", next_item(PLAN, [{"kind": "accepted", "item": "p2a"}]).id)
check("un intento no acepta", "p2a", next_item(PLAN, [{"kind": "attempt", "item": "p2a", "outcome": "success"}]).id)
check("todo aceptado", None, next_item(PLAN, [{"kind": "accepted", "item": "p2a"}, {"kind": "accepted", "item": "p2b"}]))

# reglas deterministas
E = lambda **kw: Evidence(item="p2a", model="qwen3.8-flash", **{"exit": 1, **kw})  # noqa: E731
check("502 es transitorio", "provider_transient", classify_deterministic(E(stderr_tail="thyrox -p: 502 upstream request failed (tras 4 intentos)", verify_exit=1)))
check("401 es permanente", "provider_permanent", classify_deterministic(E(stderr_tail="401 invalid api key", verify_exit=1)))
check("credencial ausente es infraestructura", "infrastructure_failure", classify_deterministic(E(stderr_tail="delegate: credencial ausente en la unidad", verify_exit=1)))
check("exit 0 y verificación verde es éxito", "success", classify_deterministic(E(exit=0, verify_exit=0)))
check("exit 0 y verificación roja es fallo de tarea", "task_failure", classify_deterministic(E(exit=0, verify_exit=1)))
check("sin actividad medida es stalled", "stalled", classify_deterministic(E(exit=125, verify_exit=1)))
check("la verificación verde manda sobre un cierre sucio", "success", classify_deterministic(E(exit=1, stderr_tail="max turns", verify_exit=0)))
check("sin verificación y sin señal es ambiguo", None, classify_deterministic(E(exit=1, stderr_tail="algo raro")))

# lo aprendido: sólo lo ambiguo, nunca éxito
check("la regla gana a lo aprendido", ("provider_transient", "rule"),
      classify(E(stderr_tail="502", verify_exit=1), learned=lambda f: "task_failure"))
check("lo aprendido llena lo ambiguo", ("stalled", "learned"), classify(E(stderr_tail="algo raro"), learned=lambda f: "stalled"))
check("lo aprendido no concede éxito", ("task_failure", "ambiguous-default"), classify(E(stderr_tail="algo raro"), learned=lambda f: "success"))
check("sin clasificador, lo ambiguo es fallo de tarea", ("task_failure", "ambiguous-default"), classify(E(stderr_tail="algo raro")))

# transiciones
check("éxito commitea", "commit", transition("success", 0, 0))
check("transitorio reintenta", "retry", transition("provider_transient", 0, 0))
check("transitorio agotado cambia de candidato", "next_candidate", transition("provider_transient", 2, 0))
check("fallo de tarea cambia de candidato", "next_candidate", transition("task_failure", 0, 0))
check("infraestructura reintenta una vez", "retry", transition("infrastructure_failure", 0, 0))
check("infraestructura agotada para", "stop", transition("infrastructure_failure", 0, 1))
check("hallazgo no bloqueante no para", "next_candidate", transition("non_blocking_finding", 0, 0))

# la posterior: un 502 no cuenta, un fallo de tarea sí
LOG = [
    {"kind": "attempt", "taskClass": "analisis", "model": "qwen3.8-flash", "outcome": "provider_transient"},
    {"kind": "attempt", "taskClass": "analisis", "model": "qwen3.8-flash", "outcome": "task_failure"},
    {"kind": "attempt", "taskClass": "analisis", "model": "deepseek-v4.1-flash", "outcome": "success"},
    {"kind": "attempt", "taskClass": "mecanica", "model": "deepseek-v4.1-flash", "outcome": "task_failure"},
]
check("conteo por clase sin transitorios", {"qwen3.8-flash": (0, 1), "deepseek-v4.1-flash": (1, 0)}, candidate_counts(LOG, "analisis"))

# el candidato sale de los permitidos; excluido todo, None
check("sólo permitidos", True, choose_candidate(ITEM, LOG, set(), random.Random(1)) in ITEM.candidates)
check("excluido uno, el otro", "deepseek-v4.1-flash", choose_candidate(ITEM, LOG, {"qwen3.8-flash"}, random.Random(1)))
check("excluidos todos, sin candidato", None, choose_candidate(ITEM, LOG, set(ITEM.candidates), random.Random(1)))
check("claude nunca aparece si no está declarado", True,
      all(choose_candidate(ITEM, LOG, set(), random.Random(seed)) != "claude-cli" for seed in range(50)))

# el prompt de reintento lleva la evidencia y conserva el objetivo
with tempfile.TemporaryDirectory() as tmp:
    wb = Path(tmp)
    (wb / "outputs").mkdir()
    (wb / "p2a.md").write_text("Tramo A — sólo esto.\n")
    check("primer intento usa el prompt declarado", wb / "p2a.md", attempt_prompt(wb, ITEM, [], 1))
    retried = attempt_prompt(wb, ITEM, [{"model": "qwen3.8-flash", "outcome": "task_failure", "exit": 0, "verifyExit": 1, "verifyTail": "FAIL x"}], 2).read_text()
    check("conserva el objetivo", True, retried.startswith("Tramo A — sólo esto."))
    check("lleva la evidencia", True, "FAIL x" in retried and "task_failure" in retried)
    (wb / "plan.jsonl").write_text(json.dumps({"id": "p2a", "prompt": "p2a.md", "verify": "true", "candidates": ["qwen3.8-flash"]}) + "\n")
    check("lee el plan declarado", ["p2a"], [item.id for item in load_plan(wb)])

# un nombre de trabajo no puede traer sufijo ISO: thyrox-bg añade el suyo y rehúsa el slug
import re as _re  # noqa: E402
from session.task_continuation import job_suffix  # noqa: E402
check("el sufijo del trabajo no es ISO", None, _re.search(r"\d{8}T\d{6}", f"cont-p2a-1-{job_suffix()}"))

# un trabajador delegado no ve el .env del árbol
from session.task_continuation import ENV_FILE_MASK, ROOT, unit_start_argv  # noqa: E402
argv = unit_start_argv("n", "TASK-THYROX-0001", ["true"], network="host", secrets=("K",), mounts=(ENV_FILE_MASK,))
check("la máscara del .env viaja como montaje de sólo lectura", True,
      "--mount" in argv and argv[argv.index("--mount") + 1] == f"/dev/null:{ROOT}/.env:ro")
check("la máscara va antes del payload", True, argv.index("--mount") < argv.index("--"))

# el despacho del trabajador pasa la máscara; la verificación, no (no lleva juicio ni proveedor)
import session.task_continuation as controller  # noqa: E402
calls = []
def fake_unit(name, task, argv, network=None, secrets=(), mounts=()):
    calls.append({"name": name, "mounts": mounts})
    return (1, "") if "preverify" in name else (0, "")
with tempfile.TemporaryDirectory() as tmp:
    wb = Path(tmp); (wb / "outputs").mkdir(); (wb / "p.md").write_text("x\n")
    saved = (controller.run_in_unit, controller.reconcile_orphans, controller.commit_item)
    controller.run_in_unit, controller.reconcile_orphans = fake_unit, lambda: ""
    controller.commit_item = lambda *a, **k: (0, "")
    try:
        result = controller.run_item(wb, PlanItem(id="i", prompt="p.md", verify="true", candidates=("m",)),
                                     "TASK-THYROX-0001", random.Random(0), None)
    finally:
        controller.run_in_unit, controller.reconcile_orphans, controller.commit_item = saved
dispatch = [c for c in calls if "preverify" not in c["name"] and "verify" not in c["name"]]
check("el ítem se acepta con los dobles", "accepted", result)
check("el despacho del trabajador lleva la máscara del .env", [(ENV_FILE_MASK,)], [c["mounts"] for c in dispatch])

# las dos claves del entorno: el clasificador externo y la tarea por defecto
import os  # noqa: E402
from session.task_continuation import learned_classifier_from_environment, main  # noqa: E402
os.environ["THYROX_OUTCOME_CLASSIFIER_COMMAND"] = "cat >/dev/null; echo stalled"
check("el clasificador externo lee su orden del entorno", "stalled", learned_classifier_from_environment()({"exit": 1}))
os.environ["THYROX_OUTCOME_CLASSIFIER_COMMAND"] = ""
check("sin orden, sin clasificador aprendido", None, learned_classifier_from_environment())
with tempfile.TemporaryDirectory() as tmp:
    (Path(tmp) / "plan.jsonl").write_text(json.dumps({"id": "x", "prompt": "x.md", "verify": "true", "candidates": ["m"]}) + "\n")
    os.environ["THYROX_CONTINUATION_TASK"] = "no-es-tarea"
    check("una tarea inválida en el entorno rehúsa con 2", 2, main(["run", tmp]))
    os.environ.pop("THYROX_CONTINUATION_TASK")

print(f"test_task_continuation: {OK} OK, {FAILED} FALLA")
sys.exit(1 if FAILED else 0)
