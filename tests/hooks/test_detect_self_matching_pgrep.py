"""Suite del detector de espera que se casa a si misma.

El defecto, medido por conducta en este contenedor
---------------------------------------------------
``pgrep -f`` compara el patron contra la **linea de comando completa** de cada
proceso. Un comando que se escribe en el turno corre dentro de un ``bash -c``
cuya linea de comando **contiene el patron** —es su propio argumento—, asi que
el patron se encuentra a si mismo:

    bash -c "pgrep -af 'marca_qq_uno'"   -> exit 0, casa con el wrapper
    bash -c "pgrep -af '[m]arca_qq_dos'" -> exit 1, no casa con nada

La clase de corchete es el discriminador: el regex ``[m]arca`` casa el texto
``marca``, y el texto que la linea de comando lleva es ``[m]arca``, que el regex
NO casa. Sin ella, un ``until ! pgrep -f X; do sleep; done`` gira para siempre
sobre un trabajo que termino hace rato — que es ``H-THYROX-103``, y costo un
turno entero.

El control que puede fallar
----------------------------
El caso de la clase de corchete es el unico que depende de esa excepcion. Al
anularla tiene que caer **exactamente ese caso** y ninguno mas: si al retirarla
el veredicto no cambia, la excepcion era codigo muerto y el detector no la
estaba usando.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

# El bootstrap de UNA linea es la unica aritmetica que el gate admite: no se
# puede pedir `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_self_matching_pgrep.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

#: El comando del episodio, citado verbatim. NO es un incumplidor fabricado:
#: es el que giro hasta que lo mataron (`H-THYROX-103`).
EPISODE = ("until ! pgrep -f 'check_suite_discrimina' > /dev/null; "
           "do sleep 10; done; echo \"=== el gate termino ===\"")

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


# --- 1. el control positivo REAL ---------------------------------------------
print("== 1. el comando del episodio, verbatim ==")
notice = detect(EPISODE)
check("avisa sobre el comando que giro de verdad", True, notice is not None)

# --- 2. la bandera compuesta ------------------------------------------------
print("== 2. -af es la misma bandera que -f, pegada a otra ==")
check("ve -af", True, detect("pgrep -af 'thyrox_audit'") is not None)
check("ve -lf", True, detect("pgrep -lf thyrox_audit") is not None)

# --- 3. EL QUE DISCRIMINA: la clase de corchete ------------------------------
print("== 3. la clase de corchete NO se casa a si misma -> silencio ==")
check("calla ante '[c]heck_suite_discrimina'",
      None, detect("until ! pgrep -f '[c]heck_suite_discrimina'; do sleep 5; done"))

# --- 4. sin -f compara el NOMBRE del proceso, no la linea --------------------
print("== 4. pgrep sin -f mide otro universo -> silencio ==")
check("calla ante pgrep sin -f", None, detect("pgrep sleep"))
check("y ante pgrep -l, que tampoco es -f", None, detect("pgrep -l sleep"))

# --- 5. pkill -f comparte el mecanismo ---------------------------------------
print("== 5. pkill -f compara igual, y ademas MATA lo que casa ==")
notice = detect("pkill -f 'thyrox_audit'")
check("avisa sobre pkill -f", True, notice is not None)

# --- 6. un patron por variable es INDECIDIBLE, y se avisa --------------------
print("== 6. un patron en variable no se puede inspeccionar -> avisa ==")
check("avisa ante un patron por variable", True,
      detect('pgrep -f "$PATRON"') is not None)

# --- 7. sin pgrep no hay nada que decir --------------------------------------
print("== 7. un comando sin pgrep/pkill -> None ==")
check("calla", None, detect("bash tests/run.sh"))
check("y no le basta la palabra en prosa", None,
      detect("echo 'el bucle usaba pgrep y se casaba a si mismo'"))

# --- 8. el aviso nombra las DOS salidas --------------------------------------
print("== 8. el aviso nombra el mecanismo sancionado y el discriminador ==")
notice = detect(EPISODE)
check("nombra marker_wait --pid-only", True, "--pid-only" in notice)
check("nombra wait-jobs, para N trabajos", True, "wait-jobs" in notice)
check("y nombra la clase de corchete como salida minima", True, "[c]" in notice or "[p]" in notice)

# --- 9. control de anulacion de la excepcion del corchete --------------------
print("== 9. anulada la excepcion del corchete, cae EXACTAMENTE ese caso ==")
original = gate.has_bracket_class
try:
    gate.has_bracket_class = lambda _pattern: False
    dropped = []
    if detect("until ! pgrep -f '[c]heck_suite_discrimina'; do sleep 5; done") is not None:
        dropped.append("corchete")
    if detect("pgrep sleep") is not None:
        dropped.append("sin -f")
    if detect("bash tests/run.sh") is not None:
        dropped.append("sin pgrep")
    check("cae el del corchete y ninguno mas", ["corchete"], dropped)
finally:
    gate.has_bracket_class = original

check("y restaurada, vuelve a callar",
      None, detect("pgrep -f '[c]heck_suite_discrimina'"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
