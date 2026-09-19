#!/usr/bin/env python3
"""`reach.child_env()` — el entorno con que un SUBPROCESO alcanza este arbol.

Mitad ROJA de `TASK-THYROX-0216`. `sys.path` es del PROCESO: un modulo que se
hace importable insertando en `sys.path` deja al subproceso que lanza sin nada.
Medido en el episodio que origina esta suite: el stub del consumidor pone
`<thyrox>/src` en su propio `sys.path`, `register_session.py` importa bien, y su
subproceso `agent_store.py` muere con `ModuleNotFoundError: No module named
'agents'` — encolado por `run_and_log(spool=True)`, con exit 0 y sin un byte por
stderr.

CONTROL DE ANULACION: sin la composicion de `PYTHONPATH` cae el caso 2 —y solo
el 2—. El 1 mide que el resto del entorno sobrevive, que ninguna composicion
afecta; el 3 mide la conservacion de un PYTHONPATH previo, que sin composicion
es trivialmente cierta.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

# El bootstrap CANONICO de thyrox (`paths.reach.BOOTSTRAP`): ascenso con
# deteccion del marcador, no `parents[N]`. La aritmetica por offset acierta a
# UNA profundidad y falla en SILENCIO al mover el archivo un nivel.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402

OK = FAILED = 0


def check(name: str, expected: object, got: object) -> None:
    global OK, FAILED
    if expected == got:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLO {name} — esperado {expected!r} obtenido {got!r}")


print("== 1. el entorno heredado sobrevive ==")
_marca = "THYROX_TEST_CHILD_ENV_MARK"
os.environ[_marca] = "presente"
try:
    entorno = reach.child_env()
    check("1.1 conserva una clave ajena", "presente", entorno.get(_marca))
finally:
    os.environ.pop(_marca, None)

print("== 2. EL QUE DISCRIMINA: el subproceso importa el arbol ==")
# Sin PYTHONPATH compuesto esto es `ModuleNotFoundError`, que es exactamente
# lo que el hook del consumidor producia en silencio.
_limpio = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
_sonda = "import agents.agents_paths, hooks.error_log; print('alcanzado')"
_sin = subprocess.run([sys.executable, "-c", _sonda], env=_limpio,
                      capture_output=True, text=True)
check("2.1 sin composicion, el hijo NO alcanza", 1, _sin.returncode)

_con = subprocess.run([sys.executable, "-c", _sonda],
                      env=reach.child_env(base=_limpio),
                      capture_output=True, text=True)
check("2.2 con composicion, el hijo alcanza", 0, _con.returncode)
check("2.3 y lo dice", "alcanzado", _con.stdout.strip())

print("== 3. un PYTHONPATH previo se CONSERVA, no se pisa ==")
_previo = dict(_limpio, PYTHONPATH="/un/camino/ajeno")
_partes = reach.child_env(base=_previo)["PYTHONPATH"].split(os.pathsep)
check("3.1 el arbol va primero", str(reach.thyrox_root() / "src"), _partes[0])
check("3.2 y el previo sigue ahi", True, "/un/camino/ajeno" in _partes)

print("== 4. es idempotente: componer dos veces no duplica ==")
_dos = reach.child_env(base=reach.child_env(base=_limpio))["PYTHONPATH"]
check("4.1 una sola vez el arbol", 1,
      _dos.split(os.pathsep).count(str(reach.thyrox_root() / "src")))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
