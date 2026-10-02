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
    classify_deterministic, load_plan, transition,
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

# qué se despacha lo decide la frontera del DAG: tests/session/test_continuation_frontier.py

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
def managed_evidence(name, task, unit):
    """Las dos evidencias que una unidad real deja: la del primitivo y la de dentro."""
    container = "c" * 64
    primitive_file, unit_file = controller.containment_files(unit["evidence_dir"], name)
    primitive_file.parent.mkdir(parents=True, exist_ok=True)
    primitive_file.write_text(json.dumps({"materializer": "podman-execution-primitive", "executionId": f"e-{name}",
                                          "task": task, "containerId": container}) + "\n")
    unit_file.write_text(json.dumps({"step": name, "containerId": container, "inUnit": True,
                                     "cgroup": f"/machine.slice/libpod-{container}.scope", "pid": 1}) + "\n")
def fake_unit(name, task, argv, network=None, secrets=(), mounts=(), **unit):
    calls.append({"name": name, "mounts": mounts})
    managed_evidence(name, task, unit)
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

# inventario por nombre, detección, redacción y estado expuesto
from session.task_continuation import (  # noqa: E402
    contain_secret_exposure, declared_secret_names, exposed_credentials, exposed_secret_names,
    mark_exposed, redact_secret_assignments,
)
with tempfile.TemporaryDirectory() as tmp:
    example = Path(tmp) / ".env.example"
    example.write_text("THYROX_FAKE_TOKEN=\nTHYROX_FAKE_DB_PASSWORD=\nTHYROX_PLAIN_SETTING=\n")
    check("el inventario sale de los nombres declarados", ("THYROX_FAKE_DB_PASSWORD", "THYROX_FAKE_TOKEN"),
          declared_secret_names(example))
NAMES = ("THYROX_FAKE_TOKEN", "THYROX_FAKE_DB_PASSWORD")
LEAK = "salida: THYROX_FAKE_TOKEN=abc123xyz\\nTHYROX_FAKE_DB_PASSWORD=s3cr3tvalue otro"
check("detecta cada secreto declarado con valor", {"THYROX_FAKE_TOKEN", "THYROX_FAKE_DB_PASSWORD"}, exposed_secret_names(LEAK, NAMES))
check("un secreto ya redactado no cuenta", set(), exposed_secret_names(redact_secret_assignments(LEAK, NAMES), NAMES))
check("la redacción conserva el nombre", True, "THYROX_FAKE_TOKEN=[REDACTADO]" in redact_secret_assignments(LEAK, NAMES))
check("un nombre sin valor no es exposición", set(), exposed_secret_names("THYROX_FAKE_TOKEN= vacío", NAMES))
with tempfile.TemporaryDirectory() as tmp:
    wb = Path(tmp); (wb / "outputs" / "i-m.transcript" / "s").mkdir(parents=True)
    leaked_file = wb / "outputs" / "i-m.transcript" / "s" / "t.jsonl"
    leaked_file.write_text(LEAK)
    saved_quarantine = controller.QUARANTINE_DIR
    controller.QUARANTINE_DIR = wb / "quarantine"
    try:
        found = contain_secret_exposure(wb, "i", "m", NAMES)
    finally:
        controller.QUARANTINE_DIR = saved_quarantine
    check("la contención nombra lo expuesto", {"THYROX_FAKE_TOKEN", "THYROX_FAKE_DB_PASSWORD"}, found)
    check("la salida queda redactada en su sitio", set(), exposed_secret_names(leaked_file.read_text(), NAMES))
    quarantined = list((wb / "quarantine").rglob("t.jsonl"))
    check("el original va a la cuarentena con modo 0600", (1, 0o600), (len(quarantined), quarantined[0].stat().st_mode & 0o777 if quarantined else None))
    mark_exposed(wb, found, "i")
    check("la credencial pasa a expuesta", {"THYROX_FAKE_TOKEN", "THYROX_FAKE_DB_PASSWORD"}, exposed_credentials(wb))
    # un ítem que necesita una credencial expuesta queda bloqueado SOLO, sin despachar nada
    calls.clear()
    (wb / "p.md").write_text("x\n")
    saved = (controller.run_in_unit, controller.reconcile_orphans, controller.commit_item)
    controller.run_in_unit, controller.reconcile_orphans = fake_unit, lambda: ""
    controller.commit_item = lambda *a, **k: (0, "")
    try:
        blocked = controller.run_item(wb, PlanItem(id="j", prompt="p.md", verify="true", candidates=("m",),
                                                   secrets=("THYROX_FAKE_TOKEN",)), "TASK-THYROX-0001", random.Random(0), None)
    finally:
        controller.run_in_unit, controller.reconcile_orphans, controller.commit_item = saved
    check("el ítem que necesita la expuesta queda bloqueado", "blocked", blocked)
    check("y no se despacha ninguna unidad", [], calls)
    from session.continuation_frontier import item_states, runnable_items
    check("un ítem bloqueado no detiene a uno independiente", ["k"],
          [e.id for e in runnable_items([PlanItem(id="j", prompt="p", verify="v", candidates=("m",)),
                                         PlanItem(id="k", prompt="p", verify="v", candidates=("m",))],
                                        item_states([{"kind": "start"}, {"kind": "blocked", "item": "j"}]))])

# ManagedExecutionContainmentGate. Anulación: run_in_unit sustituido por un
# subproceso del anfitrión. El payload corre de verdad (unit_attest.sh incluido)
# y la verificación sale 0, pero no hay unidad: el ítem no se acepta.
import subprocess  # noqa: E402
def host_unit(name, task, argv, network=None, secrets=(), mounts=(), **unit):
    unit["evidence_dir"].mkdir(parents=True, exist_ok=True)
    ran = subprocess.run(controller.attested_argv(unit["evidence_dir"], task, name, argv), capture_output=True, text=True)
    return ran.returncode, ran.stdout + ran.stderr
for label, runner, expected in (("unidad gestionada", fake_unit, "accepted"), ("subproceso del anfitrión", host_unit, "hard_block")):
    with tempfile.TemporaryDirectory() as tmp:
        wb = Path(tmp); (wb / "outputs").mkdir(); (wb / "p.md").write_text("x\n")
        saved = (controller.run_in_unit, controller.reconcile_orphans, controller.commit_item)
        controller.run_in_unit, controller.reconcile_orphans = runner, lambda: ""
        controller.commit_item = lambda *a, **k: (0, "")
        try:
            result = controller.run_item(wb, PlanItem(id="g", prompt="p.md", verify="true", candidates=("m",)),
                                         "TASK-THYROX-0001", random.Random(0), None)
        finally:
            controller.run_in_unit, controller.reconcile_orphans, controller.commit_item = saved
        gate = [json.loads(line) for line in (wb / "outputs" / "containment.jsonl").read_text().splitlines()]
        check(f"contención, {label}: veredicto del ítem", expected, result)
        check(f"contención, {label}: el gate deja su veredicto", expected == "accepted", gate[-1]["passed"])
        if expected == "hard_block":
            reasons = " ".join(r for step in gate[-1]["steps"] for r in step["reasons"])
            # En el anfitrión el cgroup delata hostPayload; dentro de una unidad de prueba el
            # subproceso hereda su cgroup, pero ningún primitivo lo materializó.
            check("la anulación nombra la ruta no gestionada", True,
                  "hostPayload=true" in reasons or "no tiene atestación del primitivo" in reasons)

# la orden de lanzamiento lleva la atestación del primitivo y el envoltorio de dentro
argv = unit_start_argv("n", "TASK-THYROX-0001", controller.attested_argv(Path("/e"), "TASK-THYROX-0001", "n", ["true"]),
                       attest=Path("/e/n.primitive.jsonl"))
check("--attest viaja a thyrox-bg", "/e/n.primitive.jsonl", argv[argv.index("--attest") + 1])
check("el payload va envuelto por unit_attest.sh", str(controller.UNIT_ATTEST), argv[argv.index("--") + 2])

# un registro de trabajo vivo no viaja en el commit: se mide por su PID
import os  # noqa: E402
from session.task_continuation import job_is_live  # noqa: E402
with tempfile.TemporaryDirectory() as tmp:
    live = Path(tmp) / "live"; (live / "outputs").mkdir(parents=True); (live / "outputs" / "pid").write_text(f"{os.getpid()}\n")
    dead = Path(tmp) / "dead"; (dead / "outputs").mkdir(parents=True); (dead / "outputs" / "pid").write_text("999999999\n")
    check("un trabajo con PID vivo está vivo", True, job_is_live(live))
    check("un trabajo con PID muerto no lo está", False, job_is_live(dead))
    check("sin registro de PID no está vivo", False, job_is_live(Path(tmp) / "none"))

# los fallos de proveedor tienen su presupuesto: cinco 502 seguidos no bloquean el ítem
dispatches = []
def flaky_unit(name, task, argv, network=None, secrets=(), mounts=(), **unit):
    managed_evidence(name, task, unit)
    if "preverify" in name:
        return (1, "")
    if name.endswith(tuple("0123456789")) and "-verify-" not in name:
        dispatches.append(argv[-3])
        return (1, "thyrox -p: 502 upstream request failed (tras 4 intentos)") if len(dispatches) <= 5 else (0, "")
    return (0, "") if len(dispatches) > 5 else (1, "")
with tempfile.TemporaryDirectory() as tmp:
    wb = Path(tmp); (wb / "outputs").mkdir(); (wb / "p.md").write_text("x\n")
    saved = (controller.run_in_unit, controller.reconcile_orphans, controller.commit_item, controller.pause)
    controller.run_in_unit, controller.reconcile_orphans = flaky_unit, lambda: ""
    controller.commit_item, controller.pause = (lambda *a, **k: (0, "")), (lambda seconds: None)
    try:
        result = controller.run_item(wb, PlanItem(id="f", prompt="p.md", verify="true", candidates=("a", "b"), attempts=4),
                                     "TASK-THYROX-0001", random.Random(0), None)
    finally:
        controller.run_in_unit, controller.reconcile_orphans, controller.commit_item, controller.pause = saved
check("cinco fallos de proveedor y luego éxito: se acepta", "accepted", result)
check("los dos candidatos vuelven a la rotación", {"a", "b"}, set(dispatches))
check("seis despachos en total", 6, len(dispatches))

# el presupuesto de fallos de proveedor se declara en el entorno
budget = subprocess.run([sys.executable, "-c", "import session.task_continuation as t; print(t.TRANSIENT_BUDGET)"],
                        env={**os.environ, "THYROX_CONTINUATION_TRANSIENT_BUDGET": "7",
                             "PYTHONPATH": str(Path(__file__).resolve().parents[2] / "src")},
                        capture_output=True, text=True).stdout.strip()
check("THYROX_CONTINUATION_TRANSIENT_BUDGET fija el presupuesto", "7", budget)

# las dos claves del entorno: el clasificador externo y la tarea por defecto
import os  # noqa: E402
from session.task_continuation import learned_classifier_from_environment, main  # noqa: E402
os.environ["THYROX_OUTCOME_CLASSIFIER_COMMAND"] = "cat >/dev/null; echo stalled"
learned = learned_classifier_from_environment()
assert learned is not None
check("el clasificador externo lee su orden del entorno", "stalled", learned({"exit": 1}))
os.environ["THYROX_OUTCOME_CLASSIFIER_COMMAND"] = ""
check("sin orden, sin clasificador aprendido", None, learned_classifier_from_environment())
with tempfile.TemporaryDirectory() as tmp:
    (Path(tmp) / "plan.jsonl").write_text(json.dumps({"id": "x", "prompt": "x.md", "verify": "true", "candidates": ["m"]}) + "\n")
    os.environ["THYROX_CONTINUATION_TASK"] = "no-es-tarea"
    check("una tarea inválida en el entorno rehúsa con 2", 2, main(["run", tmp]))
    os.environ.pop("THYROX_CONTINUATION_TASK")

print(f"test_task_continuation: {OK} OK, {FAILED} FALLA")
sys.exit(1 if FAILED else 0)
