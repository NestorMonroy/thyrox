#!/bin/bash
# El pool espera SOLO sus trabajos — `wait --only <prefijo>`.
#
# TASK-THYROX-0083. El defecto que cierra: `run-task-pool.sh` cerraba con
# `wait-jobs wait` sin filtro, que globea TODO el ledger. Lanzado a traves de
# `bg.sh`, el propio pool esta registrado ahi — asi que se esperaba a si mismo,
# nunca asentaba, y agotaba su timeout entero aunque sus hijos ya hubieran
# terminado. Medido en el episodio que lo origina: el pool `triage2` vivo 7:09
# con sus 18 hijos asentados desde el primer minuto.
#
# EL CONTROL QUE DISCRIMINA (caso 1): un tercero VIVO y SIN MARCADOR en el mismo
# ledger. Sin el, un pool que ignorase el filtro pasaria igual — el verde no
# separaria «espera solo lo suyo» de «no habia nada mas que esperar», que es el
# sub-patron D con este mismo test como sujeto.

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

POOL=src/session/run-task-pool.sh
BARRERA=src/session/wait-jobs.sh
export ESPERAR_INTERVALO=1
OK=0; FALLO=0
afirmar() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( OK++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ )); fi
}

# Un tercero que NUNCA asienta: vivo, sin marcador. Es el control.
SENTINEL_PID=""
spawn_sentinel() {
    local log; log=$(fixture_file)
    nohup bash -c 'sleep 300' >"$log" 2>&1 & SENTINEL_PID=$!; disown $SENTINEL_PID
    bash "$BARRERA" register sentinel "$log" "$SENTINEL_PID" >/dev/null
}
kill_sentinel() { [[ -n "$SENTINEL_PID" ]] && kill -9 "$SENTINEL_PID" 2>/dev/null; return 0; }
trap kill_sentinel EXIT
fixture_arm   # compone: `trap` reemplaza, no acumula

echo "== 1. CONTROL — con un tercero vivo en el ledger, el pool NO lo espera =="
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
export THYROX_SESSION_LEDGER_DIR="$THYROX_JOBS_DIR"
THYROX_BACKGROUND_LOG_DIR=$(fixture_dir); export THYROX_BACKGROUND_LOG_DIR
spawn_sentinel
CMDS=$(fixture_file); printf '%s\n' "true" "true" > "$CMDS"
T0=$(date +%s)
bash "$POOL" --timeout 25 --dir "$THYROX_BACKGROUND_LOG_DIR" --prefix lote "$CMDS" >/dev/null 2>&1
RC=$?
T1=$(date +%s)
afirmar "el pool asienta sus dos trabajos y sale 0" 0 "$RC"
afirmar "y no agota el timeout esperando al tercero" "rapido" \
    "$( (( T1 - T0 < 20 )) && echo rapido || echo agotado )"

echo "== 2. el tercero SIGUE en el ledger — el pool no lo recogio ni lo retiro =="
# El veredicto se toma sobre una VARIABLE, no sobre la tuberia: `status` sale 1
# cuando queda trabajo pendiente y `set -o pipefail` haria que la tuberia
# heredara ese 1 aunque el grep SI encuentre. Es el defecto de la tarea #148.
EST=$(bash "$BARRERA" status 2>&1)
grep -q "sentinel" <<<"$EST"
afirmar "sentinel sigue registrado tras el pool" 0 $?
grep -q "lote-001" <<<"$EST"
afirmar "pero los del pool ya no estan (los recogio)" 1 $?

echo "== 3. sin --only, la barrera SIGUE viendo todo el ledger =="
# El default no cambia: quien llame `wait` a secas espera a todos.
bash "$BARRERA" wait --timeout 3 >/dev/null 2>&1
afirmar "wait sin filtro se topa con el sentinel y sale 3 (timeout)" 3 $?

echo "== 4. --only ve una etiqueta LLANA, no solo un grupo con guion =="
# `bg.sh register <nombre>` produce etiquetas SIN sufijo (`pyreds`, no
# `pyreds-001`), que es la forma que el flujo documentado start/register/wait
# genera. El glob `$only-*.job` no las ve: la barrera publicaba «sin trabajos
# registrados» y salia 0 sobre un trabajo que SI estaba en el ledger.
# Control positivo real, no fabricado: es el flujo que esta suite ya prescribe.
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
export THYROX_SESSION_LEDGER_DIR="$THYROX_JOBS_DIR"
LOG_LLANO=$(fixture_file)
nohup bash -c 'echo EXIT=0' >"$LOG_LLANO" 2>&1 & PID_LLANO=$!; disown $PID_LLANO
bash "$BARRERA" register pyreds "$LOG_LLANO" "$PID_LLANO" >/dev/null
SALIDA=$(bash "$BARRERA" wait --timeout 10 --only pyreds 2>&1)
RC_LLANO=$?
afirmar "wait --only <etiqueta llana> la asienta y sale 0" 0 "$RC_LLANO"
grep -q "sin trabajos registrados" <<<"$SALIDA"
afirmar "y NO publica «sin trabajos registrados» sobre un trabajo real" 1 $?

echo "== 5. el grupo con guion sigue funcionando — el default no se rompe =="
THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
export THYROX_SESSION_LEDGER_DIR="$THYROX_JOBS_DIR"
LOG_GRUPO=$(fixture_file)
nohup bash -c 'echo EXIT=0' >"$LOG_GRUPO" 2>&1 & PID_GRUPO=$!; disown $PID_GRUPO
bash "$BARRERA" register lote-001 "$LOG_GRUPO" "$PID_GRUPO" >/dev/null
bash "$BARRERA" wait --timeout 10 --only lote >/dev/null 2>&1
afirmar "wait --only <prefijo> sigue viendo su grupo <prefijo>-NNN" 0 $?

kill_sentinel
echo
printf 'resumen: %d ok, %d fallo(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
