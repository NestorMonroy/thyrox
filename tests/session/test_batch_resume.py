"""Un banco se reanuda sólo con el repositorio y el propio banco.

Simula lo que hace una compactación de la sesión: desaparece la conversación y
desaparece ``/tmp/claude-*``. Un proceso nuevo, sin memoria del anterior,
reanuda con los mecanismos que ya existen: ``task_continuation next`` deriva la
frontera de ``plan.jsonl`` + ``outputs/continuation.jsonl``, el ``verify`` de
cada ítem vuelve a comprobar su evidencia, y ``check_durable_path_ownership``
mide que ninguna referencia durable apunte a una raíz efímera.

Anulación: la evidencia de T001 sólo vivía en ``/tmp``. Borrado ``/tmp``, su
``verify`` falla y el gate de rutas nombra el campo.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def fresh_process(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    """Un proceso nuevo: nada de este intérprete ni de la conversación llega a él."""
    return subprocess.run(list(args), capture_output=True, text=True, cwd=cwd,
                          env={"PYTHONPATH": str(ROOT / "src"), "PATH": "/usr/bin:/bin", "THYROX_ROOT": str(ROOT)})


def build_workbench(base: Path, t001_evidence: str) -> Path:
    workbench = base / "batch-20261002T000000"
    (workbench / "outputs").mkdir(parents=True)
    plan = [
        {"id": "T001", "prompt": "tasks/T001.md", "verify": f"test -s {t001_evidence}", "candidates": [], "dependsOn": []},
        {"id": "T002", "prompt": "tasks/T002.md", "verify": "test -s outputs/T002.json", "candidates": [], "dependsOn": ["T001"]},
        {"id": "T003", "prompt": "tasks/T003.md", "verify": "test -s outputs/T003.json", "candidates": [], "dependsOn": ["T002"]},
    ]
    (workbench / "plan.jsonl").write_text("".join(json.dumps(row) + "\n" for row in plan))
    log = [{"kind": "start"}, {"kind": "accepted", "item": "T001", "evidence": [t001_evidence]}]
    (workbench / "outputs" / "continuation.jsonl").write_text("".join(json.dumps(row) + "\n" for row in log))
    return workbench


def item_verify(workbench: Path, item: str) -> int:
    rows = [json.loads(line) for line in (workbench / "plan.jsonl").read_text().splitlines()]
    command = next(row["verify"] for row in rows if row["id"] == item)
    return fresh_process("bash", "-c", command, cwd=workbench).returncode


def gate(workbench: Path) -> subprocess.CompletedProcess[str]:
    return fresh_process(sys.executable, str(ROOT / "src" / "verify" / "check_durable_path_ownership.py"), str(workbench))


def frontier(workbench: Path) -> str:
    return fresh_process(sys.executable, "-m", "session.task_continuation", "next", str(workbench),
                         "--task", "TASK-THYROX-0001").stdout.strip()


print("== 1. evidencia en el banco: la reanudación sigue en la tarea correcta ==")
with tempfile.TemporaryDirectory() as tmp:
    session = Path(tempfile.mkdtemp(prefix="claude-resume-test-"))
    (session / "scratch.txt").write_text("estado de la sesión\n")
    workbench = build_workbench(Path(tmp), "outputs/T001.json")
    (workbench / "outputs" / "T001.json").write_text('{"passed": true}\n')
    shutil.rmtree(session)
    check("la frontera es T002", "T002", frontier(workbench))
    check("el verify de T001 sigue pasando", 0, item_verify(workbench, "T001"))
    check("el gate de rutas pasa", 0, gate(workbench).returncode)

print("== 2. anulación: la evidencia de T001 sólo vivía en /tmp ==")
with tempfile.TemporaryDirectory() as tmp:
    session = Path(tempfile.mkdtemp(prefix="claude-resume-test-"))
    (session / "T001.json").write_text('{"passed": true}\n')
    workbench = build_workbench(Path(tmp), str(session / "T001.json"))
    check("antes de borrar /tmp su verify pasa", 0, item_verify(workbench, "T001"))
    shutil.rmtree(session)
    check("borrado /tmp, el verify de T001 falla", True, item_verify(workbench, "T001") != 0)
    ran = gate(workbench)
    check("el gate de rutas falla", 1, ran.returncode)
    check("y nombra el verify del plan", True, "plan.jsonl: verify" in ran.stdout)
    check("y la evidencia del registro", True, "outputs/continuation.jsonl: evidence" in ran.stdout)

print("== 3. un guion del banco que cita /tmp/claude- ==")
with tempfile.TemporaryDirectory() as tmp:
    workbench = build_workbench(Path(tmp), "outputs/T001.json")
    (workbench / "probes").mkdir()
    (workbench / "probes" / "wire.sh").write_text("python3 /tmp/claude-0/scratchpad/wire_gate.py\n")
    ran = gate(workbench)
    check("el gate rehúsa el guion", 1, ran.returncode)
    check("y lo nombra", True, "probes/wire.sh" in ran.stdout)

print("== 4. un respaldo de anulación o una evidencia que dependen del scratchpad de la sesión ==")
with tempfile.TemporaryDirectory() as tmp:
    workbench = build_workbench(Path(tmp), "outputs/T001.json")
    for directory, name, text in (("mutations", "restore.sh", "cp /tmp/claude-0/x/scratchpad/ra.bak src/a.py\n"),
                                  ("evidence", "derive.sh", "cat /home/user/.cache/s/scratchpad/case28.py\n"),
                                  ("experiments", "run.sh", "bash /tmp/claude-0/y/scratchpad/hp-annul.sh\n")):
        (workbench / directory).mkdir()
        (workbench / directory / name).write_text(text)
    ran = gate(workbench)
    check("el gate rehúsa los tres", 1, ran.returncode)
    check("nombra mutations/, evidence/ y experiments/", True,
          all(f"{d}/" in ran.stdout for d in ("mutations", "evidence", "experiments")))
    check("un scratchpad fuera de /tmp también cuenta", True, "evidence/derive.sh" in ran.stdout)

print("== 5. un registro de trabajo cuyo instrumento lee del scratchpad ==")
with tempfile.TemporaryDirectory() as tmp:
    job = Path(tmp) / "annul-20261003T000000"
    job.mkdir()
    (job / "manifest.jsonl").write_text(json.dumps(
        {"kind": "launch", "instrument": "bash /tmp/claude-0/-home-user/168b/scratchpad/anular330.sh"}) + "\n")
    ran = gate(job)
    check("el gate rehúsa el instrumento", 1, ran.returncode)
    check("y nombra el campo", True, "manifest.jsonl: instrument" in ran.stdout)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
