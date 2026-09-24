"""Suite del detector de trabajos lanzados con el segundo plano del CLIENTE.

El defecto, tomado de una sesión real
-------------------------------------
El árbol trae tres ensambladores para un trabajo determinista largo:
``bin/thyrox-bg`` lanza uno y ``register`` lo anota en el ledger,
``bin/run-task-pool`` lanza N con anchura y memoria acotadas, y
``bin/wait-jobs`` es la barrera. Durante la sesión del 2026-09-23 los trabajos
largos se lanzaron con ``run_in_background: true`` del propio cliente: un
``until grep`` de espera y dos ``run-task-pool``. Un trabajo así nace FUERA del
ledger —la barrera no lo ve y el Stop gate no lo retiene—, no deja marcador
propio, y el cliente lo reporta sólo cuando termina.

El control que puede fallar
----------------------------
Los positivos son las dos llamadas de la sesión, verbatim. Los que discriminan
son el mismo comando sin el parámetro, y el que ya viaja por ``thyrox-bg``:
un detector que mirara sólo el comando no los separaría.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_client_background.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

#: Dos llamadas de la sesión, verbatim salvo el recorte de su cola.
EPISODE_POOL = ("cd /home/user/thyrox; bash bin/run-task-pool --width 2 --memfree 2G "
                "--timeout 900 --dir $W/logs --prefix derivadas $W/comandos.txt > $W/pool.txt 2>&1")
EPISODE_WAIT = ("timeout 1500 bash -c \"until grep -q '^EXIT=' $S/wt-l4.suite.log; "
                "do sleep 5; done\"")

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


def detect(command: str, background) -> str | None:
    tool_input = {"command": command}
    if background is not None:
        tool_input["run_in_background"] = background
    return gate.detect({"tool_name": "Bash", "tool_input": tool_input})


print("== 1. las llamadas de la sesión, verbatim ==")
check("avisa sobre el pool lanzado por el cliente", True, detect(EPISODE_POOL, True) is not None)
check("avisa sobre la espera lanzada por el cliente", True, detect(EPISODE_WAIT, True) is not None)

print("== 2. EL QUE DISCRIMINA: el parámetro, no el comando ==")
check("el mismo pool sin el parámetro calla", None, detect(EPISODE_POOL, None))
check("y con el parámetro en false", None, detect(EPISODE_POOL, False))

print("== 3. lo que ya viaja por el ensamblador calla ==")
check("thyrox-bg start", None,
      detect("bash bin/thyrox-bg start suite --memfree 2G -- bash tests/run.sh", True))

print("== 3b. la ESPERA de un trabajo del ledger va al cliente, y calla ==")
# Directiva del ejecutor 2026-09-24: una espera nunca en primer plano. El
# trabajo ya esta en el ledger (thyrox-bg start); su espera es lo unico que el
# cliente notifica. El `until` improvisado del caso 1 NO es del ledger y sigue
# avisando.
check("thyrox-bg wait al cliente calla", None,
      detect("bash bin/thyrox-bg wait commitesp", True))
check("wait-jobs wait al cliente calla", None,
      detect("bash bin/wait-jobs wait --timeout 1800", True))

print("== 4. el aviso nombra los tres ensambladores ==")
notice = detect(EPISODE_POOL, True) or ""
for name in ("thyrox-bg start", "register", "run-task-pool", "wait-jobs"):
    check(f"nombra {name}", True, name in notice)

print("== 5. anulado el descuento del ensamblador, cae EXACTAMENTE ese caso ==")
original = gate.already_assembled
try:
    gate.already_assembled = lambda command: False
    dropped = []
    if detect("bash bin/thyrox-bg start suite -- bash tests/run.sh", True) is not None:
        dropped.append("thyrox-bg")
    if detect(EPISODE_POOL, None) is not None:
        dropped.append("sin-parametro")
    check("cae el de thyrox-bg y ninguno más", ["thyrox-bg"], dropped)
finally:
    gate.already_assembled = original

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
