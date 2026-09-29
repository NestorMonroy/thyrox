"""Suite del detector de invocación por ruta de un módulo con envoltorio.

El defecto
----------
``python3 src/verify/check_rst_sintaxis.py`` muere con
``ModuleNotFoundError: paths`` porque no compone ``PYTHONPATH`` ni resuelve
``THYROX_ROOT``, y ese mismo módulo ya tiene un envoltorio corto,
``bin/check_rst_sintaxis``, que sí lo hace
(``trabajo-en-segundo-plano.md``).

Las dos mitades de juicio, cada una con su anulación
----------------------------------------------------
- **Existe el envoltorio**: ``bin/check_rst_sintaxis`` existe en el árbol —
  avisa. ``src/hooks/shell_text.py`` es biblioteca (sin guarda
  ``__main__``) y no tiene ``bin/shell_text`` — calla, aunque la ruta lleve
  ``src/`` y termine en ``.py``.
- **Descarte de heredoc**: el mismo comando dentro del CUERPO de un heredoc
  no se ejecuta, y no avisa.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_library_path_invocation.py"
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


def warns(command: str) -> str | None:
    return gate.detect({"tool_name": "Bash", "tool_input": {"command": command}})


# Positivo real de la sesión.
check("python3 sobre un módulo con envoltorio avisa", True,
      bool(warns("python3 src/verify/check_rst_sintaxis.py")))
check("el aviso nombra bin/check_rst_sintaxis", True,
      "bin/check_rst_sintaxis" in (warns("python3 src/verify/check_rst_sintaxis.py") or ""))
check("uv run python3 también avisa", True,
      bool(warns("uv run python3 src/verify/check_rst_sintaxis.py --archivos x.rst")))
check("python (sin 3) también avisa", True,
      bool(warns("python src/verify/check_rst_sintaxis.py")))

# Mitad 1 — existe el envoltorio.
check("un módulo de biblioteca sin bin/ correspondiente calla", False,
      bool(warns("python3 src/hooks/shell_text.py")))
check("una ruta que no lleva src/ calla", False,
      bool(warns("python3 tests/hooks/test_detect_literal_replacement.py")))

# Mitad 2 — descarte de heredoc.
check("el mismo comando dentro de un heredoc no se ejecuta: calla", False,
      bool(warns("cat <<'EOF'\npython3 src/verify/check_rst_sintaxis.py\nEOF")))

# Fuera de familia.
check("bin/check_rst_sintaxis por su envoltorio ya no lleva src/…py: calla", False,
      bool(warns("bash bin/check_rst_sintaxis --archivos x.rst")))
check("otro programa calla", False, bool(warns("ls -la")))

print(f"test_detect_library_path_invocation: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
