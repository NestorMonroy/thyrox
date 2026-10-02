#!/usr/bin/env python3
"""Suite de ``src/verify/managed_execution_containment.py``: ManagedExecutionContainmentGate.

Qué tiene que garantizar:
- PASS sólo si cada payload de la tarea tiene su atestación del primitivo
  (``materializer = podman-execution-primitive``, ``executionId`` y ``containerId``
  no nulos) Y su identidad vista desde dentro está en el cgroup de ESE contenedor;
- un payload del anfitrión (sin cgroup ``libpod-<id>``) es FAIL aunque exista una
  atestación del primitivo para otra cosa;
- una atestación sin payload que la reconozca, o un payload sin atestación, es FAIL;
- una tarea sin ninguna evidencia es FAIL, nunca PASS por vacío;
- el resultado funcional no entra: el gate no lo lee.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from verify.managed_execution_containment import containment_verdict

OK = FAILED = 0


def check(name: str, condition: bool) -> None:
    global OK, FAILED
    OK, FAILED = (OK + 1, FAILED) if condition else (OK, FAILED + 1)
    print(("ok   " if condition else "FAIL ") + name)


CONTAINER = "a" * 64
OTHER = "b" * 64
PRIMITIVE = {"materializer": "podman-execution-primitive", "executionId": "probe-x-1", "task": "TASK-THYROX-0758",
             "containerId": CONTAINER, "containerName": "thyrox-worker-probe-x-1", "exitCode": 0}
UNIT = {"task": "TASK-THYROX-0758", "step": "T005", "containerId": CONTAINER,
        "cgroup": f"/machine.slice/libpod-{CONTAINER}.scope/container", "pid": 7, "inUnit": True}
HOST_UNIT = {"task": "TASK-THYROX-0758", "step": "T005", "containerId": "", "cgroup": "/user.slice/session-1.scope",
             "pid": 4242, "inUnit": False}

print("== 1. primitivo + identidad dentro del mismo contenedor: PASS ==")
verdict = containment_verdict("T005", [PRIMITIVE], [UNIT])
check("PASS", verdict.passed)
check("una ejecución contada", verdict.executions == 1)

print("== 2. payload del anfitrión: FAIL ==")
verdict = containment_verdict("T005", [PRIMITIVE], [HOST_UNIT])
check("FAIL", not verdict.passed)
check("nombra el payload del anfitrión", any("hostPayload" in reason for reason in verdict.reasons))

print("== 3. identidad de un contenedor que el primitivo no atestó: FAIL ==")
check("FAIL", not containment_verdict("T005", [PRIMITIVE], [{**UNIT, "containerId": OTHER,
      "cgroup": f"/machine.slice/libpod-{OTHER}.scope"}]).passed)

print("== 4. atestación sin identidad desde dentro: FAIL ==")
check("FAIL", not containment_verdict("T005", [PRIMITIVE], []).passed)

print("== 5. atestación de otro materializador o con ids nulos: FAIL ==")
check("materializador ajeno", not containment_verdict("T005", [{**PRIMITIVE, "materializer": "bash"}], [UNIT]).passed)
check("executionId nulo", not containment_verdict("T005", [{**PRIMITIVE, "executionId": None}], [UNIT]).passed)
check("containerId nulo", not containment_verdict("T005", [{**PRIMITIVE, "containerId": ""}], [UNIT]).passed)

print("== 6. sin ninguna evidencia: FAIL, no PASS por vacío ==")
check("FAIL", not containment_verdict("T005", [], []).passed)

print("== 7. el cgroup tiene que ser el del contenedor atestado, no sólo declararlo ==")
check("cgroup de otro contenedor", not containment_verdict("T005", [PRIMITIVE], [{**UNIT,
      "cgroup": f"/machine.slice/libpod-{OTHER}.scope"}]).passed)

print(f"\n{OK + FAILED} casos: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
