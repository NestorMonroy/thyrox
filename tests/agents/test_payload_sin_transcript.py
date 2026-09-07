#!/usr/bin/env python3
"""Cuando el transcript no existe, la fila guarda lo que el payload SI trae.

MITAD ROJA. Medido hoy sobre `kaupamex-docs/.claude/agent-results/`:

  - 107 filas nuevas en `agent_sessions`. 39 completas, 68 vacias — y las tres
    carencias (sin modelo, `subagent_type='desconocido'`, sin telemetria) son
    EXACTAMENTE las mismas 68 filas, verificado por conjuncion.
  - La correlacion con el disco es perfecta: 39 con transcript -> las 39 con
    modelo; 68 sin transcript -> ninguna. Cero en las casillas cruzadas.
  - Por procedencia: `source='reconciliacion'` 389 de 396 con modelo (98 %);
    `source='hook'` 24 de 776 (3 %).
  - El reconciliador alcanza 122 de 122 transcripts en disco. Las 68 estan
    ESTRUCTURALMENTE fuera de su alcance: lee de disco, y ahi no hay nada.

Asi que la fila no se puede completar. Lo que si se puede es dejar de estar
VACIA: el payload de `SubagentStop` trae hechos de la ejecucion que hoy se
descartan. La fila guarda `claves_de_payload` —los NOMBRES— y tira los
valores.

Lo que este cambio NO hace, y es deliberado: guardar `last_assistant_message`.
El guion ya declara por que (linea ~783): «Nombres y no valores por dos
razones: un valor puede traer contenido de la sesion (la lista blanca del
anonimizador, tarea #662)». El mensaje final ES contenido de sesion. Se guarda
su LONGITUD, que es un hecho de la ejecucion y no dice que decia.

`effort` y `permission_mode` tampoco son contenido: son como se PIDIO que
corriera el agente. Sin ellos, una fila sin transcript no distingue un agente
en `low` de uno en `max`.

CONTROL DE ANULACION: si `execution_facts` volviera a devolver {}, caen los
casos 2, 3 y 4 —y no el 1, que mide la conducta con transcript presente— asi
que el verde distingue «guarda los hechos» de «no rompe nada».
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "register_session", HERE / "src" / "agents" / "register_session.py")
reg = importlib.util.module_from_spec(spec)
sys.modules["register_session"] = reg
spec.loader.exec_module(reg)

OK = FALLOS = 0


def check(etiqueta, esperado, obtenido):
    global OK, FALLOS
    if esperado == obtenido:
        print(f"  ok    {etiqueta}"); OK += 1
    else:
        print(f"  FALLO {etiqueta}\n        esperado=[{esperado}]\n        obtenido=[{obtenido}]")
        FALLOS += 1


print("== 1. con transcript presente NO se anaden hechos de respaldo ==")
# El camino que ya funciona no cambia: si el transcript esta, el uso real sale
# de el y estos campos serian ruido.
check("vacio cuando el transcript existe", {},
      reg.execution_facts({"effort": "high"}, transcript_presente=True))

print("== 2. sin transcript, se guardan los hechos de la ejecucion ==")
payload = {"effort": "low", "permission_mode": "acceptEdits",
           "last_assistant_message": "hola mundo", "agent_id": "x"}
m = reg.execution_facts(payload, transcript_presente=False)
check("effort", "low", m.get("effort"))
check("permission_mode", "acceptEdits", m.get("permission_mode"))

print("== 3. del mensaje final se guarda la LONGITUD, nunca el texto ==")
check("longitud", 10, m.get("longitud_mensaje_final"))
check("el texto NO aparece en ningun valor", True,
      all("hola mundo" not in str(v) for v in m.values()))

print("== 4. lo ausente no se inventa ==")
m2 = reg.execution_facts({"agent_id": "x"}, transcript_presente=False)
check("sin effort no hay clave effort", False, "effort" in m2)
check("sin mensaje, longitud 0 declarada", 0, m2.get("longitud_mensaje_final"))

print(f"\n{OK} ok, {FALLOS} fallos")
raise SystemExit(1 if FALLOS else 0)
