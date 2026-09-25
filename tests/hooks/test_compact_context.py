"""Suite del hook que restaura el estado de trabajo tras compactar.

La restauración vive en ``SessionStart`` con ``source == "compact"`` y no en
``PostCompact``: medido en ``_references/claude-code-bin/2.1.281``
(``BQe``, executePostCompactHooks), la salida de un hook ``PostCompact`` se
devuelve como ``userDisplayMessage`` —la ve el usuario, no el modelo—, así
que un hook ahí nunca devolvería contexto a la sesión.

Tres mitades de juicio, cada una con su anulación: el filtro por ``source``,
la lectura del ledger de trabajos y la ausencia de escrituras (medida por
conducta con ``strace``, no leída del fuente).
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402
from session.job_ledger import JobLedger  # noqa: E402

ROOT = reach.thyrox_root()
passed = failed = 0


def check(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def git(repo: pathlib.Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t",
                    "-c", "commit.gpgsign=false", *args], check=True, capture_output=True)


ENV: dict[str, str] = {}


def run_hook(payload: dict, *args: str) -> dict:
    out = subprocess.run([sys.executable, str(ROOT / "src/hooks/compact_context.py"), *args],
                         input=json.dumps(payload), capture_output=True, text=True,
                         env={**os.environ, **ENV, "PYTHONPATH": str(ROOT / "src")})
    try:
        return json.loads(out.stdout or "null")
    except ValueError:
        return {"stdout": out.stdout, "stderr": out.stderr[-300:]}


with tempfile.TemporaryDirectory() as directory:
    base = pathlib.Path(directory)
    repo = base / "clone-a"
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "commit", "-q", "--allow-empty", "-m", "seed")
    (repo / "in-progress.ts").write_text("x\n")
    # Los hogares llegan por sus constantes, no por argumento: la raíz de los
    # ledgers (`job_ledger.LEDGER_DIR_VAR`) y el banco (`THYROX_WORKBENCH_DIR`).
    ledgers = base / "jobs-ledger"
    JobLedger(ledgers / "session-1").register("suite", base / "suite.log", pid=None)
    workbench = base / "workbench"
    (workbench / "older-question-20260901T000000").mkdir(parents=True)
    (workbench / "current-question-20260925T000000").mkdir()
    os.utime(workbench / "older-question-20260901T000000", (1, 1))
    ENV.update({"THYROX_JOBS_LEDGER_DIR": str(ledgers), "THYROX_WORKBENCH_DIR": str(workbench)})
    args = ("--root", str(repo))

    context = run_hook({"hook_event_name": "SessionStart", "source": "compact",
                        "session_id": "session-1"}, *args)
    text = (context or {}).get("hookSpecificOutput", {}).get("additionalContext", "")
    check("tras compactar, el evento declarado es SessionStart", "SessionStart",
          (context or {}).get("hookSpecificOutput", {}).get("hookEventName"))
    check("nombra el clon con trabajo sin publicar", True, "clone-a" in text)
    check("y lo que tiene sin versionar", True, "1 untracked" in text)
    check("nombra el trabajo del ledger sin recoger", True, "suite" in text)
    check("nombra el banco más reciente, que es donde vive lo que se hacía", True,
          text.find("current-question") != -1
          and (text.find("older-question") == -1 or text.find("current-question") < text.find("older-question")))

    startup = run_hook({"hook_event_name": "SessionStart", "source": "startup",
                        "session_id": "session-1"}, *args)
    check("fuera de una compactación no inyecta nada", {}, startup)

    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "publish")
    clean = run_hook({"hook_event_name": "SessionStart", "source": "compact",
                      "session_id": "session-2"}, *args)
    check("sin trabajo pendiente no inyecta nada", {}, clean)
    check("una sesión sin ledger no lo crea al leerlo", False, (ledgers / "session-2").exists())

    # La pregunta «¿escribe?» se contesta ejecutándolo bajo strace.
    (repo / "again.ts").write_text("y\n")
    measured = subprocess.run(
        ["bash", str(ROOT / "bin/assert_no_writes"), "--",
         sys.executable, str(ROOT / "src/hooks/compact_context.py"), *args],
        input=json.dumps({"hook_event_name": "SessionStart", "source": "compact",
                          "session_id": "session-1"}),
        capture_output=True, text=True, env={**os.environ, **ENV, "PYTHONPATH": str(ROOT / "src")})
    check("por conducta, el hook no intenta escribir nada", 0, measured.returncode)
    if measured.returncode:
        print(measured.stdout[-800:], measured.stderr[-400:])

print(f"test_compact_context: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
