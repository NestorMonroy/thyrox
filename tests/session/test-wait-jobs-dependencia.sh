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
cd "$(thyrox_root)" || exit 1

GUION=src/session/wait-jobs.sh
export ESPERAR_INTERVALO=1
OK=0; FALLO=0
afirmar() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( OK++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ )); fi
}

echo "== 1. declarar la arista NO lanza el dependiente =="
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
TESTIGO=$(mktemp -u)   # si el dependiente arranca, existe
LA=$(mktemp); nohup bash -c "sleep 2; echo EXIT=0" >"$LA" 2>&1 & PA=$!; disown $PA
bash "$GUION" register primero "$LA" "$PA" >/dev/null
LB=$(mktemp)
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
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
T2=$(mktemp -u)
LC=$(mktemp); nohup bash -c "echo arrancando; sleep 1; kill -9 \$\$" >"$LC" 2>&1 & PC=$!; disown $PC
bash "$GUION" register malo "$LC" "$PC" >/dev/null
LD=$(mktemp)
bash "$GUION" register hijo "$LD" --after-ok malo --run "touch $T2" >/dev/null
sleep 3
SALIDA=$(bash "$GUION" dispatch 2>&1)
afirmar "el dependiente NO arrancó" "ausente" \
    "$( [[ -e "$T2" ]] && echo presente || echo ausente )"
grep -q "CANCELADO.*hijo" <<<"$SALIDA"
afirmar "dispatch DICE que lo canceló (no calla)" 0 $?
grep -qi "malo" <<<"$SALIDA"
afirmar "nombra al predecesor que falló" 0 $?

echo "== 4. un CANCELADO no deja el turno bloqueado para siempre =="
# Se aisla: en el caso 3 el ledger conserva ademas a `malo`, que es un BAIL sin
# recoger y SI debe seguir pendiente. Medir los dos juntos no distinguiria
# "cancelado no bloquea" de "nada bloquea".
KX_TRABAJOS_DIR=$(mktemp -d); export KX_TRABAJOS_DIR
LE=$(mktemp); printf 'EXIT=0\n' > "$LE"
bash "$GUION" register pred "$LE" >/dev/null
LF=$(mktemp)
bash "$GUION" register colgado "$LF" --after-ok pred --run "true" >/dev/null
bash "$GUION" pending >/dev/null 2>&1
afirmar "un BLOQUEADO SI mantiene el turno bloqueado" 1 $?
# Se fuerza la cancelacion reescribiendo la arista a un predecesor que fallo.
LG=$(mktemp); printf 'muerto sin marcador\n' > "$LG"
bash "$GUION" register roto "$LG" 999999 >/dev/null
sed -i 's/^after_ok=pred$/after_ok=roto/' "$KX_TRABAJOS_DIR/colgado.job"
bash "$GUION" dispatch >/dev/null 2>&1
bash "$GUION" forget roto >/dev/null 2>&1
bash "$GUION" forget pred  >/dev/null 2>&1
bash "$GUION" pending >/dev/null 2>&1
afirmar "solo un CANCELADO -> pending sale 0" 0 $?
EST=$(bash "$GUION" status 2>&1)   # misma razon que el caso 1: pipefail invierte
grep -q "CANCELADO" <<<"$EST"
afirmar "pero status SIGUE mostrandolo" 0 $?

echo
printf 'resumen: %d ok, %d fallo(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
