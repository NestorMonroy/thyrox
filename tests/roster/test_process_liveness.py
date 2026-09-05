"""Pruebas de ``roster.process_liveness`` — el roster que SÍ tiene PID.

Adaptación de ``probeDaemonJob``/``dbt``/``S6e`` del cliente Claude Code (ver
el docstring de ``process_liveness`` para la referencia completa y para por
qué existe además de ``job_liveness``, que declinó portar la vía del PID).

Los casos que DISCRIMINAN, y por qué:

- **3** — el caso que fija el ORDEN. Un pid en estado ``R`` (que "parece"
  vivo) con un ``starttime`` que NO coincide tiene que salir
  ``procstart_mismatch``, no ``live``. Si el estado se mirara ANTES que el
  ``starttime``, este mismo caso saldría ``live`` — el discriminador fuerte
  quedaría enmascarado por el débil.
- **8** — ``recorded_proc_start=None`` no es "compáralo contra nada": el paso
  se SALTA por completo. Se prueba con un lector que LANZA si se le llama —
  si el paso no se saltara, la prueba fallaría con la excepción del lector,
  no con una aserción.
- **9 y 10** — un lector inyectado que LANZA ``OSError`` (permiso denegado, un
  simulacro de fallo) tiene que salir como ``UnreadableProcessError``, nunca
  colarse como uno de los cinco veredictos de ``VERDICTS``.
- **13** — el ``comm`` de un proceso puede traer espacios y paréntesis
  (``mi (raro) prog``); un parser que corte por el PRIMER ``')'`` da un campo
  equivocado. Éste es el caso que discrimina la aritmética de
  ``_remainder_fields`` (la misma que ``wait-jobs.sh::read_proc_start``).

No se crea ningún zombie ni proceso detenido de verdad — los lectores se
inyectan como fakes (DEC-04), igual que ``job_liveness`` inyecta
``read_shape``. Sólo los casos 14-15 tocan ``/proc`` real, y sólo para
confirmar que el lector por defecto no revienta contra un pid propio o
inexistente — nunca para fijar un valor concreto de ``starttime``.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from roster import process_liveness as pl  # noqa: E402

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


def state_reader(value: str | None):
    """Un ``read_state`` fake: siempre devuelve ``value``."""
    def _reader(pid: int) -> str | None:
        return value
    return _reader


def start_reader(value: str | None):
    """Un ``read_start`` fake: siempre devuelve ``value``."""
    def _reader(pid: int) -> str | None:
        return value
    return _reader


def raising_reader(exc: Exception):
    """Un lector fake que LANZA en vez de leer — para probar la cuarentena."""
    def _reader(pid: int):
        raise exc
    return _reader


print("== 1. pid ausente: dead_pid, sin importar recorded_proc_start ==")
d = pl.diagnose(1, recorded_proc_start="12345", read_state=state_reader(None),
                read_start=start_reader("999"))
check("verdict dead_pid", "dead_pid", d.verdict)
check("procedencia: no fue el starttime", False, d.from_procstart)

print("== 2. estado 'S', sin recorded_proc_start: live ==")
d = pl.diagnose(2, read_state=state_reader("S"))
check("verdict live", "live", d.verdict)
check("procedencia: no fue el starttime", False, d.from_procstart)

print("== 3. DISCRIMINA EL ORDEN: estado 'R' (parece vivo) + starttime que "
      "NO coincide == procstart_mismatch, NO live ==")
d = pl.diagnose(3, recorded_proc_start="100",
                 read_state=state_reader("R"), read_start=start_reader("999"))
check("no se declara vivo por el estado solo", "procstart_mismatch", d.verdict)
check("procedencia: el starttime decidió", True, d.from_procstart)

print("== 4. estado 'R' + starttime que SÍ coincide: live ==")
d = pl.diagnose(4, recorded_proc_start="100",
                 read_state=state_reader("R"), read_start=start_reader("100"))
check("coincide -> live", "live", d.verdict)
check("procedencia: el match no la marca (sólo el mismatch la marca)",
      False, d.from_procstart)

print("== 5. estado 'Z': zombie (con o sin recorded_proc_start) ==")
d = pl.diagnose(5, read_state=state_reader("Z"))
check("verdict zombie", "zombie", d.verdict)
d = pl.diagnose(5, recorded_proc_start="1", read_state=state_reader("Z"),
                 read_start=start_reader("1"))
check("zombie con starttime confirmado sigue siendo zombie", "zombie", d.verdict)

print("== 6. estado 'T': stopped ==")
d = pl.diagnose(6, read_state=state_reader("T"))
check("verdict stopped", "stopped", d.verdict)

print("== 7. zombie y stopped se distinguen — no colapsan en uno solo ==")
check("zombie != stopped",
      True,
      pl.diagnose(7, read_state=state_reader("Z")).verdict
      != pl.diagnose(7, read_state=state_reader("T")).verdict)

print("== 8. DISCRIMINA: recorded_proc_start=None SALTA el paso — "
      "read_start ni se llama ==")
boom = raising_reader(RuntimeError("read_start no debía llamarse"))
d = pl.diagnose(8, recorded_proc_start=None, read_state=state_reader("R"),
                 read_start=boom)
check("live sin tocar read_start", "live", d.verdict)

print("== 9. DISCRIMINA: read_state que LANZA OSError -> UnreadableProcessError ==")
try:
    pl.diagnose(9, read_state=raising_reader(PermissionError("denegado")))
    check("lanza UnreadableProcessError", "UnreadableProcessError", "no lanzó")
except pl.UnreadableProcessError as err:
    check("lanza UnreadableProcessError", "UnreadableProcessError", type(err).__name__)
    check("trae el pid", 9, err.pid)

print("== 10. DISCRIMINA: read_start que LANZA OSError -> UnreadableProcessError ==")
try:
    pl.diagnose(10, recorded_proc_start="1", read_state=state_reader("R"),
                 read_start=raising_reader(OSError("no legible")))
    check("lanza UnreadableProcessError", "UnreadableProcessError", "no lanzó")
except pl.UnreadableProcessError as err:
    check("lanza UnreadableProcessError", "UnreadableProcessError", type(err).__name__)

print("== 11. is_alive() — sólo 'live' cuenta como vivo ==")
check("live está vivo", True, pl.is_alive(pl.Diagnosis("live", False)))
check("dead_pid no está vivo", False, pl.is_alive(pl.Diagnosis("dead_pid", False)))
check("procstart_mismatch no está vivo", False,
      pl.is_alive(pl.Diagnosis("procstart_mismatch", True)))
check("zombie no está vivo", False, pl.is_alive(pl.Diagnosis("zombie", False)))
check("stopped no está vivo", False, pl.is_alive(pl.Diagnosis("stopped", False)))

print("== 12. CONTROL: todo veredicto emitido está en VERDICTS ==")
casos = [
    pl.diagnose(90, read_state=state_reader(None)),
    pl.diagnose(90, recorded_proc_start="1", read_state=state_reader("R"),
                 read_start=start_reader("2")),
    pl.diagnose(90, read_state=state_reader("Z")),
    pl.diagnose(90, read_state=state_reader("T")),
    pl.diagnose(90, read_state=state_reader("R")),
]
check("los cinco veredictos posibles, todos declarados",
      set(pl.VERDICTS), {d.verdict for d in casos})

print("== 13. DISCRIMINA LA ARITMÉTICA: comm con espacio Y paréntesis dentro ==")
# El comm real es "mi (raro) prog" -> en el archivo aparece entre paréntesis
# EXTERNOS: "(mi (raro) prog)". Cortar por el PRIMER ')' daría el campo
# equivocado; cortar por el ÚLTIMO ') ' (lo que _remainder_fields hace) da
# el starttime correcto.
stat_text = (
    "1234 (mi (raro) prog) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 "
    "424242 20 21"
)
check("estado leído correctamente pese al comm raro", "S",
      pl._parse_process_state(stat_text))
check("starttime leído correctamente pese al comm raro", "424242",
      pl._parse_proc_start(stat_text))
# Control: cortar por el PRIMER ')' habría dejado " (raro) prog) S 1 ..." como
# remanente, y su primer campo NO sería el estado real.
primer_corte = stat_text.split(")", 1)[-1].split()
check("el corte por el PRIMER ')' da un campo distinto — es lo que se evita",
      True, primer_corte[0] != "S")

print("== 14. lector por defecto: pid inexistente -> None (no revienta) ==")
pid_imposible = 2**30  # muy por encima de cualquier PID real
check("read_process_state(pid inexistente) = None", None,
      pl.read_process_state(pid_imposible))
check("read_proc_start(pid inexistente) = None", None,
      pl.read_proc_start(pid_imposible))

print("== 15. lector por defecto contra un pid real (este proceso) ==")
propio = os.getpid()
estado_propio = pl.read_process_state(propio)
inicio_propio = pl.read_proc_start(propio)
check("el estado propio es una letra sola, no None", True,
      isinstance(estado_propio, str) and len(estado_propio) == 1)
check("el starttime propio es numérico, no None", True,
      isinstance(inicio_propio, str) and inicio_propio.isdigit())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
