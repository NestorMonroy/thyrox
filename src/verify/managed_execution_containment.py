"""ManagedExecutionContainmentGate: una tarea gestionada sólo se acepta si cada
payload suyo corrió dentro de una ExecutionUnit materializada por el primitivo.

Dos evidencias independientes, y las dos tienen que coincidir:

1. **La atestación del primitivo** (``podman-execution-execute run --attest``):
   la escribe el proceso que materializó la unidad, con el ``containerId`` que
   devolvió ``podman create``. ``materializer`` es ``podman-execution-primitive``.
2. **La identidad vista desde dentro** (``src/session/unit_attest.sh``): la
   escribe el payload antes de ejecutarse, leyendo su propio ``/proc/self/cgroup``.
   Un proceso del anfitrión no está en un cgroup ``libpod-<id>``.

PASS exige, por cada identidad del payload, una atestación del primitivo con el
mismo contenedor, ids no nulos, y el cgroup de ese contenedor. Una tarea sin
evidencia es FAIL: el vacío no se acepta. El resultado funcional no se lee:
correcto por una ruta equivocada sigue siendo FAIL.

Uso: managed_execution_containment.py --task-step T005 --primitive A.jsonl --unit B.jsonl
Salidas: 0 PASS · 1 FAIL · 2 no se pudo medir (archivo ilegible).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

PRIMITIVE_MATERIALIZER = "podman-execution-primitive"
CONTAINER_ID = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class ContainmentVerdict:
    step: str
    passed: bool
    executions: int
    reasons: tuple[str, ...] = field(default_factory=tuple)

    def to_record(self) -> dict:
        return {"gate": "ManagedExecutionContainmentGate", "step": self.step, "passed": self.passed,
                "executions": self.executions, "reasons": list(self.reasons)}


def _valid_attestation(row: dict) -> str | None:
    if row.get("materializer") != PRIMITIVE_MATERIALIZER:
        return f"materializer={row.get('materializer')!r}, no {PRIMITIVE_MATERIALIZER}"
    if not row.get("executionId"):
        return "executionId nulo"
    if not CONTAINER_ID.match(str(row.get("containerId") or "")):
        return "containerId nulo o mal formado"
    return None


def containment_verdict(step: str, primitive_rows: list[dict], unit_rows: list[dict]) -> ContainmentVerdict:
    """Veredicto de contención de un paso a partir de sus dos evidencias."""
    reasons: list[str] = []
    attested: dict[str, dict] = {}
    for row in primitive_rows:
        problem = _valid_attestation(row)
        if problem:
            reasons.append(f"atestación inválida ({row.get('executionId')}): {problem}")
        else:
            attested[row["containerId"]] = row
    payloads = [row for row in unit_rows if row.get("step") == step]
    if not payloads:
        reasons.append(f"{step}: ninguna identidad de payload; no hay ExecutionUnit atribuible")
    contained = 0
    for row in payloads:
        container = str(row.get("containerId") or "")
        cgroup = str(row.get("cgroup") or "")
        if not row.get("inUnit") or f"libpod-{container}" not in cgroup or not container:
            reasons.append(f"{step}: hostPayload=true (pid {row.get('pid')}, cgroup {cgroup or '?'})")
        elif container not in attested:
            reasons.append(f"{step}: el contenedor {container[:12]} no tiene atestación del primitivo")
        else:
            contained += 1
    passed = not reasons and contained == len(payloads) and contained > 0
    return ContainmentVerdict(step=step, passed=passed, executions=contained, reasons=tuple(reasons))


def _read_jsonl(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ManagedExecutionContainmentGate")
    parser.add_argument("--task-step", required=True)
    parser.add_argument("--primitive", type=Path, required=True)
    parser.add_argument("--unit", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        verdict = containment_verdict(args.task_step, _read_jsonl(args.primitive), _read_jsonl(args.unit))
    except (OSError, json.JSONDecodeError) as error:
        print(f"managed_execution_containment: no se pudo medir: {error}", file=sys.stderr)
        return 2
    print(json.dumps(verdict.to_record(), ensure_ascii=False))
    return 0 if verdict.passed else 1


if __name__ == "__main__":
    sys.exit(main())
