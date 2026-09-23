"""Suite del detector de ``awk`` a secas en posición de comando.

El defecto, tomado de una sesión real
-------------------------------------
Con gawk instalado y ``THYROX_TOOLCHAIN_AWK_BIN=gawk`` declarado en el
``.env``, los comandos de la sesión del 2026-09-23 siguieron escribiendo
``awk``. En Debian ese nombre resuelve por ``/etc/alternatives/awk``, y en
este contenedor apunta a mawk (``readlink -f $(command -v awk)`` ->
``/usr/bin/mawk``), que revienta ante un cuantificador de intervalo seguido de
grupo (h-docs-1068). Instalar gawk no cambia a dónde apunta el nombre.

El control que puede fallar
----------------------------
Los que discriminan son los que NO son invocación: la palabra ``awk`` dentro
de una cadena, como argumento de ``grep`` o como parte de ``gawk``/``mawk``.
Un detector que buscara la subcadena los marcaría a todos.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_bare_awk.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

#: Dos comandos de la sesión, verbatim.
EPISODE_PIPE = ("bash tests/run.sh --list | awk '/\\.test\\.ts$/{t++;next} "
                "/\\.py$/{p++;next} {s++} END{print \"ts\",t,\"py\",p,\"sh\",s}'")
EPISODE_START = ("awk -v P=.venv/bin/python '/\\.test\\.ts$/{print \"bun test \" $0; next}' "
                 "derivadas.txt > comandos.txt")

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
check("avisa sobre awk tras un pipe", True, detect(EPISODE_PIPE) is not None)
check("avisa sobre awk al inicio del comando", True, detect(EPISODE_START) is not None)
check("y tras ;", True, detect("cd x; awk '{print $1}' f") is not None)

print("== 2. EL QUE DISCRIMINA: awk que no es invocación -> silencio ==")
check("gawk", None, detect("gawk '{print $1}' f"))
check("mawk explícito", None, detect("mawk '{print}' f"))
check("la palabra dentro de una cadena", None, detect("echo 'usa awk con cuidado'"))
check("como argumento de grep", None, detect("grep -rn awk src/lib"))
check("la variable declarada", None, detect('"$THYROX_TOOLCHAIN_AWK_BIN" \'{print}\' f'))

print("== 3. el aviso nombra la salida ==")
notice = detect(EPISODE_PIPE) or ""
check("nombra gawk", True, "gawk" in notice)
check("nombra THYROX_TOOLCHAIN_AWK_BIN", True, "THYROX_TOOLCHAIN_AWK_BIN" in notice)

print("== 4. anulado el ancla de posición de comando, caen EXACTAMENTE los de prosa ==")
original = gate.invokes_bare_awk
try:
    gate.invokes_bare_awk = lambda command: " awk" in f" {command}"
    dropped = []
    if detect("echo 'usa awk con cuidado'") is not None:
        dropped.append("cadena")
    if detect("grep -rn awk src/lib") is not None:
        dropped.append("grep")
    if detect("gawk '{print $1}' f") is not None:
        dropped.append("gawk")
    check("caen cadena y grep, no gawk", ["cadena", "grep"], dropped)
finally:
    gate.invokes_bare_awk = original

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
