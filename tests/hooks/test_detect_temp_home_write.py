"""Suite del detector de escrituras en ``/tmp`` fuera de los hogares declarados.

El defecto, tomado de una sesión real
-------------------------------------
Durante la sesión del 2026-09-23 las listas de archivos, una copia del store,
punteros entre pasos y hasta dos ``git worktree`` se escribieron en el
*scratchpad* de la sesión (``/tmp/claude-0/.../scratchpad``). El ``.env``
declara dónde va cada cosa: ``THYROX_WORKBENCH_DIR`` para la evidencia,
``THYROX_CACHE_DIR`` para lo regenerable y ``THYROX_BACKGROUND_LOG_DIR`` para
los logs. Lo que cae en ``/tmp`` muere con el contenedor y ningún commit lo ve.
Encima, los worktrees en ``/tmp`` heredaron el ``.env`` versionado y
reescribieron el ``bin/`` del clon real (H-THYROX-163).

El control que puede fallar
----------------------------
Los positivos son los comandos de esa sesión, **verbatim**. Los que
discriminan son los de lectura: ``cat`` o ``grep`` sobre ``/tmp`` son
legítimos (así se leen las salidas de las tareas del cliente), y un detector
que avisara por la sola presencia de ``/tmp`` los marcaría.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_temp_home_write.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

SCRATCH = "/tmp/claude-0/-home-user/efec8688-6a45-5d65-b899-cd988aa8816f/scratchpad"

#: Tres comandos de la sesión, verbatim salvo el recorte de su cola.
EPISODE_WORKTREE = (f"S={SCRATCH}; git worktree add -q --detach $S/wt-l4 "
                    "origin/feature/thyrox-l4")
EPISODE_REDIRECT = ("git ls-files src | grep -vE '\\.(json|sqlite3)$' > "
                    f"{SCRATCH}/src-files.txt")
EPISODE_COPY = f"cp .env.example {SCRATCH}/env.example.fixed"

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


def detect(command: str) -> str | None:
    return gate.detect({"tool_input": {"command": command}})


print("== 1. los comandos de la sesión, verbatim ==")
check("avisa sobre el worktree creado en el scratchpad", True,
      detect(EPISODE_WORKTREE) is not None)
check("avisa sobre la redirección a /tmp", True, detect(EPISODE_REDIRECT) is not None)
check("avisa sobre la copia hacia /tmp", True, detect(EPISODE_COPY) is not None)

print("== 2. las otras formas de escribir ==")
check("tee", True, detect("pytest -q | tee /tmp/salida.log") is not None)
check("mkdir -p", True, detect("mkdir -p /tmp/trabajo") is not None)
check(">> añade", True, detect("echo x >> /tmp/acumulado.txt") is not None)

print("== 3. EL QUE DISCRIMINA: leer de /tmp no es escribir -> silencio ==")
check("cat de la salida de una tarea", None,
      detect("cat /tmp/claude-0/x/tasks/b63iwq0zx.output | tail -5"))
check("grep sobre un archivo de /tmp", None, detect("grep -c FAIL /tmp/log.txt"))
check("cp DESDE /tmp hacia el workbench", None,
      detect("cp /tmp/log.txt .claude/workbench/banco/log.txt"))

print("== 4. escribir en los hogares declarados -> silencio ==")
check("redirección al workbench", None,
      detect("bash tests/run.sh > .claude/workbench/banco/rojo.txt 2>&1"))
check("sin /tmp no hay nada que decir", None, detect("bash tests/run.sh"))

print("== 5. el aviso nombra los tres hogares ==")
notice = detect(EPISODE_REDIRECT) or ""
for key in ("THYROX_WORKBENCH_DIR", "THYROX_CACHE_DIR", "THYROX_BACKGROUND_LOG_DIR"):
    check(f"nombra {key}", True, key in notice)

print("== 6. anulado el filtro de escritura, caen EXACTAMENTE los de lectura ==")
original = gate.writes_to_temp
try:
    gate.writes_to_temp = lambda command: "/tmp/" in command
    dropped = []
    if detect("cat /tmp/claude-0/x/tasks/b63iwq0zx.output | tail -5") is not None:
        dropped.append("cat")
    if detect("grep -c FAIL /tmp/log.txt") is not None:
        dropped.append("grep")
    if detect("cp /tmp/log.txt .claude/workbench/banco/log.txt") is not None:
        dropped.append("cp-desde")
    if detect("bash tests/run.sh") is not None:
        dropped.append("sin-tmp")
    check("caen los tres de lectura y ninguno más", ["cat", "grep", "cp-desde"], dropped)
finally:
    gate.writes_to_temp = original

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
