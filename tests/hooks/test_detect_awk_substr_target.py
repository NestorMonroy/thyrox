"""Suite del detector de ``substr()`` como destino de ``gsub``/``sub`` en awk.

El defecto
----------
En ningún awk (gawk, mawk, busybox) el tercer argumento de ``gsub``/``sub``
puede ser ``substr()``: tiene que ser asignable, y ``substr()`` devuelve una
copia. gawk lo rechaza al compilar («gsub third parameter is not a changeable
object»). La regla vivía en prosa (`operaciones-de-archivo-con-bash.md`) y el
ejecutor lo señaló: una regla sin script no sirve.

El control que puede fallar
----------------------------
Discriminan los casos donde un emparejador ingenuo del tercer argumento se
equivoca: una coma dentro de un literal ``/regex/`` o de una cadena corre la
cuenta de argumentos, y un ``re.sub`` de Python no es awk.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_awk_substr_target.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
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
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def warns(command: str) -> bool:
    return gate.detect({"tool_name": "Bash", "tool_input": {"command": command}}) is not None


# Las formas que el propio mensaje del ejecutor describe como invalidas.
SUBSTR_TARGET = "gawk '{gsub(/a/, \"X\", substr($0, 5, 10)); print}' f"
REGEX_COMMA = "awk '{gsub(/,/, \";\", substr($0, 1, 3))}' f"
STRING_COMMA = "mawk '{sub(/a/, \"x,y\", substr($0, 2, 4))}' f"
#: awk en la tubería, pero la sustitución es el método ``re.sub`` de Python.
PYTHON_SUB = ("gawk '{print $2}' f | python3 -c "
              "'import re, sys; print(re.sub(\"a\", \"b\", substr(sys.stdin.read())))'")
#: Sin awk en el comando: la forma aparece como texto, no se ejecuta.
NOTE_TEXT = "echo 'nunca: gsub(/a/,\"X\",substr($0,1,3))' >> notas.txt"

print("== 1. substr() como destino -> aviso ==")
check("gsub con substr como tercer argumento", True, warns(SUBSTR_TARGET))
check("sub también", True, warns("gawk '{sub(/a/,\"X\",substr($0,1,3))}' f"))
check("por la variable de la cadena", True,
      warns("\"$THYROX_TOOLCHAIN_AWK_BIN\" '{gsub(/a/,\"X\",substr($0,1,3))}' f"))

print("== 2. EL QUE DISCRIMINA: comas que no separan argumentos ==")
check("coma dentro de un literal /regex/", True, warns(REGEX_COMMA))
check("coma dentro de una cadena", True, warns(STRING_COMMA))

print("== 3. formas válidas -> silencio ==")
check("la variable, como manda la regla", False,
      warns("gawk '{s=substr($0,5,10); gsub(/a/,\"X\",s); print}' f"))
check("gensub devuelve, no modifica", False,
      warns("gawk '{print gensub(/a/,\"X\",\"g\",substr($0,5,10))}' f"))
check("dos argumentos", False, warns("gawk '{gsub(/a/,\"X\")}' f"))
check("una variable que empieza por substr", False,
      warns("gawk '{gsub(/a/,\"X\",substr_part)}' f"))
check("re.sub de Python en la tubería no es awk", False, warns(PYTHON_SUB))
check("la forma escrita como texto, sin awk", False, warns(NOTE_TEXT))
check("otra herramienta", False, warns("ls -la"))

print("== 4. el aviso nombra la salida ==")
notice = gate.detect({"tool_name": "Bash", "tool_input": {"command": SUBSTR_TARGET}}) or ""
check("nombra gensub", True, "gensub" in notice)
check("nombra la regla", True, "operaciones-de-archivo-con-bash.md" in notice)


def dropped_under(name: str, replacement) -> list[str]:
    original = getattr(gate, name)
    setattr(gate, name, replacement)
    try:
        cases = {"regex": REGEX_COMMA, "cadena": STRING_COMMA, "python": PYTHON_SUB,
                 "texto": NOTE_TEXT, "base": SUBSTR_TARGET}
        expected = {"regex": True, "cadena": True, "python": False, "texto": False, "base": True}
        return sorted(k for k, c in cases.items() if warns(c) != expected[k])
    finally:
        setattr(gate, name, original)


print("== 5. anulación: cada mitad de juicio hace caer exactamente sus casos ==")
check("sin el ancla de awk cae sólo el texto", ["texto"],
      dropped_under("invokes_awk", lambda command: True))
check("sin excluir el método .sub cae sólo python", ["python"],
      dropped_under("_CALL", __import__("re").compile(r"g?sub\s*\(")))
check("sin saltar literales /regex/ cae sólo regex", ["regex"],
      dropped_under("SKIP_REGEX_LITERALS", False))
check("sin saltar cadenas cae sólo cadena", ["cadena"],
      dropped_under("SKIP_STRINGS", False))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
