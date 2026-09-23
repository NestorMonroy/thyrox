"""Suite del detector de interprete que lee stdin sin que nadie se la de.

El defecto, medido por conducta en este contenedor
---------------------------------------------------
Un interprete sin guion (``python``) o con ``-`` lee su programa de stdin. En
primer plano el stdin de la herramienta llega cerrado y sale al instante; en
SEGUNDO plano llega un tubo que no se cierra nunca, y el interprete espera para
siempre. Medido en invocaciones separadas, con ``timeout 10``:

    primer plano   .venv/bin/python            -> exit 0
    segundo plano  .venv/bin/python            -> exit 124 (colgado)
    segundo plano  .venv/bin/python </dev/null -> exit 0

Como el cliente puede PROMOVER cualquier comando a segundo plano, la forma
cuelga aunque se escriba para el primero. El episodio: el comando que registro
H-THYROX-156 llevaba dos interpretes desnudos; lo promovieron, se colgo, y todo
lo que venia detras no corrio.

El control que puede fallar
----------------------------
La excepcion es la entrada PROVISTA: heredoc, tubo o ``<``. Al anularla tienen
que caer exactamente los casos que dependen de ella, y ninguno mas.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_stdin_reading_interpreter.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

#: El tramo del comando del episodio, verbatim. NO es un incumplidor fabricado:
#: es el que se colgo al promoverlo.
EPISODE = (
    ".venv/bin/python 2>/dev/null; sed -i 's|^     - DOCUMENTADO$|     - DOCUMENTADO|' "
    "$D/index.rst; .venv/bin/python - 2>/dev/null; /home/user/thyrox/.venv/bin/python - <<'PY'\n"
    "import pathlib\nPY\ntail -5 $D/index.rst"
)

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


print("== 1. el comando del episodio, verbatim ==")
notice = detect(EPISODE)
check("avisa sobre el comando que se colgo de verdad", True, notice is not None)
check("y nombra la forma desnuda del episodio", True,
      notice is not None and ".venv/bin/python" in notice)

print("== 2. EL QUE DISCRIMINA: la entrada provista -> silencio ==")
check("calla ante un heredoc", None, detect("python - <<'PY'\nprint(1)\nPY"))
check("calla ante un tubo", None, detect("echo 'print(1)' | python -"))
check("calla ante una redireccion", None, detect("python < script.py"))

print("== 3. un guion, -c o -m no leen stdin -> silencio ==")
check("calla ante un guion", None, detect("python tests/run.py -q"))
check("calla ante -c", None, detect("python3 -c 'print(1)'"))
check("calla ante -m", None, detect(".venv/bin/python -m pytest -q"))

print("== 4. node sin guion tambien lee stdin ==")
check("avisa ante node desnudo", True, detect("node 2>/dev/null; echo fin") is not None)

print("== 5. la palabra en prosa no es una invocacion ==")
check("calla ante python dentro de un echo", None, detect("echo 'corre python aqui'"))
check("calla sin interprete", None, detect("bash tests/run.sh"))

print("== 6. el aviso nombra la salida ==")
notice = detect(".venv/bin/python 2>/dev/null")
check("nombra </dev/null", True, notice is not None and "</dev/null" in notice)

print("== 7. anulada la excepcion de entrada provista, cae EXACTAMENTE ese caso ==")
original = gate.has_provided_input
try:
    gate.has_provided_input = lambda _segment: False
    dropped = []
    for label, command in (("heredoc", "python - <<'PY'\nprint(1)\nPY"),
                           ("tubo", "echo 'print(1)' | python -"),
                           ("redireccion", "python < script.py"),
                           ("guion", "python tests/run.py -q"),
                           ("-c", "python3 -c 'print(1)'")):
        if detect(command) is not None:
            dropped.append(label)
    check("caen heredoc, tubo y redireccion, y ninguno mas",
          ["heredoc", "tubo", "redireccion"], dropped)
finally:
    gate.has_provided_input = original
check("y restaurada, vuelve a callar", None, detect("python - <<'PY'\nprint(1)\nPY"))


print("== 8. la linea real del episodio: DOS interpretes desnudos, no uno ==")
# Estructura verbatim de la linea que escribio H-THYROX-156. Se mato el
# primer interprete y el segundo siguio esperando 46 minutos: el aviso tiene
# que nombrar los dos, y callar el tercero, que si recibe un heredoc.
EPISODE = (
    "cd /home/user/kaupamex-docs && D=hallazgos; cat > $D/h.rst <<EOF\n"
    ".. meta::\n   :estado: resuelto\nEOF\n"
    ".venv/bin/python 2>/dev/null; sed -i 's|a|a|' $D/index.rst; "
    ".venv/bin/python - 2>/dev/null; /home/user/thyrox/.venv/bin/python - <<'PY'\n"
    "import pathlib\nPY\ntail -5 $D/index.rst"
)
episode_notice = detect(EPISODE)
check("nombra el primer interprete",
      True, episode_notice is not None and "`.venv/bin/python 2>/dev/null`" in episode_notice)
check("nombra el segundo, el que siguio vivo",
      True, episode_notice is not None and "`.venv/bin/python - 2>/dev/null`" in episode_notice)
check("calla el que recibe heredoc",
      False, episode_notice is not None and "/home/user/thyrox/.venv/bin/python" in episode_notice)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
