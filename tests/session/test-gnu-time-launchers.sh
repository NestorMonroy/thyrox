#!/usr/bin/env bash
# GNU Time en los dos lanzadores del árbol: `bg.sh` y `run-task-pool.sh`.
#
# Hasta hoy sólo `headless-pool.sh` medía la memoria de lo que lanzaba. Los
# trabajos que de verdad pesan en esta máquina —la suite completa, un `tsc`
# de todo el árbol— pasaban por estos dos y no dejaban cifra, así que su
# `--memfree` seguía siendo una estimación. Contrato:
#
#   - con GNU Time, cada trabajo deja `<log>.time` con
#     «memoria-pico-KB pared-s usuario-s sistema-s»;
#   - el envoltorio va DENTRO: el código de salida del trabajo llega intacto
#     a su marcador;
#   - sin GNU Time el trabajo corre igual y lo declara: una medida ausente no
#     es un cero;
#   - `wait-jobs wait` publica la memoria pico junto al veredicto.
set -uo pipefail
# El payload de thyrox-bg va a la primitiva; aquí lo recibe su doble (managed_execution.sh).
THYROX_MANAGED_EXECUTION_RUNNER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/doubles/managed-execution-runner"
export THYROX_MANAGED_EXECUTION_RUNNER
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
ok=0; fallo=0
_es() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fallo=$((fallo+1)); fi; }
_contiene() { if [[ "$2" == *"$3"* ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — [$2] no contiene [$3]"; fallo=$((fallo+1)); fi; }

[[ "$(/usr/bin/time --version 2>&1)" == *"GNU Time"* ]] || {
  echo "SIN MEDIR: /usr/bin/time no es GNU Time (thyrox_toolchain_require_gnu_time)"; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# Sin esto la clave por clon del .env gana a la global y la suite escribe en el hogar real.
source "$(dirname "$THYROX_MANAGED_EXECUTION_RUNNER")/../../../src/lib/test_homes.sh"; thyrox_isolate_homes "$TMP"
export THYROX_JOBS_DIR="$TMP/jobs" THYROX_SESSION_LEDGER_DIR="$TMP/jobs"
export THYROX_RUNTIME_DIR="$TMP/runtime"
export THYROX_BACKGROUND_LOG_DIR="$TMP/logs"
# Reserva 200 MB y los toca: la memoria pico tiene que verlos.
RESERVA="python3 -c 'b = bytearray(200 * 1024 * 1024); b[::4096] = b\"x\" * len(b[::4096])'"

pico() { [[ -s "$1" ]] || { echo 0; return; }
         gawk 'NF && $1 ~ /^[0-9]+$/ { v = $1 } END { print v + 0 }' "$1"; }

echo "== 1. bg.sh: el trabajo deja su memoria pico =="
salida="$(bash bin/thyrox-bg start reserva --grace 0 --task TASK-THYROX-0001 --kind test -- bash -c "$RESERVA" 2>&1)"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
bash bin/thyrox-bg wait reserva >/dev/null 2>&1
_es "deja <log>.time" "$([[ -s "$log.time" ]] && echo si || echo no)" "si"
_es "la memoria pico ve los 200 MB" "$(( $(pico "$log.time") >= 200000 ))" "1"

echo "== 2. bg.sh: el código de salida llega intacto al marcador =="
salida="$(bash bin/thyrox-bg start sale7 --grace 0 --task TASK-THYROX-0001 --kind test -- bash -c 'exit 7' 2>&1)"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
bash bin/thyrox-bg wait sale7 >/dev/null 2>&1
_contiene "el marcador lleva el 7" "$(cat "$log")" "__BG_EXIT__=7"
_es "y la medida sigue legible" "$(( $(pico "$log.time") > 0 ))" "1"

echo "== 3. run-task-pool.sh: cada trabajo deja su memoria pico =="
printf '%s\n' "$RESERVA" 'exit 7' > "$TMP/cmds.txt"
salida="$(bash bin/run-task-pool --width 2 --timeout 120 "$TMP/cmds.txt" 2>&1)"
dir="$(sed -n 's/^run-task-pool: .*logs en //p' <<<"$salida" | head -1)"
primero="$(ls "$dir"/*-001.log 2>/dev/null | head -1)"; segundo="$(ls "$dir"/*-002.log 2>/dev/null | head -1)"
_es "el primero deja <log>.time" "$([[ -s "$primero.time" ]] && echo si || echo no)" "si"
_es "y ve los 200 MB" "$(( $(pico "$primero.time") >= 200000 ))" "1"
_contiene "el segundo conserva su EXIT=7" "$(cat "$segundo" 2>/dev/null)" "EXIT=7"

echo "== 4. wait-jobs publica la memoria pico junto al veredicto =="
_contiene "la linea de memoria sale en la barrera" "$salida" "memoria pico:"

echo "== 5. sin GNU Time: corre igual, no deja .time y lo declara =="
salida="$(THYROX_TOOLCHAIN_TIME_BIN=/bin/true bash bin/thyrox-bg start sin-time --grace 0 --task TASK-THYROX-0001 --kind test -- true 2>&1)"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
bash bin/thyrox-bg wait sin-time >/dev/null 2>&1
_contiene "el trabajo terminó con su marcador" "$(cat "$log")" "__BG_EXIT__=0"
_es "no deja .time" "$([[ -e "$log.time" ]] && echo si || echo no)" "no"
_contiene "y declara que no midió" "$salida" "sin GNU Time"

echo "== 6. medir NO contamina el entorno del trabajo =="
# Episodio: los lanzadores cargaban `toolchain.sh` para preguntar por GNU Time
# y cada trabajo heredaba sus defaults exportados; un
# `THYROX_TOOLCHAIN_INTERPRETER_PATH` que nadie declaro tumbo 3 de 6 casos de
# `test-toolchain-sh.sh`. El trabajo ve el entorno de quien lo lanzo, no el de
# la cadena de herramientas.
salida="$(env -u THYROX_TOOLCHAIN_INTERPRETER_PATH bash bin/thyrox-bg start entorno --grace 0 --task TASK-THYROX-0001 --kind test -- \
            bash -c 'echo "heredada=[${THYROX_TOOLCHAIN_INTERPRETER_PATH-ausente}]"' 2>&1)"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
bash bin/thyrox-bg wait entorno >/dev/null 2>&1
_contiene "bg.sh: el trabajo no hereda la cadena de herramientas" "$(cat "$log")" "heredada=[ausente]"
printf '%s\n' 'echo "heredada=[${THYROX_TOOLCHAIN_INTERPRETER_PATH-ausente}]"' > "$TMP/entorno.txt"
salida="$(env -u THYROX_TOOLCHAIN_INTERPRETER_PATH bash bin/run-task-pool --width 1 --timeout 60 "$TMP/entorno.txt" 2>&1)"
_contiene "run-task-pool: el trabajo no hereda la cadena de herramientas" "$salida" "heredada=[ausente]"

printf '\ntest-gnu-time-launchers: %d ok, %d falla(s)\n' "$ok" "$fallo"
[[ "$fallo" -eq 0 ]]
