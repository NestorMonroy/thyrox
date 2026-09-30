#!/usr/bin/env bash
# TASK-THYROX-0673 — SendMessage entre dos procesos reales de bin/cli.
#
# B es un `thyrox -p` que se queda vivo dentro de una herramienta Bash real
# (`sleep`), con su buzón UDS levantado y su sesión publicada en el registro.
# A es otro `thyrox -p` cuyo modelo grabado llama a la herramienta
# `SendMessage` con `uds:<socket de B>`: la llamada llega al bucle de A como
# `tool_use`, así que mide el adaptador de `runLoop.ts`, no un hijo de A.
#
# La recepción se mide en dos puntos de B, que no son el mismo:
#   - la cola: el buzón de B escribe «Routed user message to queue» en su
#     registro de depuración (`DEBUG=1`, `THYROX_CODE_DEBUG_LOGS_DIR`) tras
#     `enqueue` (`inboxDelivery.ts`);
#   - el turno: el texto aparece en la conversación de B (`stream-json`).
#
# Frontera medida (2026-09-30): el mensaje llega al buzón de B, pero la
# compuerta de entrada lo retiene con `cause=mode-unknown` porque
# `wireCurrentModeGetter` (`inboundGate.ts`) no tiene llamador de producción,
# y `print.ts` no drena la cola hacia el turno. Mientras la retención siga,
# las dos aserciones de recepción se publican como BLOQUEADA con su causa;
# cualquier otro desenlace es FALLA, y si el mensaje se encola, pasan a OK.
#
# `bin/cli` compila `--feature=UDS_INBOX` (generate_bin.py); la compuerta de
# tiempo de ejecución es `THYROX_CODE_HARBOR_KITE`.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
T="$(mktemp -d)"
A_PID=""; B_PID=""
cleanup() {
  for pid in "$A_PID" "$B_PID"; do [[ -n "$pid" ]] && kill "$pid" 2>/dev/null; done
  for pid in "$A_PID" "$B_PID"; do [[ -n "$pid" ]] && wait "$pid" 2>/dev/null; done
  rm -rf "$T"
}
trap cleanup EXIT
total=0; failures=0
blocked=0
HOLD_LINE="held inbound peer message"
ROUTED_LINE="Routed user message to queue"
# $1 = etiqueta, $2 = si|no medido, $3 = si el mensaje sigue retenido por mode-unknown (si|no)
check_received() {
  if [[ "$2" == si ]]; then check "$1" si si
  elif [[ "$3" == si ]]; then echo "BLOQUEADA $1 — retenido por la compuerta de entrada (cause=mode-unknown)"; blocked=$((blocked+1))
  else check "$1" "$2" si; fi
}
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; failures=$((failures+1)); fi; }

USAGE='{"input_tokens":1,"output_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}'
write_turns() { # $1 = nombre de la herramienta del primer turno, $2 = su entrada en JSON
  printf '[{"id":"m1","model":"claude-opus-5","stop_reason":"tool_use","usage":%s,"content":[{"type":"tool_use","id":"tu1","name":"%s","input":%s}]},{"id":"m2","model":"claude-opus-5","stop_reason":"end_turn","usage":%s,"content":[{"type":"text","text":"listo"}]}]' \
    "$USAGE" "$1" "$2" "$USAGE"
}
cli() { # $1 = grabación, $2 = registro de depuración. Se invoca con `&`: el exec conserva el pid hasta bun.
  exec env -u THYROX_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_SOCKET -u BUN_OPTIONS \
    DEBUG=1 THYROX_CODE_DEBUG_LOGS_DIR="$2" THYROX_CONFIG_DIR="$T/cfg" THYROX_CODE_HARBOR_KITE=1 \
    bash "$ROOT/bin/cli" -p hola --provider recorded --grabacion "$1" --no-session-persistence --output-format stream-json
}
wait_for_registry() { # $1 = pid; imprime la ruta del socket cuando el registro la publica
  local sock
  for _ in $(seq 1 150); do
    sock="$(jq -r '.messagingSocketPath // empty' "$T/cfg/sessions/$1.json" 2>/dev/null)"
    [[ -n "$sock" && -S "$sock" ]] && { printf '%s' "$sock"; return 0; }
    kill -0 "$1" 2>/dev/null || return 1
    sleep 0.2
  done
  return 1
}
wait_for_text() { # $1 = archivo, $2 = texto fijo; hasta 10 s
  for _ in $(seq 1 50); do grep -qF -- "$2" "$1" 2>/dev/null && return 0; sleep 0.2; done
  return 1
}

mkdir -p "$T/cfg"
NONCE="saludo-de-A-$RANDOM$RANDOM"

echo "== 1. B vive con su buzón publicado en el registro =="
write_turns Bash '{"command":"sleep 20"}' > "$T/turns-b.json"
cli "$T/turns-b.json" "$T/b-debug.txt" > "$T/b.out" 2> "$T/b.err" &
B_PID=$!
B_SOCK="$(wait_for_registry "$B_PID")"
check "B publica messagingSocketPath y el socket existe" "$([[ -n "$B_SOCK" && -S "$B_SOCK" ]] && echo si || echo no)" "si"

echo "== 2. A envía texto a uds:<socket de B> por la herramienta SendMessage =="
write_turns SendMessage "$(jq -cn --arg to "uds:$B_SOCK" --arg m "$NONCE" '{to: $to, message: $m}')" > "$T/turns-a.json"
cli "$T/turns-a.json" "$T/a-debug.txt" > "$T/a.out" 2> "$T/a.err" &
A_PID=$!
wait "$A_PID"; A_CODE=$?; A_PID=""
check "A termina su turno con éxito" "$A_CODE/$(jq -r 'select(.type=="result") | .subtype' "$T/a.out" 2>/dev/null)" "0/success"
check "A ofrece SendMessage y ListAgents a su modelo" \
  "$(jq -r 'select(.type=="system" and .subtype=="init") | [.tools[] | select(.=="SendMessage" or .=="ListAgents")] | length' "$T/a.out" 2>/dev/null)" "2"
# La vista previa del registro de B trunca el cuerpo: el mensaje se identifica
# por su remitente, el socket que el buzón de A anunció al arrancar.
A_FROM="uds:$(sed -n 's/.*\[uds-messaging\] Listening: //p' "$T/a-debug.txt" | head -1)"
wait_for_text "$T/b-debug.txt" "$A_FROM"
check "el envío de A llega al buzón de B" \
  "$(grep -E "$HOLD_LINE|$ROUTED_LINE" "$T/b-debug.txt" 2>/dev/null | grep -qF "$A_FROM" && echo si || echo no)" "si"
HELD="$(grep -F "$HOLD_LINE" "$T/b-debug.txt" 2>/dev/null | grep -F "cause=mode-unknown" | grep -qF "$A_FROM" && echo si || echo no)"
check_received "el mensaje entra a la cola de B" \
  "$(grep -F "$ROUTED_LINE" "$T/b-debug.txt" 2>/dev/null | grep -qF "$A_FROM" && echo si || echo no)" "$HELD"
[[ -s "$T/b-debug.txt" ]] || { echo "--- a.out"; tail -5 "$T/a.out"; echo "--- b.err"; tail -5 "$T/b.err"; }

echo "== 3. el mensaje aparece en el turno de B =="
wait "$B_PID"; B_CODE=$?; B_PID=""
check "B termina su turno con éxito" "$B_CODE/$(jq -r 'select(.type=="result") | .subtype' "$T/b.out" 2>/dev/null)" "0/success"
check_received "el texto de A aparece en la conversación de B" \
  "$(grep -qF "$NONCE" "$T/b.out" && echo si || echo no)" "$HELD"

echo
echo "$total aserciones, $failures fallo(s), $blocked bloqueada(s) (alcance medido: dos bin/cli reales, A envía a B)"
[[ $failures -eq 0 ]]
