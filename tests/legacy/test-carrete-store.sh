#!/usr/bin/env bash
# Prueba del carrete de escritura fallida (#652) — `heng: part7/ch29.md` §29.3.
#
# Por que existe: el envoltorio de los hooks nunca rompe el flujo, pero "no
# romper" se habia implementado como "descartar" — el fallo quedaba en un log
# de prosa y el dato no volvia. El carrete persiste el evento y lo reenvia al
# arrancar.
#
# EL FALLO ES REAL, NO SIMULADO. Se inyecta creando `agent_store.sqlite3` como
# DIRECTORIO: sqlite no puede abrirlo y `actualizar-sesion` sale 1 con
# `unable to open database file`. Es reversible con un `rmdir`, que es lo que
# permite probar el reenvio contra el mismo store que acaba de fallar.
#
# CADA caso declara que lo haria fallar, por el sub-patron D de
# `metrica-decide-la-conclusion.md`. Los casos 3, 7 y 9 son CONTROLES ANULADOS:
# retiran la pieza y comprueban que el dato se pierde, que es la unica forma
# de demostrar que el carrete es lo que lo salva.
#
# LA PRUEBA NO TOCA NINGUN ARTEFACTO COMPARTIDO. Store, carrete y raiz de
# transcripts se desvian a un mktemp -d; ver el caso 9 para por que los tres.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"          # .claude/
STORE_CLI="$RAIZ/scripts/agents/agent_store.py"
DRENADOR="$RAIZ/scripts/agents/drenar_carrete.py"
fallos=0
casos=0

fallar() { echo "  FALLO: $*"; fallos=$((fallos + 1)); }
caso()   { casos=$((casos + 1)); }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HOOK_SPOOL_PATH="$TMP/carrete.jsonl"

# Un destino de store propio: la prueba jamas escribe en el store real.
DESTINO="$TMP/claude"
mkdir -p "$DESTINO/agent-results"

romper()  { rm -f  "$DESTINO/agent-results/agent_store.sqlite3"
            mkdir -p "$DESTINO/agent-results/agent_store.sqlite3"; }
reparar() { rmdir "$DESTINO/agent-results/agent_store.sqlite3" 2>/dev/null; }

# Emite una escritura al store a traves de `run_and_log`, que es el camino
# real del hook. $1 = agent_id ; $2 = "spool"|"sin-spool"
escribir() {
  HOOK_SPOOL_PATH="$HOOK_SPOOL_PATH" python3 - "$RAIZ" "$STORE_CLI" "$DESTINO" "$1" "$2" <<'PY'
import sys
sys.path.insert(0, f"{sys.argv[1]}/hooks")
from hook_error_log import run_and_log
cmd = [sys.executable, sys.argv[2], "actualizar-sesion",
       "--claude-dir", sys.argv[3], "--agent-id", sys.argv[4],
       "--status", "completed", "--crear-si-falta"]
run_and_log("prueba-carrete", cmd, spool=(sys.argv[5] == "spool"))
PY
}

lineas_carrete() { [[ -f "$HOOK_SPOOL_PATH" ]] && grep -c . "$HOOK_SPOOL_PATH" || echo 0; }
en_store() {   # $1 = agent_id ; imprime 1 si la fila existe
  python3 - "$DESTINO/agent-results/agent_store.sqlite3" "$1" <<'PY'
import pathlib, sqlite3, sys
db = pathlib.Path(sys.argv[1])
if not db.is_file():
    print(0); raise SystemExit
c = sqlite3.connect(db)
try:
    print(next(c.execute(
        "SELECT count(*) FROM agent_sessions WHERE agent_id=?", (sys.argv[2],)))[0])
except sqlite3.OperationalError:
    print(0)
PY
}

echo "== caso 1: la escritura falla de verdad y el evento se encola =="
# Falla si: el store roto NO produce exit != 0 (entonces la prueba mide un
# fallo imaginario), o si `_spool` no apenda nada.
caso
romper
escribir aencolado111 spool
n="$(lineas_carrete)"
[[ "$n" == "1" ]] || fallar "esperaba 1 evento en el carrete, hay $n"
if [[ -f "$HOOK_SPOOL_PATH" ]]; then
  python3 - "$HOOK_SPOOL_PATH" <<'PY' || exit 0
import json, sys
ev = json.loads(open(sys.argv[1]).read().splitlines()[0])
assert isinstance(ev["cmd"], list), "el cmd debe ser lista, no texto concatenado"
assert "aencolado111" in ev["cmd"], "el agent_id no viaja en el evento"
assert ev["attempts"] == 0, "el contador de intentos nace en 0"
PY
  grep -q '"cmd": \[' "$HOOK_SPOOL_PATH" || fallar "el cmd no se guardo como lista JSON"
fi

echo "== caso 2: reparado el destino, el drenado reenvia y la fila aparece =="
# Falla si: el drenador no re-ejecuta el cmd, o lo re-ejecuta y no retira el
# evento del carrete (lo reenviaria por siempre).
caso
reparar
salida="$(python3 "$DRENADOR" --quiet)"
[[ "$salida" == *"1 reenviados"* ]] || fallar "esperaba '1 reenviados', obtuve: $salida"
[[ "$(en_store aencolado111)" == "1" ]] || fallar "la fila no aterrizo en el store tras el reenvio"
[[ "$(lineas_carrete)" == "0" ]] || fallar "el evento reenviado sigue en el carrete"

echo "== caso 3: CONTROL ANULADO — sin carrete, el dato se pierde =="
# El caso que prueba que el carrete es lo que salva el dato. Mismo fallo, sin
# encolar: tras reparar y drenar, la fila NO existe. Si apareciera, algun otro
# camino la estaria escribiendo y el caso 2 no probaria nada.
caso
romper
escribir aperdido222 sin-spool
[[ "$(lineas_carrete)" == "0" ]] || fallar "sin spool=True no debe encolarse nada"
reparar
python3 "$DRENADOR" --quiet >/dev/null
if [[ "$(en_store aperdido222)" != "0" ]]; then
  fallar "la fila aparecio sin carrete — el caso 2 no prueba lo que dice"
fi

echo "== caso 4: un evento irreenviable se abandona al agotar los intentos =="
# Falla si: el contador no se incrementa (se reintentaria eternamente) o si el
# evento se descarta al primer fallo (perdiendo un reenvio que podria servir).
caso
export HOOK_SPOOL_MAX_ATTEMPTS=2
romper
escribir aterco333 spool
uno="$(python3 "$DRENADOR" --quiet)"      # falla: queda pendiente con attempts=1
[[ "$uno" == *"0 reenviados"*  ]] || fallar "1er drenado: esperaba 0 reenviados — $uno"
[[ "$uno" == *"1 pendientes"*  ]] || fallar "1er drenado: el evento debe conservarse — $uno"
dos="$(python3 "$DRENADOR" --quiet)"      # falla otra vez: alcanza el tope
[[ "$dos" == *"1 abandonados"* ]] || fallar "2o drenado: esperaba 1 abandonado — $dos"
[[ "$(lineas_carrete)" == "0" ]] || fallar "el evento abandonado sigue en el carrete"
unset HOOK_SPOOL_MAX_ATTEMPTS
reparar

echo "== caso 5: el carrete no crece sin fin =="
# Falla si: el tope no se respeta. Un fallo sistematico produciria una entrada
# por subagente hasta llenar el disco — peor que el evento que el carrete salva.
caso
export HOOK_SPOOL_MAX_ENTRIES=2
romper
for i in 1 2 3 4; do escribir "atope$i" spool; done
n="$(lineas_carrete)"
[[ "$n" == "2" ]] || fallar "con tope 2 esperaba 2 entradas, hay $n"
unset HOOK_SPOOL_MAX_ENTRIES
reparar
rm -f "$HOOK_SPOOL_PATH"

echo "== caso 6: una escritura que funciona NO encola nada =="
# Falla si: `_spool` corre en el camino de exito. Un carrete que acumula
# eventos ya aplicados los reenviaria en cada arranque, sin fin y sin efecto.
caso
escribir asano444 spool
[[ "$(lineas_carrete)" == "0" ]] || fallar "una escritura exitosa no debe encolar"
[[ "$(en_store asano444)" == "1" ]] || fallar "la escritura exitosa no aterrizo"

echo "== caso 7: CONTROL ANULADO — el hook real encola su propio fallo =="
# Prueba el CABLEADO, no la funcion: se ejercita register_agent_session.py de
# punta a punta contra el destino roto. Falla si el hook no pasa spool=True —
# que es exactamente el defecto que #652 corrige, y que un test de la funcion
# aislada no puede ver.
caso
rm -f "$HOOK_SPOOL_PATH"
romper
printf '{"agent_id":"ahook555","agent_type":"general-purpose","session_id":"s1"}' \
  | AGENT_STORE_CLAUDE_DIR="$DESTINO" HOOK_SPOOL_PATH="$HOOK_SPOOL_PATH" \
    python3 "$RAIZ/hooks/register_agent_session.py" --stop >/dev/null 2>&1
n="$(lineas_carrete)"
[[ "$n" -ge 1 ]] || fallar "el hook no encolo su escritura fallida (cableado ausente)"
reparar
python3 "$DRENADOR" --quiet >/dev/null
[[ "$(en_store ahook555)" == "1" ]] || fallar "el evento del hook no se pudo reenviar"

echo "== caso 8: una linea corrupta no tumba el drenado =="
# Falla si: el drenador aborta ante JSON invalido. El carrete lo escribe un
# hook BAJO FALLO — el escenario donde una escritura puede quedar a medias — y
# abortar perderia todos los eventos sanos del archivo.
caso
romper
escribir asano666 spool
printf '{"cmd": [roto\n' >> "$HOOK_SPOOL_PATH"
reparar
salida="$(python3 "$DRENADOR" --quiet 2>&1)"
[[ "$salida" == *"1 reenviados"* ]] || fallar "la linea corrupta impidio el reenvio: $salida"

echo "== caso 9: CONTROL ANULADO — el hook de CIERRE DE TURNO tambien drena =="
# El segundo disparador (#651). Drenar solo al arrancar deja un evento
# encolado esperando a la proxima sesion; este slot dispara por TURNO.
#
# Prueba el CABLEADO del hook de Stop, no el drenador aislado: falla si
# reconciliar-store-al-cerrar.sh no invoca drenar_carrete.py. Es el mismo
# control que el caso 7 aplica al otro extremo del turno.
#
# El hook corre TAMBIEN el reconciliador. Se le desvian sus DOS acoplamientos,
# no uno: donde escribe (AGENT_STORE_CLAUDE_DIR) y de donde lee
# (AGENT_STORE_PROJECTS_DIR, aqui vacio). Desviar solo el store lo dejaria
# leyendo el corpus real contra una base vacia — intentaria dar de alta cada
# transcript del disco, que es mas caro que tocar el store real. Ver #655.
caso
rm -f "$HOOK_SPOOL_PATH"
mkdir -p "$TMP/proyectos"
romper
escribir acierre777 spool
[[ "$(lineas_carrete)" == "1" ]] || fallar "el evento no se encolo para el caso 9"
reparar
HOOK_SPOOL_PATH="$HOOK_SPOOL_PATH" \
  AGENT_STORE_CLAUDE_DIR="$DESTINO" AGENT_STORE_PROJECTS_DIR="$TMP/proyectos" \
  bash "$RAIZ/hooks/reconciliar-store-al-cerrar.sh" >/dev/null 2>&1
[[ "$(en_store acierre777)" == "1" ]] || fallar "el hook de cierre no drena el carrete (cableado ausente)"
[[ "$(lineas_carrete)" == "0" ]] || fallar "el evento sigue en el carrete tras el cierre de turno"

echo
if [[ $fallos -eq 0 ]]; then
  echo "OK: $casos de $casos casos en verde"
  exit 0
fi
echo "FALLO: $fallos de $casos casos"
exit 1
