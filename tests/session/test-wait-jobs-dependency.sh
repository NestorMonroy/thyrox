#!/bin/bash
# Dependencia declarada al lanzar — `register --after-ok` + `dispatch`.
#
# TASK-THYROX-0011. El defecto que cierra: la barrera sólo sabía «lanza N,
# espera a TODOS», y ordenar dos trabajos exigía BLOQUEAR el primer plano.
# `qsub -W depend=afterok:$JOBID` lo resuelve declarando la arista al enviar.
#
# EL CONTROL QUE DISCRIMINA (caso 3): un predecesor que FALLA tiene que dejar
# al dependiente SIN ARRANCAR **y decirlo**. Un dependiente que simplemente no
# arranca es indistinguible de uno que nunca se registró — sub-patrón D.

set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
source "$_thyrox_root/src/lib/fixture.sh"
cd "$(thyrox_root)" || exit 1

GUION=src/session/wait-jobs.sh
export ESPERAR_INTERVALO=1
OK=0; FALLO=0
afirmar() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( OK++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ )); fi
}

echo "== 1. declarar la arista NO lanza el dependiente =="
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
TESTIGO=$(mktemp -u); fixture_adopt "$TESTIGO"   # si arranca, existe
LA=$(fixture_file); nohup bash -c "sleep 2; echo EXIT=0" >"$LA" 2>&1 & PA=$!; disown $PA
bash "$GUION" register primero "$LA" "$PA" >/dev/null
LB=$(fixture_file)
bash "$GUION" register segundo "$LB" --after-ok primero --run "touch $TESTIGO" >/dev/null
afirmar "el dependiente NO arrancó al registrarlo" "ausente" \
    "$( [[ -e "$TESTIGO" ]] && echo presente || echo ausente )"
# El veredicto se toma sobre una VARIABLE, no sobre la tuberia: `status` sale 1
# cuando queda trabajo pendiente y `set -o pipefail` haria que la tuberia
# heredara ese 1 aunque el grep SI encuentre. Medido: mismo texto, `1` con
# pipefail y `0` sin el. Es el defecto de la tarea #148.
EST=$(bash "$GUION" status 2>&1)
grep -q "segundo .*BLOQUEADO" <<<"$EST"
afirmar "status lo muestra BLOQUEADO" 0 $?

echo "== 2. cuando el predecesor termina bien, dispatch lo lanza =="
sleep 3
bash "$GUION" dispatch >/dev/null 2>&1
sleep 1
afirmar "tras dispatch, el dependiente SÍ arrancó" "presente" \
    "$( [[ -e "$TESTIGO" ]] && echo presente || echo ausente )"

echo "== 3. CONTROL — un predecesor que FALLA no arranca al dependiente, y lo DICE =="
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
T2=$(mktemp -u); fixture_adopt "$T2"
LC=$(fixture_file); nohup bash -c "echo arrancando; sleep 1; kill -9 \$\$" >"$LC" 2>&1 & PC=$!; disown $PC
bash "$GUION" register malo "$LC" "$PC" >/dev/null
LD=$(fixture_file)
bash "$GUION" register hijo "$LD" --after-ok malo --run "touch $T2" >/dev/null
sleep 3
SALIDA=$(bash "$GUION" dispatch 2>&1)
afirmar "el dependiente NO arrancó" "ausente" \
    "$( [[ -e "$T2" ]] && echo presente || echo ausente )"
grep -q "CANCELADO.*hijo" <<<"$SALIDA"
afirmar "dispatch DICE que lo canceló (no calla)" 0 $?
grep -qi "malo" <<<"$SALIDA"
afirmar "nombra al predecesor que falló" 0 $?

echo "== 3b. CONTROL — un predecesor que ASIENTA con codigo != 0 no es afterok =="
# El marcador dice «termino», no «termino bien». `qsub -W depend=afterok`
# exige salida 0; medido en el paso 155: un pipeline que salio con
# `__BG_EXIT__=3` (gate 3b bloqueado) quedo asentado OK, y una arista sobre el
# habria lanzado al siguiente sobre una base sin asentar.
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
T3=$(mktemp -u); fixture_adopt "$T3"
LX=$(fixture_file); printf 'trabajo\nEXIT=3\n' > "$LX"
bash "$GUION" register asentado_mal "$LX" >/dev/null
LY=$(fixture_file)
bash "$GUION" register hijo3 "$LY" --after-ok asentado_mal --run "touch $T3" >/dev/null
SALIDA=$(bash "$GUION" dispatch 2>&1)
sleep 1
afirmar "con EXIT=3 el dependiente NO arranco" "ausente" \
    "$( [[ -e "$T3" ]] && echo presente || echo ausente )"
grep -q "CANCELADO.*hijo3.*asentado_mal.*3" <<<"$SALIDA"
afirmar "y dispatch lo dice, con el predecesor y su codigo" 0 $?
LZ=$(fixture_file); printf '__BG_EXIT__=0\n' > "$LZ"
bash "$GUION" register bien_bg "$LZ" --marker '^__BG_EXIT__=[0-9]+' >/dev/null
T4=$(mktemp -u); fixture_adopt "$T4"
bash "$GUION" register hijo4 "$(fixture_file)" --after-ok bien_bg --run "touch $T4" >/dev/null
bash "$GUION" dispatch >/dev/null 2>&1
sleep 1
afirmar "con el marcador de bg.sh y codigo 0 SI arranca" "presente" \
    "$( [[ -e "$T4" ]] && echo presente || echo ausente )"

echo "== 4. un CANCELADO no deja el turno bloqueado para siempre =="
# Se aisla: en el caso 3 el ledger conserva ademas a `malo`, que es un BAIL sin
# recoger y SI debe seguir pendiente. Medir los dos juntos no distinguiria
# "cancelado no bloquea" de "nada bloquea".
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
LE=$(fixture_file); printf 'EXIT=0\n' > "$LE"
bash "$GUION" register pred "$LE" >/dev/null
LF=$(fixture_file)
bash "$GUION" register colgado "$LF" --after-ok pred --run "true" >/dev/null
bash "$GUION" pending >/dev/null 2>&1
afirmar "un BLOQUEADO SI mantiene el turno bloqueado" 1 $?
# Se fuerza la cancelacion reescribiendo la arista a un predecesor que fallo.
LG=$(fixture_file); printf 'muerto sin marcador\n' > "$LG"
bash "$GUION" register roto "$LG" 999999 >/dev/null
sed -i 's/^after_ok=pred$/after_ok=roto/' "$THYROX_JOBS_DIR/colgado.job"
bash "$GUION" dispatch >/dev/null 2>&1
bash "$GUION" forget roto >/dev/null 2>&1
bash "$GUION" forget pred  >/dev/null 2>&1
bash "$GUION" pending >/dev/null 2>&1
afirmar "solo un CANCELADO -> pending sale 0" 0 $?
EST=$(bash "$GUION" status 2>&1)   # misma razon que el caso 1: pipefail invierte
grep -q "CANCELADO" <<<"$EST"
afirmar "pero status SIGUE mostrandolo" 0 $?


echo
echo "== 6. lo LANZADO sobrevive al shell que lo lanzo: es LIDER de su grupo =="
# El control que faltaba, y el defecto que cierra (TASK-THYROX-0502): el caso 5
# mide que `dispatch` LANZA, no que lo lanzado SOBREVIVA. Son dos cosas, y la
# suite pasaba con el defecto presente porque medía sólo la primera.
#
# Un trabajo lanzado sin `setsid` queda en el grupo de procesos del lanzador:
# `disown` lo retira de la tabla de jobs del shell, no del grupo. Una señal
# dirigida al grupo —lo que hace el harness al terminar una llamada de
# herramienta— lo alcanza igual, y el síntoma es MUDO: log vacío y BAIL.
#
# Se mide `pgid == pid` sobre el propio trabajo, que es lo que «líder de su
# grupo» significa, y no `pgid != pgid del lanzador`: esto último es cierto
# también de un nieto cualquiera y no discriminaría.
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
LH=$(fixture_file); printf 'EXIT=0\n' > "$LH"
bash "$GUION" register padre "$LH" >/dev/null
GRUPO=$(fixture_file)
LI=$(fixture_file)
bash "$GUION" register hijo "$LI" --after-ok padre \
    --run "ps -o pid=,pgid= -p \$\$ > $GRUPO" >/dev/null
bash "$GUION" dispatch >/dev/null 2>&1
for _ in 1 2 3 4 5 6 7 8 9 10; do [[ -s "$GRUPO" ]] && break; sleep 0.3; done

LEIDO=$(tr -s ' ' < "$GRUPO" | sed 's/^ *//')
HIJO_PID=${LEIDO%% *}; HIJO_PGID=${LEIDO##* }
afirmar "el dependiente arrancó y dejó su medición" "medido" \
    "$( [[ -n "$HIJO_PID" ]] && echo medido || echo ausente )"
afirmar "y es LIDER de su propio grupo (pgid == pid)" "$HIJO_PID" "$HIJO_PGID"
bash "$GUION" forget padre >/dev/null 2>&1
bash "$GUION" forget hijo  >/dev/null 2>&1
echo
printf 'resumen: %d ok, %d fallo(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
