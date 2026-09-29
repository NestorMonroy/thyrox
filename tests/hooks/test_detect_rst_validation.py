"""Suite del detector de validación RST a mano y del verde falso del `;`.

El defecto que agrega esta suite
---------------------------------
El detector no tenía prueba propia, y su recomendación citaba
``python3 <ruta>/check_rst_sintaxis.py`` — la invocación por ruta que
``detect_library_path_invocation.py`` ataja, y que revienta con
``ModuleNotFoundError: paths`` porque no compone ``PYTHONPATH``. Corregido a
``bash bin/check_rst_sintaxis``, que sí funciona.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_rst_validation.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
assert _spec is not None and _spec.loader is not None
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r}, obtenido {obtained!r}")
        FAILED += 1


def notice(command: str) -> str | None:
    return gate.detect({"tool_input": {"command": command}})


HAND_ROLLED_CMD = "python3 -c \"from docutils.core import publish_doctree; publish_doctree(open('x.rst').read())\""
FALSE_GREEN_CMD = 'bash bin/check_rst_sintaxis x.rst; echo "validado"'

check("la validación a mano recomienda bin/check_rst_sintaxis", True,
      "bin/check_rst_sintaxis" in (notice(HAND_ROLLED_CMD) or ""))
check("la recomendación NO cita python3 .../check_rst_sintaxis.py", False,
      "python3" in (notice(HAND_ROLLED_CMD) or "") and
      "check_rst_sintaxis.py" in (notice(HAND_ROLLED_CMD) or ""))
check("el propio gate invocado a mano no se avisa a sí mismo", False,
      bool(notice("bash bin/check_rst_sintaxis x.rst")))
check("el `;` antes de un eco de éxito avisa del verde falso", True,
      bool(notice(FALSE_GREEN_CMD)))
check("un `&&` antes del eco no avisa del verde falso", False,
      "`;`" in (notice('bash bin/check_rst_sintaxis x.rst && echo "validado"') or ""))
check("otro programa calla", False, bool(notice("ls -la")))

print(f"test_detect_rst_validation: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
