#!/usr/bin/env python3
"""Controlador de continuación: consume el plan declarado de un banco como un DAG.

El banco dice QUÉ se hace (``plan.jsonl``: un lote de ítems, cada uno de su
tarea, con sus dependencias); este controlador sólo elige la TRANSICIÓN
siguiente entre las declaradas. Nunca crea trabajo.

Lote -> frontera -> GNU Parallel -> una unidad por ítem::

    plan.jsonl -> runnable_items (continuation_frontier) -> parallel_map :::: -
      -> run-one <ítem> -> ExecutionAuthorization -> PodmanExecutionPrimitive
      -> ExecutionUnit

La frontera se ESCRIBE en la entrada de GNU Parallel mientras crece: un ítem
dependiente se despacha en cuanto su dependencia se acepta, aunque otros sigan
corriendo. Cuántos corren a la vez lo decide Parallel (su anchura y la admisión
de RAM de ``parallel_map``), no este módulo. La ejecución es concurrente; la
integración no: commit y push de cada ítem pasan por un candado.

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

    bin/task_continuation run <banco> [--task T] [--width N] [--target DIR] [--seed S]
    bin/task_continuation next <banco>        # la frontera actual, sin despachar
    bin/task_continuation run-one <banco> <ítem> ...   # lo que Parallel invoca por ítem
"""
from __future__ import annotations

import argparse
import contextlib
import fcntl
import json
import os
import random
import re
import subprocess
import sys
import time
import zlib
from dataclasses import dataclass, field
from pathlib import Path

from session.continuation_frontier import doomed_items, item_states, runnable_items
from verify.tsc_schedule import posterior

ROOT = Path(os.environ.get("THYROX_ROOT") or Path(__file__).resolve().parents[2])
BG = ["bash", str(ROOT / "bin" / "thyrox-bg")]
EXECUTE = ["bash", str(ROOT / "bin" / "podman-execution-execute")]

OUTCOMES = (
    "success", "provider_transient", "provider_permanent", "task_failure",
    "infrastructure_failure", "stalled", "non_blocking_finding", "hard_block",
    "secret_exposure_detected",
)
#: Resultados que no son responsabilidad del candidato: no mueven su posterior.
NOT_COUNTED = {"provider_transient", "infrastructure_failure", "hard_block", "non_blocking_finding",
               "secret_exposure_detected"}
TRANSIENT_RETRIES = 2
#: Fallos de proveedor que un ítem tolera en total, aparte de su presupuesto de
#: intentos: un 502 no es un juicio sobre la tarea ni sobre el candidato.
TRANSIENT_BUDGET = int(os.environ.get("THYROX_CONTINUATION_TRANSIENT_BUDGET", "12"))
#: Espera entre reintentos por fallo de proveedor, creciente y con techo.
TRANSIENT_BACKOFF_SECONDS = 60
TRANSIENT_BACKOFF_CAP_SECONDS = 600
#: Resultados que agotan el presupuesto de fallos de proveedor y no el de la tarea.
TRANSIENT_OUTCOMES = {"provider_transient", "stalled"}
#: Inyectable en las pruebas.
pause = time.sleep
INFRASTRUCTURE_RETRIES = 1
#: Código de salida con que ``delegate.sh`` declara un trabajador sin actividad medida.
STALLED_EXIT = 125
TIMEOUT_EXIT = 124
#: Las credenciales de un trabajador delegado por defecto: sólo la del proveedor.
DELEGATE_SECRETS = ("THYROX_OPENAI_COMPAT_API_KEY",)
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
    #: Las únicas credenciales que el trabajador recibe, como ExecutionSecret.
    secrets: tuple[str, ...] = DELEGATE_SECRETS
    #: Ítems que tienen que estar aceptados antes de despachar éste.
    depends_on: tuple[str, ...] = ()
    #: Si el ítem escribe en el árbol; uno que sólo lee no choca con nadie.
    mutates: bool = True
    #: "" corre en el checkout; "worktree" en uno propio, integrado al aceptar.
    isolation: str = ""
    #: La tarea a la que pertenece; sus unidades llevan su cita.
    task_id: str = ""
    #: Límites de la unidad del trabajador: pares (cpus|memoryMib|pids, valor).
    resource_profile: tuple[tuple[str, int], ...] = ()


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


ISOLATIONS = ("", "worktree")
RESOURCE_KEYS = ("cpus", "memoryMib", "pids")


def plan_items_from_rows(rows: list[dict], default_task: str = "") -> list[PlanItem]:
    """Los ítems de un plan. Un plan sin ``dependsOn`` en NINGUNA fila es el contrato
    heredado —una secuencia en el orden declarado—; en cuanto una fila declara sus
    dependencias, el plan es un DAG y una fila sin la clave no depende de nada."""
    sequential = not any("dependsOn" in row for row in rows)
    items, previous = [], None
    for row in rows:
        isolation = row.get("isolation", "")
        if isolation not in ISOLATIONS:
            raise SystemExit(f"task_continuation: isolation va vacío o \"worktree\", no {isolation!r} ({row['id']})")
        profile = row.get("resourceProfile", {})
        unknown = set(profile) - set(RESOURCE_KEYS)
        if unknown:
            raise SystemExit(f"task_continuation: resourceProfile no admite {sorted(unknown)} ({row['id']})")
        depends = tuple(row.get("dependsOn", ())) if not sequential else ((previous,) if previous else ())
        items.append(PlanItem(
            id=row["id"], prompt=row["prompt"], verify=row["verify"], candidates=tuple(row["candidates"]),
            task_class=row.get("taskClass", "analisis"), owned=tuple(row.get("owned", ())),
            max_turns=int(row.get("maxTurns", 150)), attempts=int(row.get("attempts", 4)),
            secrets=tuple(row.get("secrets", DELEGATE_SECRETS)), depends_on=depends,
            mutates=bool(row.get("mutates", True)), isolation=isolation,
            task_id=row.get("taskId", default_task),
            resource_profile=tuple((key, int(profile[key])) for key in RESOURCE_KEYS if key in profile),
        ))
        previous = row["id"]
    known = {entry.id for entry in items}
    if len(known) != len(items):
        raise SystemExit("task_continuation: ids de ítem repetidos en el plan")
    for entry in items:
        missing = set(entry.depends_on) - known
        if missing:
            raise SystemExit(f"task_continuation: {entry.id} depende de ítems no declarados: {sorted(missing)}")
    return items


def load_plan(workbench: Path, default_task: str = "") -> list[PlanItem]:
    plan = workbench / "plan.jsonl"
    if not plan.is_file():
        raise SystemExit(f"task_continuation: el banco no declara plan: {plan}")
    rows = [json.loads(line) for line in plan.read_text().splitlines() if line.strip()]
    if not rows:
        raise SystemExit(f"task_continuation: plan vacío: {plan}")
    return plan_items_from_rows(rows, default_task)


def read_log(workbench: Path) -> list[dict]:
    path = workbench / "outputs" / "continuation.jsonl"
    if not path.is_file():
        return []
    # Candado compartido: con N ítems escribiendo, una línea a medio escribir no se lee.
    with path.open() as handle:
        fcntl.flock(handle, fcntl.LOCK_SH)
        text = handle.read()
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def append_log(workbench: Path, row: dict) -> None:
    path = workbench / "outputs" / "continuation.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {"utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "epoch": round(time.time(), 3), **row}
    with path.open("a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")


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

#: Un trabajador delegado no ve el `.env` del árbol: bun lo carga solo y las
#: herramientas del trabajador heredan sus secretos, que acaban en la
#: conversación que viaja al proveedor. Su credencial llega como secreto montado.
ENV_FILE_MASK = f"/dev/null:{ROOT}/.env:ro"


LIMIT_FLAGS = {"cpus": "--cpus", "memoryMib": "--memory-mib", "pids": "--pids"}


def unit_start_argv(name: str, task: str, argv: list[str], network: str | None = None,
                    secrets: tuple[str, ...] = (), mounts: tuple[str, ...] = (),
                    workdir: str | None = None, resources: tuple[tuple[str, int], ...] = ()) -> list[str]:
    """La orden de thyrox-bg que lanza ``argv`` en una ExecutionUnit."""
    start = [*BG, "start", name, "--grace", "0", "--task", task, "--kind", "maintenance"]
    if network:
        start += ["--network", network]
    if workdir:
        start += ["--workdir", workdir]
    for key, value in resources:
        start += [LIMIT_FLAGS[key], str(value)]
    for secret in secrets:
        start += ["--secret-from-env", secret]
    for mount in mounts:
        start += ["--mount", mount]
    return [*start, "--", *argv]


#: Un nombre de clave que declara un secreto. El inventario son las claves de
#: `.env.example` que lo cumplen: se trabaja por NOMBRE, nunca con sus valores.
SECRET_NAME_PATTERN = re.compile(r"(TOKEN|KEY|PASSWORD|SECRET|_PAT|CREDENTIAL)")
REDACTED = "[REDACTADO]"
QUARANTINE_DIR = ROOT / ".thyrox" / "runtime" / "quarantine"


def declared_secret_names(example: Path | None = None) -> tuple[str, ...]:
    """Las claves de `.env.example` cuyo nombre declara un secreto."""
    text = (example or ROOT / ".env.example").read_text()
    keys = (match.group(1) for match in re.finditer(r"(?m)^([A-Z][A-Z0-9_]*)=", text))
    return tuple(sorted({key for key in keys if SECRET_NAME_PATTERN.search(key)}))


def _assignment_pattern(names: tuple[str, ...]) -> re.Pattern[str]:
    # `NOMBRE=valor` en texto o escapado en JSON; el valor es lo que sigue hasta un
    # separador. Lo ya redactado no cuenta.
    alternatives = "|".join(re.escape(name) for name in names)
    return re.compile(rf"(?<![A-Z0-9_])({alternatives})=(?!\[REDACTADO\])([^\s\\\\\"']{{6,}})")


def exposed_secret_names(text: str, names: tuple[str, ...]) -> set[str]:
    """Qué secretos declarados aparecen con valor en ``text``."""
    return {match.group(1) for match in _assignment_pattern(names).finditer(text)} if names else set()


def redact_secret_assignments(text: str, names: tuple[str, ...]) -> str:
    return _assignment_pattern(names).sub(lambda match: f"{match.group(1)}={REDACTED}", text) if names else text


def exposed_credentials(workbench: Path) -> set[str]:
    """Las credenciales que el banco registra como expuestas: no se entregan a trabajadores."""
    path = workbench / "credential-rotation.tsv"
    if not path.is_file():
        return set()
    rows = (line.split("\t") for line in path.read_text().splitlines()[1:] if line.strip())
    return {row[0] for row in rows if len(row) > 1 and row[1] == "exposed"}


def mark_exposed(workbench: Path, names: set[str], item: str) -> None:
    path = workbench / "credential-rotation.tsv"
    if not path.is_file():
        path.write_text("credential\trotation\tsince\tnote\n")
    already = exposed_credentials(workbench)
    with path.open("a") as handle:
        for name in sorted(names - already):
            handle.write(f"{name}\texposed\t{time.strftime('%Y-%m-%d', time.gmtime())}\t"
                         f"impresa por un trabajador de {item}; no se entrega a trabajadores\n")


def contain_secret_exposure(workbench: Path, item: str, model: str, names: tuple[str, ...]) -> set[str]:
    """``secret_exposure_detected``: aparta, redacta y verifica las salidas de un trabajador.

    Cada archivo con un secreto declarado se copia íntegro a la cuarentena (ignorada
    por git, 0600) y se redacta en su sitio; luego se vuelve a medir. Devuelve los
    nombres expuestos; un archivo que siga conteniéndolos tras redactar es un error.
    """
    outputs = workbench / "outputs"
    candidates = [*outputs.glob(f"{item}-{model}.transcript/**/*.jsonl"),
                  *outputs.glob(f"{item}-{model}.stream.jsonl"), *outputs.glob(f"{item}-{model}.stderr.log")]
    found: set[str] = set()
    for path in candidates:
        text = path.read_text(errors="replace")
        hit = exposed_secret_names(text, names)
        if not hit:
            continue
        found |= hit
        target = QUARANTINE_DIR / f"{item}-{model}-{job_suffix()}" / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
        target.chmod(0o600)
        path.write_text(redact_secret_assignments(text, names))
        if exposed_secret_names(path.read_text(errors="replace"), names):
            raise RuntimeError(f"la redacción no dejó limpio {path}")
    return found


def run_in_unit(name: str, task: str, argv: list[str], network: str | None = None,
                secrets: tuple[str, ...] = (), mounts: tuple[str, ...] = (),
                workdir: str | None = None, resources: tuple[tuple[str, int], ...] = ()) -> tuple[int, str]:
    """Lanza ``argv`` con thyrox-bg en una ExecutionUnit, espera y devuelve (exit, log)."""
    launched = subprocess.run(unit_start_argv(name, task, argv, network, secrets, mounts, workdir, resources),
                              capture_output=True, text=True, cwd=ROOT)
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


def settled_job_dirs() -> list[str]:
    """Registros de trabajos ya asentados, que viajan con el banco que citan.

    Uno vivo (el propio controlador, el commit en curso) se queda fuera: su log
    sigue creciendo. Se mide aquí, en el anfitrión, porque dentro de una unidad
    `thyrox-bg status` no ve los PID del anfitrión.
    """
    listing = subprocess.run(["git", "status", "--porcelain", "--", ".claude/jobs"],
                             capture_output=True, text=True, cwd=ROOT).stdout
    dirs = sorted({"/".join(line[3:].split("/")[:3]) for line in listing.splitlines() if line[3:].startswith(".claude/jobs/")})
    return [directory for directory in dirs if not job_is_live(ROOT / directory)]


def job_is_live(directory: Path) -> bool:
    """Un trabajo está vivo si el PID de su registro vive en el anfitrión.

    Se mide por el PID y no por `thyrox-bg status`: el controlador corre él mismo
    como trabajo, y desde dentro del suyo el ledger no lo daba por vivo —su propio
    registro entró en un commit y el gate de bancos lo rechazó—.
    """
    pid_file = directory / "outputs" / "pid"
    try:
        pid = int(pid_file.read_text().split()[0])
    except (OSError, ValueError, IndexError):
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


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


#: El árbol de git donde se integra lo aceptado; ``--target`` lo sustituye (p. ej. un
#: repositorio de prueba). Por defecto, el propio thyrox.
TARGET = ROOT
#: Hogar de los worktrees y candados del controlador: runtime ignorado por git.
RUNTIME = ROOT / ".thyrox" / "runtime" / "continuation"
INTEGRATION_CONFLICT_EXIT = 10
OUTSIDE_DECLARED_EXIT = 11


@contextlib.contextmanager
def integration_lock(workbench: Path):
    """La sección crítica de la integración: un commit y un push a la vez por banco.

    La ejecución de los ítems es concurrente; su integración no puede serlo —dos
    commits en el mismo árbol chocan en ``index.lock`` y dos pushes se pisan—.
    """
    RUNTIME.mkdir(parents=True, exist_ok=True)
    with (RUNTIME / f"{workbench.name}.integration.lock").open("a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def prepare_worktree(item: PlanItem, task: str, workbench: Path) -> tuple[int, str, Path]:
    """Un worktree propio del ítem desde el HEAD del destino, creado en una unidad."""
    tree = RUNTIME / "worktrees" / workbench.name / f"{item.id}-{job_suffix()}"
    script = f"set -euo pipefail\nmkdir -p {tree.parent}\ngit -C {TARGET} worktree add -q --detach {tree} HEAD\n"
    code, log = run_in_unit(f"cont-{item.id}-worktree-{job_suffix()}", task, ["bash", "-c", script])
    return code, log, tree


def accept(workbench: Path, item: PlanItem, task: str, model: str, tree: Path | None) -> tuple[int, str]:
    """Integra lo aceptado bajo el candado: commit en el checkout, o parche del worktree."""
    with integration_lock(workbench):
        if tree is None:
            return commit_item(workbench, item, task, model)
        return integrate_worktree(workbench, item, task, model, tree)


def run_item(workbench: Path, item: PlanItem, task: str, rng: random.Random, learned) -> str:
    """Corre un ítem hasta aceptarlo o agotar su presupuesto. Devuelve ``accepted`` o ``hard_block``."""
    task = item.task_id or task
    log = read_log(workbench)
    # Una credencial expuesta no se entrega a ningún trabajador: el ítem que la
    # necesita queda bloqueado SOLO; los independientes siguen.
    needed_exposed = exposed_credentials(workbench) & set(item.secrets)
    if needed_exposed:
        append_log(workbench, {"kind": "blocked", "item": item.id, "reason": "credencial expuesta",
                               "credentials": sorted(needed_exposed)})
        return "blocked"
    tree: Path | None = None
    if item.isolation == "worktree":
        code, worktree_log, tree = prepare_worktree(item, task, workbench)
        if code != 0:
            append_log(workbench, {"kind": "hard_block", "item": item.id, "reason": "no se pudo preparar el worktree",
                                   "tail": tail(worktree_log, 8)})
            return "hard_block"
        append_log(workbench, {"kind": "worktree", "item": item.id, "path": str(tree)})
    workdir = str(tree) if tree else None
    # Reanudar: si lo declarado ya se verifica (un intento previo, o un controlador
    # que murió antes de commitear), se acepta sin volver a despachar.
    stamp = job_suffix()
    verify_code, verify_log = run_in_unit(f"cont-{item.id}-preverify-{stamp}", task, ["bash", "-c", item.verify],
                                          workdir=workdir)
    if verify_code == 0:
        append_log(workbench, {"kind": "attempt", "item": item.id, "attempt": 0, "model": None, "taskClass": item.task_class,
                               "outcome": "success", "source": "preexisting", "verifyExit": 0, "transition": "commit"})
        commit_code, commit_log = accept(workbench, item, task, "previous attempt", tree)
        append_log(workbench, {"kind": "accepted" if commit_code == 0 else "commit-failed", "item": item.id,
                               "commitExit": commit_code, "commitTail": tail(commit_log, 8)})
        return "accepted" if commit_code == 0 else "hard_block"
    excluded: set[str] = set()
    # Apartados por fallos de proveedor: vuelven a la rotación cuando todos lo están.
    transient_excluded: set[str] = set()
    failures: list[dict] = []
    model = choose_candidate(item, log, excluded, rng)
    same_retries = infra_retries = judged = transients = attempt = 0
    reason = "presupuesto de intentos agotado"
    while True:
        if model is None and transient_excluded and transients < TRANSIENT_BUDGET:
            pause(min(TRANSIENT_BACKOFF_SECONDS * transients, TRANSIENT_BACKOFF_CAP_SECONDS))
            excluded -= transient_excluded
            transient_excluded.clear()
            model = choose_candidate(item, log, excluded, rng)
        if model is None:
            reason = "sin candidato permitido"
            break
        if judged >= item.attempts:
            break
        if transients >= TRANSIENT_BUDGET:
            reason = "presupuesto de fallos de proveedor agotado"
            break
        attempt += 1
        stamp = job_suffix()
        prompt = attempt_prompt(workbench, item, failures, attempt)
        started, launched_at = time.monotonic(), time.time()
        code, worker_log = run_in_unit(
            f"cont-{item.id}-{attempt}-{stamp}", task,
            ["bash", str(workbench / "probes" / "delegate.sh"), str(workbench), item.id, model, str(prompt), str(item.max_turns)],
            network="host", secrets=item.secrets, mounts=(ENV_FILE_MASK,), workdir=workdir,
            resources=item.resource_profile)
        elapsed = time.monotonic() - started
        # El stderr del trabajador sólo es evidencia si lo escribió ESTE intento; uno
        # viejo de otra ejecución clasificaría con un error que ya no ocurre.
        stderr_file = workbench / "outputs" / f"{item.id}-{model}.stderr.log"
        fresh = stderr_file.is_file() and stderr_file.stat().st_mtime >= launched_at
        stderr_tail = tail(stderr_file.read_text(errors="replace")) if fresh else tail(worker_log)
        verify_code, verify_log = run_in_unit(f"cont-{item.id}-{attempt}-verify-{stamp}", task, ["bash", "-c", item.verify],
                                              workdir=workdir)
        evidence = Evidence(item=item.id, model=model, exit=code, stderr_tail=stderr_tail, verify_exit=verify_code,
                            verify_tail=tail(verify_log), elapsed_seconds=round(elapsed, 1),
                            findings=read_findings(workbench, item))
        outcome, source = classify(evidence, learned)
        leaked = contain_secret_exposure(workbench, item.id, model, declared_secret_names())
        if leaked:
            # secret_exposure_detected: el trabajador ya terminó; sus salidas quedan en
            # cuarentena y redactadas, y la credencial pasa a expuesta.
            mark_exposed(workbench, leaked, item.id)
            append_log(workbench, {"kind": "secret_exposure", "item": item.id, "model": model,
                                   "credentials": sorted(leaked)})
            outcome, source = "secret_exposure_detected", "rule"
            if leaked & set(item.secrets):
                append_log(workbench, {"kind": "blocked", "item": item.id, "reason": "credencial expuesta",
                                       "credentials": sorted(leaked & set(item.secrets))})
                return "blocked"
        for finding in evidence.findings:
            append_log(workbench, {"kind": "non_blocking_finding", "item": item.id, "model": model, **finding})
        step = transition(outcome, same_retries, infra_retries)
        append_log(workbench, {"kind": "attempt", "item": item.id, "attempt": attempt, "model": model,
                               "taskClass": item.task_class, "outcome": outcome, "source": source, "exit": code,
                               "verifyExit": verify_code, "elapsedSeconds": evidence.elapsed_seconds,
                               "stderrTail": stderr_tail[-600:],
                               "transition": step, "orphans": reconcile_orphans()})
        if step == "commit":
            commit_code, commit_log = accept(workbench, item, task, model, tree)
            append_log(workbench, {"kind": "accepted" if commit_code == 0 else "commit-failed", "item": item.id,
                                   "model": model, "commitExit": commit_code, "commitTail": tail(commit_log, 8)})
            return "accepted" if commit_code == 0 else "hard_block"
        if step == "stop":
            break
        if outcome in TRANSIENT_OUTCOMES:
            transients += 1
        else:
            judged += 1
        failures.append({"model": model, "outcome": outcome, "exit": code, "verifyExit": verify_code,
                         "verifyTail": tail(verify_log, 15)})
        if step == "retry":
            if outcome == "infrastructure_failure":
                infra_retries += 1
            else:
                same_retries += 1
                pause(min(TRANSIENT_BACKOFF_SECONDS * transients, TRANSIENT_BACKOFF_CAP_SECONDS))
            continue
        excluded.add(model)
        if outcome in TRANSIENT_OUTCOMES:
            transient_excluded.add(model)
        same_retries = 0
        model = choose_candidate(item, log, excluded, rng)
    append_log(workbench, {"kind": "hard_block", "item": item.id, "reason": reason,
                           "judgedAttempts": judged, "providerFailures": transients})
    return "hard_block"


def evidence_paths(workbench: Path) -> list[str]:
    """El banco y los registros de trabajo asentados viajan con el commit, si viven en el destino."""
    if not workbench.is_relative_to(TARGET):
        return []
    paths = [str(workbench.relative_to(TARGET))]
    return paths + (settled_job_dirs() if TARGET == ROOT else [])


COMMIT_AND_PUSH = """git add -N -- $paths 2>/dev/null || true
changed="$(git status --porcelain -- $paths | wc -l)"
[ "$changed" -gt 0 ] || {{ echo "sin cambios que commitear"; exit 0; }}
git commit -q -m "Accept {item} of {task} from the continuation controller" \\
  -m "Delegated to {model}; accepted by its declared verification." -- $paths || exit 1
git remote get-url origin >/dev/null 2>&1 || {{ echo "sin origin: commit local"; exit 0; }}
for i in 1 2 3 4; do git push -q origin HEAD && exit 0; sleep $((2**i)); done
exit 1
"""


def commit_item(workbench: Path, item: PlanItem, task: str, model: str) -> tuple[int, str]:
    """Commit por pathspec de lo que el ítem posee más el banco, y push; en una unidad con red."""
    paths = " ".join((*item.owned, *evidence_paths(workbench)))
    script = f"""set -uo pipefail
cd {TARGET}
paths="{paths}"
""" + COMMIT_AND_PUSH.format(item=item.id, task=task, model=model)
    return run_in_unit(f"cont-{item.id}-commit-{job_suffix()}", task, ["bash", "-c", script], network="host")


def integrate_worktree(workbench: Path, item: PlanItem, task: str, model: str, tree: Path) -> tuple[int, str]:
    """Aplica el parche del worktree verificado sobre el destino actual, en una unidad.

    Un parche que no aplica es un conflicto de integración: el ítem falla con su
    motivo y su worktree se conserva. Nunca se resuelve con un modelo. Un archivo
    fuera de lo que el ítem declaró (``owned``) tampoco se integra.
    """
    outputs = workbench / "outputs"
    patch, files = outputs / f"{item.id}.patch", outputs / f"{item.id}.files"
    script = f"""set -uo pipefail
git -C {tree} add -A
git -C {tree} diff --cached --binary HEAD > {patch}
git -C {tree} diff --cached --name-only HEAD > {files}
owned="{' '.join(item.owned)}"
if [ -n "$owned" ]; then
  while read -r f; do
    inside=0; for o in $owned; do case "$f" in "$o"|"$o"/*) inside=1 ;; esac; done
    [ "$inside" = 1 ] || {{ echo "fuera de lo declarado: $f"; exit {OUTSIDE_DECLARED_EXIT}; }}
  done < {files}
fi
cd {TARGET}
if [ -s {patch} ]; then
  git apply --check {patch} || {{ echo "conflicto de integración: el parche no aplica sobre el destino"; exit {INTEGRATION_CONFLICT_EXIT}; }}
  git apply {patch}
fi
paths="$(tr '\\n' ' ' < {files}) {' '.join(evidence_paths(workbench))}"
""" + COMMIT_AND_PUSH.format(item=item.id, task=task, model=model).replace(
        'git remote get-url origin', f'git worktree remove --force {tree}\ngit remote get-url origin')
    return run_in_unit(f"cont-{item.id}-integrate-{job_suffix()}", task, ["bash", "-c", script], network="host")


FRONTIER_POLL_SECONDS = 2.0


def item_seed(seed: int | None, item_id: str) -> int | None:
    """Cada ítem muestrea con su propia semilla: los procesos de Parallel no comparten generador."""
    return None if seed is None else seed ^ zlib.crc32(item_id.encode())


def run_one(workbench: Path, item_id: str, task: str, seed: int | None) -> int:
    """Lo que GNU Parallel ejecuta por ítem: corre ese ítem y deja SIEMPRE su asiento."""
    plan = {entry.id: entry for entry in load_plan(workbench, task)}
    if item_id not in plan:
        append_log(workbench, {"kind": "hard_block", "item": item_id, "reason": "ítem no declarado en el plan"})
        return 3
    try:
        outcome = run_item(workbench, plan[item_id], task, random.Random(item_seed(seed, item_id)),
                           learned_classifier_from_environment())
    except Exception as error:  # el asiento es la garantía; sin él la frontera esperaría para siempre
        append_log(workbench, {"kind": "hard_block", "item": item_id, "reason": f"excepción: {error!r}"})
        return 3
    return {"accepted": 0, "blocked": 4}.get(outcome, 3)


def joblog_finished(joblog: Path) -> dict[str, int]:
    """Ítems cuyo proceso de Parallel ya terminó, con su exit, leídos del ``--joblog``."""
    finished: dict[str, int] = {}
    if not joblog.is_file():
        return finished
    for line in joblog.read_text().splitlines()[1:]:
        columns = line.split("\t")
        if len(columns) < 9:
            continue
        words = columns[8].split()
        if "run-one" in words and len(words) > words.index("run-one") + 2:
            finished[words[words.index("run-one") + 2]] = int(columns[6])
    return finished


def frontier_command(workbench: Path, task: str, width: int, seed: int | None) -> list[str]:
    """El despacho: ``parallel_map`` leyendo la frontera de su stdin (``:::: -``)."""
    one = ["bash", str(ROOT / "bin" / "task_continuation"), "run-one", str(workbench), "{}", "--target", str(TARGET)]
    if task:
        one += ["--task", task]
    if seed is not None:
        one += ["--seed", str(seed)]
    return ["bash", str(ROOT / "bin" / "parallel_map"), "--width", str(width), *one, "::::", "-"]


def settle_doomed(workbench: Path, plan: list[PlanItem], exposed: set[str]) -> None:
    for entry, reason in doomed_items(plan, item_states(read_log(workbench)), exposed):
        kind = "blocked" if reason.startswith("credencial") else "dependency_blocked"
        append_log(workbench, {"kind": kind, "item": entry.id, "reason": reason})


def run_frontier(workbench: Path, task: str, width: int, seed: int | None) -> int:
    """Materializa la frontera con GNU Parallel hasta que no quede nada despachable ni en curso.

    El controlador sólo calcula el conjunto y lo escribe en la entrada de
    Parallel; cada línea es un ítem y Parallel decide cuándo arranca según su
    anchura. Una frontera vacía con ítems en curso espera a que alguno se asiente.
    """
    RUNTIME.mkdir(parents=True, exist_ok=True)
    joblog = RUNTIME / f"{workbench.name}-{job_suffix()}.joblog"
    command = frontier_command(workbench, task, width, seed)
    append_log(workbench, {"kind": "dispatcher", "command": command, "width": width, "joblog": str(joblog)})
    env = {**os.environ, "PARALLEL": f"--joblog {joblog}"}
    parallel = subprocess.Popen(command, stdin=subprocess.PIPE, text=True, cwd=ROOT, env=env)
    while True:
        plan = load_plan(workbench, task)
        exposed = exposed_credentials(workbench)
        settle_doomed(workbench, plan, exposed)
        states = item_states(read_log(workbench))
        for item_id, exit_code in joblog_finished(joblog).items():
            if states.get(item_id) == "running":
                append_log(workbench, {"kind": "hard_block", "item": item_id,
                                       "reason": f"el proceso del ítem terminó sin asentarse (exit {exit_code})"})
        states = item_states(read_log(workbench))
        frontier = runnable_items(plan, states, exposed)
        for entry in frontier:
            append_log(workbench, {"kind": "dispatched", "item": entry.id, "taskId": entry.task_id or task})
            parallel.stdin.write(entry.id + "\n")
            parallel.stdin.flush()
        in_flight = [entry.id for entry in plan if states.get(entry.id) == "running"]
        if not frontier and not in_flight:
            break
        if parallel.poll() is not None:
            for item_id in in_flight:
                append_log(workbench, {"kind": "hard_block", "item": item_id, "reason": "GNU Parallel salió con el ítem en curso"})
            break
        time.sleep(FRONTIER_POLL_SECONDS)
    parallel.stdin.close()
    parallel.wait()
    states = item_states(read_log(workbench))
    settled = {state: sorted(i for i, s in states.items() if s == state) for state in ("accepted", "blocked", "failed")}
    append_log(workbench, {"kind": "end", **settled})
    pending = [entry.id for entry in load_plan(workbench, task) if entry.id not in states]
    print(f"aceptados={len(settled['accepted'])} bloqueados={len(settled['blocked'])} "
          f"fallidos={len(settled['failed'])} sin-despachar={len(pending)}")
    return 3 if settled["failed"] or pending else 0


def main(argv: list[str] | None = None) -> int:
    global TARGET
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("run", "next", "run-one"):
        command = sub.add_parser(name)
        command.add_argument("workbench", type=Path)
        if name == "run-one":
            command.add_argument("item")
        command.add_argument("--task", default=os.environ.get("THYROX_CONTINUATION_TASK", ""),
                             help="tarea de los ítems que no declaran taskId")
        command.add_argument("--target", type=Path, default=ROOT, help="árbol de git donde se integra")
        command.add_argument("--seed", type=int, default=None)
        if name == "run":
            command.add_argument("--width", type=int, default=0, help="anchura de GNU Parallel; 0 = la de width_cap")
            command.add_argument("--after", default=None, help="espera a que este trabajo de thyrox-bg se asiente antes de empezar")
    args = parser.parse_args(argv)
    workbench = args.workbench.resolve()
    TARGET = args.target.resolve()
    plan = load_plan(workbench, args.task)
    if args.command == "next":
        states = item_states(read_log(workbench))
        frontier = runnable_items(plan, states, exposed_credentials(workbench))
        print(" ".join(entry.id for entry in frontier) if frontier else
              ("plan completo" if all(states.get(e.id) == "accepted" for e in plan) else "frontera vacía"))
        return 0
    untasked = [entry.id for entry in plan if not re.fullmatch(r"TASK-[A-Z]+-\d{4}", entry.task_id or "")]
    if untasked:
        print(f"task_continuation: sin tarea TASK-<CAPA>-NNNN (taskId o --task): {', '.join(untasked)}", file=sys.stderr)
        return 2
    if args.command == "run-one":
        return run_one(workbench, args.item, args.task, args.seed)
    if args.after:
        wait_for_job(args.after)
    gate_task = args.task or plan[0].task_id
    append_log(workbench, {"kind": "start", "orphans": reconcile_orphans()})
    # Antes de despachar: una unidad con la misma forma que la de un trabajador no
    # puede heredar ningún secreto que no esté declarado. Sin eso no hay despacho seguro.
    gate_code, gate_log = run_in_unit(
        f"cont-secret-gate-{job_suffix()}", gate_task,
        ["bash", str(ROOT / "src" / "session" / "worker_secret_inheritance.sh"), *DELEGATE_SECRETS],
        network="host", secrets=DELEGATE_SECRETS, mounts=(ENV_FILE_MASK,))
    append_log(workbench, {"kind": "secret_inheritance_gate", "exit": gate_code, "sources": tail(gate_log, 9)})
    if gate_code != 0:
        print("task_continuation: hard_block — un trabajador heredaría secretos no declarados", file=sys.stderr)
        return 3
    if args.width:
        width = args.width
    else:
        from session.parallel import width_cap
        width = width_cap()
    return run_frontier(workbench, args.task, width, args.seed)


if __name__ == "__main__":
    sys.exit(main())
