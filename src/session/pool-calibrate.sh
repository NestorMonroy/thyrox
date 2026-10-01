#!/usr/bin/env bash
# pool-calibrate — llena el historial de una plantilla midiendo `thyrox -p`
# contra el proxy local, sin credencial real.
#
#   printf '%s\n' <items> | bash bin/pool-calibrate --prompt <plantilla.md> \
#       --task-class <clase> --runs N [--width W] [--out <dir>]
#
# GNU Time mide el proceso LOCAL de cada ítem; el modelo corre en el servidor.
# Por eso un servidor de loopback (`bin/provider-anthropic-mock-server`) basta
# para calibrar la RAM que `headless-pool` deriva de su historial: cada
# ejecución deja su fila, con la huella de la plantilla, y la siguiente
# ejecución real parte de ella.
#
# El ítem recibe un marcador local como clave de API y NINGUNA credencial del
# anfitrión: `resolveCredential` prefiere `ANTHROPIC_AUTH_TOKEN` y el token
# OAuth a la clave, así que se retiran del entorno antes de lanzar. El proxy
# registra la clase de credencial que llegó, y un ítem que no le habló no se
# da por medido: sale 1.
#
# Salidas: 0 medido · 1 algún ítem falló o ninguno llegó al proxy · 2 no se
# pudo medir (sin GNU Time, argumentos, el proxy no arrancó).
#
# *Métrica:* memoria residente pico por ítem contra respuestas mínimas.
# *Ciega a:* el tamaño de una respuesta real y lo que añaden las herramientas
# que un turno real invoca: la cota calibrada es un piso, no un techo.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$HERE/../../bin"
PROMPT=""; TASK_CLASS=""; RUNS=3; WIDTH=""; OUT=""

refuse() { echo "pool-calibrate: REHUSA — $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prompt) PROMPT="${2:-}"; shift 2 ;;
        --task-class) TASK_CLASS="${2:-}"; shift 2 ;;
        --runs) RUNS="${2:-}"; shift 2 ;;
        --width) WIDTH="${2:-}"; shift 2 ;;
        --out) OUT="${2:-}"; shift 2 ;;
        -h|--help) sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) refuse "opcion desconocida: $1" ;;
    esac
done
[[ -n "$PROMPT" && -f "$PROMPT" ]] || refuse "la plantilla no existe: ${PROMPT:-(sin --prompt)}"
[[ -n "$TASK_CLASS" ]] || refuse "falta --task-class: el pool deriva de ella el modelo de los ítems"
[[ "$RUNS" =~ ^[1-9][0-9]*$ ]] || refuse "--runs es un entero positivo, no: $RUNS"
[[ -n "$OUT" ]] || OUT="$(mktemp -d)"
mkdir -p "$OUT"

# Sin GNU Time no hay `.time` ni fila: medir es el propósito, así que rehúsa
# antes de lanzar nada. La misma resolución que el pool, en una subshell.
TIME_BIN="$(THYROX_TOOLCHAIN_TIME_BIN="${POOL_CALIBRATE_TIME:-${THYROX_TOOLCHAIN_TIME_BIN:-}}"
            source "$HERE/../lib/toolchain.sh"
            thyrox_toolchain_require_gnu_time 2>/dev/null && thyrox_toolchain_gnu_time_bin)" \
    || refuse "sin GNU Time no se mide la memoria de los ítems (THYROX_INSTALL_GNU_TIME=1 lo instala)"

gawk 'NF' > "$OUT/items.txt"
ITEMS="$(gawk 'END{print NR}' "$OUT/items.txt")"
[[ "$ITEMS" -gt 0 ]] || refuse "no recibio ningun item por stdin"

HISTORY="$(bash "$BIN/pool_history" dir "$PROMPT")" || refuse "no se pudo resolver el historial"
rows_now() { gawk 'END{print NR}' "$HISTORY/runs.jsonl" 2>/dev/null || echo 0; }
ROWS_BEFORE="$(rows_now)"

: > "$OUT/requests.log"
bash "$BIN/provider-anthropic-mock-server" --requests-log "$OUT/requests.log" \
    > "$OUT/proxy.out" 2> "$OUT/proxy.err" &
PROXY_PID=$!
echo "$PROXY_PID" > "$OUT/proxy.pid"
trap 'kill "$PROXY_PID" 2>/dev/null; wait "$PROXY_PID" 2>/dev/null' EXIT
# La URL es la primera línea del proxy; se espera con plazo y mientras viva.
URL=""
for _ in $(seq 1 100); do
    URL="$(gawk -F= '/^url=/{print $2; exit}' "$OUT/proxy.out")"
    [[ -n "$URL" ]] && break
    kill -0 "$PROXY_PID" 2>/dev/null || break
    sleep 0.1
done
[[ -n "$URL" ]] || refuse "el proxy local no arranco: $(cat "$OUT/proxy.err")"

STATUS=0
for run in $(seq 1 "$RUNS"); do
    env -u ANTHROPIC_AUTH_TOKEN -u THYROX_CODE_OAUTH_TOKEN -u THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR \
        -u CLAUDE_CODE_OAUTH_TOKEN -u CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR \
        ANTHROPIC_API_KEY=local-proxy-placeholder ANTHROPIC_BASE_URL="$URL" HEADLESS_POOL_TIME="$TIME_BIN" \
        bash "$HERE/headless-pool.sh" --prompt "$PROMPT" --out "$OUT/run-$run" --task-class "$TASK_CLASS" \
        ${WIDTH:+--width "$WIDTH"} < "$OUT/items.txt" > "$OUT/run-$run.log" 2>&1 || STATUS=1
done

REQUESTS="$(gawk 'END{print NR}' "$OUT/requests.log")"
ROWS=$(( $(rows_now) - ROWS_BEFORE ))
echo "calibrado: $REQUESTS peticiones al proxy, $ROWS fila(s) en $HISTORY (salida en $OUT)"
if [[ "$REQUESTS" -eq 0 ]]; then
    echo "pool-calibrate: 0 peticiones al proxy — los ítems no le hablaron; sus filas no describen a thyrox -p" >&2
    exit 1
fi
exit "$STATUS"
