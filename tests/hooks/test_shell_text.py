"""Suite de ``src/hooks/shell_text.py``: lo que un comando de shell escribe
como texto y no ejecuta.

``mask_data_quotes`` — las dos mitades de juicio, cada una con su anulación
----------------------------------------------------------------------------
- **Descarte de comillas de datos**: el texto entre comillas que es el valor
  de un ``flag``, el cuerpo de un ``printf`` o un JSON por tubería no cuenta
  como comando — se vacía.
- **Excepción de código ejecutable**: el argumento de ``bash -c``/``sh
  -c``/``zsh -c``, ``eval``, o el comando que sigue a ``timeout N``, ``env``,
  ``nohup``, ``xargs`` SÍ se conserva, porque una shell lo va a correr.
"""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from hooks.shell_text import mask_data_quotes  # noqa: E402

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


# Mitad 1 — descarte de comillas de datos: el texto queda vacío.
check("el valor de --content se vacía", False,
      "python3 src/verify" in mask_data_quotes(
          'bash bin/agent_store agregar-hallazgo --content '
          '"... python3 src/verify/check_rst_sintaxis.py ..."'))
check("el cuerpo de printf se vacía", False,
      "python3 src/verify" in mask_data_quotes(
          "printf '%s' 'python3 src/verify/check_rst_sintaxis.py' > nota.txt"))
check("un JSON por tubería se vacía", False,
      "python3 src/verify" in mask_data_quotes(
          'printf \'%s\' \'{"command":"python3 src/verify/check_rst_sintaxis.py"}\' '
          '| bash bin/tool_use_preflight'))

# Mitad 2 — excepción de código ejecutable: el texto se conserva.
check("bash -c conserva su argumento", True,
      "python3 src/verify" in mask_data_quotes(
          "bash -c 'python3 src/verify/check_rst_sintaxis.py'"))
check("sh -c conserva su argumento", True,
      "python3 src/verify" in mask_data_quotes(
          'sh -c "python3 src/verify/check_rst_sintaxis.py"'))
check("zsh -c conserva su argumento", True,
      "python3 src/verify" in mask_data_quotes(
          "zsh -c 'python3 src/verify/check_rst_sintaxis.py'"))
check("eval conserva su argumento", True,
      "python3 src/verify" in mask_data_quotes(
          "eval 'python3 src/verify/check_rst_sintaxis.py'"))
check("timeout N conserva el comando que sigue", True,
      "python3 src/verify" in mask_data_quotes(
          "timeout 60 'python3 src/verify/check_rst_sintaxis.py'"))
check("env conserva el comando que sigue", True,
      "python3 src/verify" in mask_data_quotes(
          "env 'python3 src/verify/check_rst_sintaxis.py'"))
check("nohup conserva el comando que sigue", True,
      "python3 src/verify" in mask_data_quotes(
          "nohup 'python3 src/verify/check_rst_sintaxis.py'"))
check("xargs conserva el comando que sigue", True,
      "python3 src/verify" in mask_data_quotes(
          "xargs 'python3 src/verify/check_rst_sintaxis.py'"))

# Fuera de familia — sin comillas, el texto no cambia.
check("un comando sin comillas queda intacto", "ls -la", mask_data_quotes("ls -la"))

print(f"test_shell_text: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
