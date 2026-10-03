#!/usr/bin/env python3
"""Suite de ``src/learning/experience.py``: el registro (S, A, R, S') versionado.

Qué tiene que garantizar:
- el registro lleva ``schemaVersion``, ``policyVersion`` y ``rewardVersion``;
- ida y vuelta sin pérdida (``to_record`` -> ``from_record``);
- un nombre o un valor con forma de secreto se rehúsa, en cualquier nivel;
- un esquema de otra versión se rehúsa al leerlo, no se interpreta a ciegas.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from learning.experience import (
    SCHEMA_VERSION,
    Action,
    DecisionState,
    Experience,
    SecretInExperienceError,
    UnsupportedSchemaError,
)

OK = FAILED = 0


def check(name: str, condition: bool) -> None:
    global OK, FAILED
    OK, FAILED = (OK + 1, FAILED) if condition else (OK, FAILED + 1)
    print(("ok   " if condition else "FAIL ") + name)


def raises(error: type[Exception], body) -> bool:
    try:
        body()
    except error:
        return True
    return False


state = DecisionState(task_class="analisis", item_id="p2c", task_id="TASK-THYROX-0743", attempt=2,
                      allowed_actions=("deepseek-v4.1-flash", "qwen3.8-flash"), prior_outcomes=("task_failure",))
action = Action(model="qwen3.8-flash", provider="token-plan")
experience = Experience(state=state, action=action, reward=0.0, accepted=False, outcome="task_failure",
                        next_state=state.after("task_failure"), costs={"billableTokens": 1200, "latencyMs": 9000},
                        policy_version="contextual-thompson-v1", reward_version="hard-gates-v1")

print("== 1. versiones y forma ==")
record = experience.to_record()
check("schemaVersion presente", record["schemaVersion"] == SCHEMA_VERSION)
check("policyVersion y rewardVersion", record["policyVersion"] == "contextual-thompson-v1" and record["rewardVersion"] == "hard-gates-v1")
check("S' acumula el resultado del intento", record["nextState"]["priorOutcomes"] == ["task_failure", "task_failure"])
check("S' avanza el intento", record["nextState"]["attempt"] == 3)

print("== 2. ida y vuelta ==")
check("from_record(to_record(e)) == e", Experience.from_record(record) == experience)

print("== 3. secretos ==")
leaky_name = Experience(state=state, action=action, reward=0.0, accepted=False, outcome="task_failure",
                        next_state=state, costs={"THYROX_REGISTRY_PUBLISHER_TOKEN": 1},
                        policy_version="p", reward_version="r")
check("un nombre de credencial se rehúsa", raises(SecretInExperienceError, leaky_name.to_record))
leaky_value = Experience(state=state, action=action, reward=0.0, accepted=False, outcome="task_failure",
                         next_state=state, costs={"note": "sk-ant-api03-" + "x" * 40},
                         policy_version="p", reward_version="r")
check("un valor con forma de clave se rehúsa", raises(SecretInExperienceError, leaky_value.to_record))

print("== 4. versión de esquema ==")
foreign = {**record, "schemaVersion": SCHEMA_VERSION + 1}
check("otra versión se rehúsa", raises(UnsupportedSchemaError, lambda: Experience.from_record(foreign)))

print(f"\n{OK + FAILED} casos: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
