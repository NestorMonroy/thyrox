#!/usr/bin/env python3
"""Controlador de continuación: consume el plan declarado de un banco, ítem por ítem.

El banco dice QUÉ se hace (``plan.jsonl``, en orden); este controlador sólo
elige la TRANSICIÓN siguiente entre las declaradas. Nunca crea trabajo.

Contrato por ítem::

    ítem declarado -> despacho (thyrox-bg --task -> PodmanExecutionPrimitive)
      -> thyrox -p con el candidato elegido -> evidencia
      -> verificación determinista (en otra unidad) -> transición -> siguiente

Autoridades, separadas:

- el plan: qué ítems existen y en qué orden;
- ``classify``: reglas deterministas sobre la evidencia; un clasificador
  aprendido (``THYROX_OUTCOME_CLASSIFIER_COMMAND``, p. ej. transformers dentro
  de su unidad) SÓLO se consulta en los casos ambiguos y nunca sobreescribe
  una regla;
- ``choose_candidate``: Thompson sampling sobre la posterior Beta de
  ``verify.tsc_schedule`` (el mismo mecanismo del lazo tsc), por clase de
  tarea; recompensa = ítem aceptado por el verificador; los fallos de
  proveedor e infraestructura no cuentan contra el candidato;
- la verificación del ítem (su ``verify``): la única autoridad de aceptación.

Transiciones::

    success               -> commit + push -> siguiente ítem
    provider_transient    -> mismo candidato hasta TRANSIENT_RETRIES; luego el siguiente
    provider_permanent    -> siguiente candidato
    task_failure          -> siguiente candidato, con la evidencia del fallo en su prompt
    stalled               -> siguiente candidato
    infrastructure_failure-> un reintento; luego hard_block
    non_blocking_finding  -> se registra y NO cambia la transición del ítem
    hard_block            -> se detiene (presupuesto agotado, o sin candidato)

Un reporte es una proyección de ``continuation.jsonl``; no es una transición.

Uso::

    bin/task_continuation run <banco> [--max-items N] [--seed S]
    bin/task_continuation next <banco>        # qué ítem toca, sin despachar
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from verify.tsc_schedule import posterior

ROOT = Path(os.environ.get("THYROX_ROOT") or Path(__file__).resolve().parents[2])
BG = ["bash", str(ROOT / "bin" / "thyrox-bg")]
EXECUTE = ["bash", str(ROOT / "bin" / "podman-execution-execute")]

OUTCOMES = (
    "success", "provider_transient", "provider_permanent", "task_failure",
    "infrastructure_failure", "stalled", "non_blocking_finding", "hard_block",
)
#: Resultados que no son responsabilidad del candidato: no mueven su posterior.
NOT_COUNTED = {"provider_transient", "infrastructure_failure", "hard_block", "non_blocking_finding"}
TRANSIENT_RETRIES = 2
INFRASTRUCTURE_RETRIES = 1
#: Código de salida con que ``delegate.sh`` declara un trabajador sin actividad medida.
STALLED_EXIT = 125
TIMEOUT_EXIT = 124
#: Código propio: thyrox-bg rehusó lanzar la unidad.
LAUNCH_FAILED_EXIT = 97

TRANSIENT_PATTERN = re.compile(r"\b(429|500|502|503|504)\b|upstream request failed|ECONNRESET|ETIMEDOUT|socket hang up|overloaded", re.I)
PERMANENT_PATTERN = re.compile(r"\b(401|403)\b|invalid api key|model[^\n]{0,40}not (found|exist)|does not exist", re.I)
INFRASTRUCTURE_PATTERN = re.compile(r"lanzamiento rehusado|credencial ausente|no se admite|autorización rehusada|podman-execution-execute:|Unable to create .*index\.lock", re.I)


@dataclass(frozen=True)
class PlanItem:
    """Un ítem declarado del banco. ``verify`` corre en una unidad propia y su exit decide."""

    id: str
    prompt: str
    verify: str
    candidates: tuple[str, ...]
    task_class: str = "analisis"
    owned: tuple[str, ...] = ()
    max_turns: int = 150
    attempts: int = 4


@dataclass
class Evidence:
    """Lo que el controlador mide de un intento; entrada única de ``classify``."""

    item: str
    model: str
    exit: int
    stderr_tail: str = ""
    verify_exit: int | None = None
    verify_tail: str = ""
    result: str = ""
    elapsed_seconds: float = 0.0
    findings: list[dict] = field(default_factory=list)
    tool_calls: int | None = None

    def as_features(self) -> dict:
        return {key: value for key, value in self.__dict__.items() if key != "findings"} | {"findings": len(self.findings)}


def load_plan(workbench: Path) -> list[PlanItem]:
    plan = workbench / "plan.jsonl"
    if not plan.is_file():
        raise SystemExit(f"task_continuation: el banco no declara plan: {plan}")
    items = []
    for line in plan.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        items.append(PlanItem(
            id=row["id"], prompt=row["prompt"], verify=row["verify"], candidates=tuple(row["candidates"]),
            task_class=row.get("taskClass", "analisis"), owned=tuple(row.get("owned", ())),
            max_turns=int(row.get("maxTurns", 150)), attempts=int(row.get("attempts", 4)),
        ))
    if not items:
        raise SystemExit(f"task_continuation: plan vacío: {plan}")
    return items


def read_log(workbench: Path) -> list[dict]:
    path = workbench / "outputs" / "continuation.jsonl"
    if not path.is_file():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def append_log(workbench: Path, row: dict) -> None:
    path = workbench / "outputs" / "continuation.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {"utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **row}
    with path.open("a") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def next_item(plan: list[PlanItem], log: list[dict]) -> PlanItem | None:
    """El primer ítem declarado sin aceptación registrada. El orden es el del plan."""
    accepted = {row["item"] for row in log if row.get("kind") == "accepted"}
    return next((item for item in plan if item.id not in accepted), None)


def classify_deterministic(evidence: Evidence) -> str | None:
    """Reglas inequívocas; ``None`` si el caso es ambiguo."""
    if evidence.exit == 0 and evidence.verify_exit == 0:
        return "success"
    if evidence.exit == 0 and evidence.verify_exit not in (None, 0):
        return "task_failure"
    if evidence.exit == STALLED_EXIT or evidence.exit == TIMEOUT_EXIT:
        return "stalled"
    text = evidence.stderr_tail
    if INFRASTRUCTURE_PATTERN.search(text):
        return "infrastructure_failure"
    if PERMANENT_PATTERN.search(text):
        return "provider_permanent"
    if TRANSIENT_PATTERN.search(text):
        return "provider_transient"
    if evidence.exit != 0 and evidence.verify_exit == 0:
        # el trabajador no cerró limpio pero lo declarado se verifica: la
        # verificación es la autoridad.
        return "success"
    if evidence.exit != 0 and evidence.verify_exit not in (None, 0):
        return "task_failure"
    return None


def classify(evidence: Evidence, learned=None) -> tuple[str, str]:
    """Devuelve (resultado, fuente). La regla gana siempre; lo aprendido sólo llena el hueco."""
    ruled = classify_deterministic(evidence)
    if ruled is not None:
        return ruled, "rule"
    if learned is not None:
        label = learned(evidence.as_features())
        if label in OUTCOMES and label not in ("success",):
            # un clasificador nunca concede éxito: eso sólo lo hace el verificador.
            return label, "learned"
    return "task_failure", "ambiguous-default"


def learned_classifier_from_environment():
    """Clasificador aprendido como orden externa (corre en su unidad); ausente si no se declara."""
    command = os.environ.get("THYROX_OUTCOME_CLASSIFIER_COMMAND")
    if not command:
        return None

    def run(features: dict) -> str | None:
        done = subprocess.run(["bash", "-c", command], input=json.dumps(features), capture_output=True, text=True)
        return done.stdout.strip().splitlines()[-1] if done.returncode == 0 and done.stdout.strip() else None

    return run


def candidate_counts(log: list[dict], task_class: str) -> dict[str, tuple[int, int]]:
    counts: dict[str, list[int]] = {}
    for row in log:
        if row.get("kind") != "attempt" or row.get("taskClass") != task_class:
            continue
        if row.get("outcome") in NOT_COUNTED:
            continue
        pair = counts.setdefault(row["model"], [0, 0])
        pair[0 if row.get("outcome") == "success" else 1] += 1
    return {model: (pair[0], pair[1]) for model, pair in counts.items()}


def choose_candidate(item: PlanItem, log: list[dict], excluded: set[str], rng: random.Random,
                     epsilon: float = 0.5, alpha0: float = 0.5) -> str | None:
    """Thompson sampling entre los candidatos PERMITIDOS por el ítem; empata por el orden declarado."""
    allowed = [model for model in item.candidates if model not in excluded]
    if not allowed:
        return None
    counts = candidate_counts(log, item.task_class)
    draws = []
    for rank, model in enumerate(allowed):
        accepted, rejected = counts.get(model, (0, 0))
        a, b = posterior(accepted, rejected, epsilon, alpha0)
        draws.append((-rng.betavariate(a, b), rank, model))
    return min(draws)[2]


def transition(outcome: str, same_candidate_retries: int, infrastructure_retries: int) -> str:
    """Qué hace el controlador con un resultado: ``commit``, ``retry``, ``next_candidate`` o ``stop``."""
    if outcome == "success":
        return "commit"
    if outcome == "provider_transient":
        return "retry" if same_candidate_retries < TRANSIENT_RETRIES else "next_candidate"
    if outcome == "infrastructure_failure":
        return "retry" if infrastructure_retries < INFRASTRUCTURE_RETRIES else "stop"
    if outcome == "hard_block":
        return "stop"
    return "next_candidate"


def attempt_prompt(workbench: Path, item: PlanItem, failures: list[dict], attempt: int) -> Path:
    """El prompt declarado, más la evidencia de los intentos fallidos previos; nunca otro objetivo."""
    base = (workbench / item.prompt).read_text()
    if not failures:
        return workbench / item.prompt
    lines = ["", "## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)", ""]
    for failure in failures:
        lines.append(f"- {failure['model']}: {failure['outcome']} (exit {failure['exit']}, verificación {failure.get('verifyExit')})")
        if failure.get("verifyTail"):
            lines.append("  ```\n  " + failure["verifyTail"].replace("\n", "\n  ") + "\n  ```")
    path = workbench / "outputs" / f"{item.id}-attempt-{attempt}-prompt.md"
    path.write_text(base + "\n".join(lines) + "\n")
    return path


# --- efectos: todo lo que ejecuta pasa por una unidad --------------------------------------------

def run_in_unit(name: str, task: str, argv: list[str], network: str | None = None, secrets: tuple[str, ...] = ()) -> tuple[int, str]:
    """Lanza ``argv`` con thyrox-bg en una ExecutionUnit, espera y devuelve (exit, log)."""
    start = [*BG, "start", name, "--grace", "0", "--task", task, "--kind", "maintenance"]
    if network:
        start += ["--network", network]
    for secret in secrets:
        start += ["--secret-from-env", secret]
    launched = subprocess.run([*start, "--", *argv], capture_output=True, text=True, cwd=ROOT)
    if launched.returncode != 0:
        # No hubo unidad: es un fallo de lanzamiento, no del trabajo ni del proveedor.
        return LAUNCH_FAILED_EXIT, f"lanzamiento rehusado: {launched.stdout}{launched.stderr}"
    wait_for_job(name)
    status = subprocess.run([*BG, "status", name], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    # `log` imprime la RUTA del log, no su contenido.
    path = Path(subprocess.run([*BG, "log", name], capture_output=True, text=True, cwd=ROOT).stdout.strip())
    log = path.read_text(errors="replace") if path.is_file() else ""
    match = re.search(r"done:(-?\d+)", status)
    return (int(match.group(1)) if match else 1), log


def wait_for_job(name: str, poll_seconds: int = 30) -> str:
    """Bloquea hasta que el trabajo de thyrox-bg deje de estar ``running``; devuelve su estado final."""
    subprocess.run([*BG, "wait", name], capture_output=True, text=True, cwd=ROOT)
    while (status := subprocess.run([*BG, "status", name], capture_output=True, text=True, cwd=ROOT).stdout.strip()) == "running":
        time.sleep(poll_seconds)
    return status


def job_suffix() -> str:
    """Sufijo único de un trabajo: segundos de época. thyrox-bg añade el ISO y rehúsa un slug que ya lo trae."""
    return str(time.time_ns() // 1000)


def reconcile_orphans() -> str:
    done = subprocess.run([*EXECUTE, "reconcile-orphans"], capture_output=True, text=True, cwd=ROOT)
    return (done.stdout + done.stderr).strip()


def read_findings(workbench: Path, item: PlanItem) -> list[dict]:
    """Hallazgos fuera de alcance que el trabajador declaró; se consumen una vez (se renombran)."""
    path = workbench / "outputs" / f"{item.id}-findings.jsonl"
    if not path.is_file():
        return []
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    path.rename(path.with_name(f"{path.name}.{time.strftime('%Y%m%dT%H%M%S', time.gmtime())}.recorded"))
    return rows


def tail(text: str, lines: int = 25) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])


def run_item(workbench: Path, item: PlanItem, task: str, rng: random.Random, learned) -> str:
    """Corre un ítem hasta aceptarlo o agotar su presupuesto. Devuelve ``accepted`` o ``hard_block``."""
    log = read_log(workbench)
    # Reanudar: si lo declarado ya se verifica (un intento previo, o un controlador
    # que murió antes de commitear), se acepta sin volver a despachar.
    stamp = job_suffix()
    verify_code, verify_log = run_in_unit(f"cont-{item.id}-preverify-{stamp}", task, ["bash", "-c", item.verify])
    if verify_code == 0:
        append_log(workbench, {"kind": "attempt", "item": item.id, "attempt": 0, "model": None, "taskClass": item.task_class,
                               "outcome": "success", "source": "preexisting", "verifyExit": 0, "transition": "commit"})
        commit_code, commit_log = commit_item(workbench, item, task, "previous attempt")
        append_log(workbench, {"kind": "accepted" if commit_code == 0 else "commit-failed", "item": item.id,
                               "commitExit": commit_code, "commitTail": tail(commit_log, 8)})
        return "accepted" if commit_code == 0 else "hard_block"
    excluded: set[str] = set()
    failures: list[dict] = []
    model = choose_candidate(item, log, excluded, rng)
    same_retries = infra_retries = 0
    for attempt in range(1, item.attempts + 1):
        if model is None:
            break
        stamp = job_suffix()
        prompt = attempt_prompt(workbench, item, failures, attempt)
        started, launched_at = time.monotonic(), time.time()
        code, worker_log = run_in_unit(
            f"cont-{item.id}-{attempt}-{stamp}", task,
            ["bash", str(workbench / "probes" / "delegate.sh"), str(workbench), item.id, model, str(prompt), str(item.max_turns)],
            network="host", secrets=("THYROX_OPENAI_COMPAT_API_KEY",))
        elapsed = time.monotonic() - started
        # El stderr del trabajador sólo es evidencia si lo escribió ESTE intento; uno
        # viejo de otra ejecución clasificaría con un error que ya no ocurre.
        stderr_file = workbench / "outputs" / f"{item.id}-{model}.stderr.log"
        fresh = stderr_file.is_file() and stderr_file.stat().st_mtime >= launched_at
        stderr_tail = tail(stderr_file.read_text(errors="replace")) if fresh else tail(worker_log)
        verify_code, verify_log = run_in_unit(f"cont-{item.id}-{attempt}-verify-{stamp}", task, ["bash", "-c", item.verify])
        evidence = Evidence(item=item.id, model=model, exit=code, stderr_tail=stderr_tail, verify_exit=verify_code,
                            verify_tail=tail(verify_log), elapsed_seconds=round(elapsed, 1),
                            findings=read_findings(workbench, item))
        outcome, source = classify(evidence, learned)
        for finding in evidence.findings:
            append_log(workbench, {"kind": "non_blocking_finding", "item": item.id, "model": model, **finding})
        step = transition(outcome, same_retries, infra_retries)
        append_log(workbench, {"kind": "attempt", "item": item.id, "attempt": attempt, "model": model,
                               "taskClass": item.task_class, "outcome": outcome, "source": source, "exit": code,
                               "verifyExit": verify_code, "elapsedSeconds": evidence.elapsed_seconds,
                               "stderrTail": stderr_tail[-600:],
                               "transition": step, "orphans": reconcile_orphans()})
        if step == "commit":
            commit_code, commit_log = commit_item(workbench, item, task, model)
            append_log(workbench, {"kind": "accepted" if commit_code == 0 else "commit-failed", "item": item.id,
                                   "model": model, "commitExit": commit_code, "commitTail": tail(commit_log, 8)})
            return "accepted" if commit_code == 0 else "hard_block"
        if step == "stop":
            break
        failures.append({"model": model, "outcome": outcome, "exit": code, "verifyExit": verify_code,
                         "verifyTail": tail(verify_log, 15)})
        if step == "retry":
            if outcome == "infrastructure_failure":
                infra_retries += 1
            else:
                same_retries += 1
            continue
        excluded.add(model)
        same_retries = 0
        model = choose_candidate(item, log, excluded, rng)
    append_log(workbench, {"kind": "hard_block", "item": item.id,
                           "reason": "sin candidato permitido" if model is None else "presupuesto de intentos agotado"})
    return "hard_block"


def commit_item(workbench: Path, item: PlanItem, task: str, model: str) -> tuple[int, str]:
    """Commit por pathspec de lo que el ítem posee más el banco, y push; en una unidad con red."""
    paths = " ".join(f"'{path}'" for path in (*item.owned, str(workbench.relative_to(ROOT))))
    script = f"""set -uo pipefail
cd {ROOT}
git add -N -- {paths} 2>/dev/null || true
changed="$(git status --porcelain -- {paths} | wc -l)"
[ "$changed" -gt 0 ] || {{ echo "sin cambios que commitear"; exit 0; }}
git commit -q -m "Accept {item.id} of {task} from the continuation controller" \\
  -m "Delegated to {model}; accepted by its declared verification." -- {paths} || exit 1
for i in 1 2 3 4; do git push -q origin HEAD && exit 0; sleep $((2**i)); done
exit 1
"""
    return run_in_unit(f"cont-{item.id}-commit-{job_suffix()}", task, ["bash", "-c", script], network="host")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("run", "next"):
        command = sub.add_parser(name)
        command.add_argument("workbench", type=Path)
        command.add_argument("--task", default=os.environ.get("THYROX_CONTINUATION_TASK", ""))
        command.add_argument("--max-items", type=int, default=0)
        command.add_argument("--seed", type=int, default=None)
        command.add_argument("--after", default=None, help="espera a que este trabajo de thyrox-bg se asiente antes de empezar")
    args = parser.parse_args(argv)
    workbench = args.workbench.resolve()
    plan = load_plan(workbench)
    if args.command == "next":
        item = next_item(plan, read_log(workbench))
        print(item.id if item else "plan completo")
        return 0
    if not re.fullmatch(r"TASK-[A-Z]+-\d{4}", args.task):
        print("task_continuation: --task TASK-<CAPA>-NNNN es obligatorio", file=sys.stderr)
        return 2
    if args.after:
        wait_for_job(args.after)
    rng = random.Random(args.seed)
    learned = learned_classifier_from_environment()
    append_log(workbench, {"kind": "start", "orphans": reconcile_orphans()})
    done = 0
    # El plan se relee en cada vuelta: un ítem declarado mientras corre se consume en su orden.
    while (item := next_item(load_plan(workbench), read_log(workbench))) is not None:
        if run_item(workbench, item, args.task, rng, learned) == "hard_block":
            print(f"task_continuation: hard_block en {item.id}; evidencia en outputs/continuation.jsonl", file=sys.stderr)
            return 3
        done += 1
        if args.max_items and done >= args.max_items:
            break
    print("plan completo" if next_item(load_plan(workbench), read_log(workbench)) is None else f"{done} ítem(s) aceptado(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
