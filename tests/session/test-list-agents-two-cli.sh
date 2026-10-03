#!/usr/bin/env bash
# TASK-THYROX-0600 — ListAgents entre dos procesos reales de bin/cli.
#
# A es un `thyrox -p` que se queda vivo dentro de una herramienta Bash real
# (`sleep`), con su buzón UDS levantado y su sesión publicada en el registro.
# B es otro `thyrox -p` cuya herramienta Bash corre el listado dentro de la
# sesión de B —hereda su THYROX_CONFIG_DIR, su THYROX_CODE_HARBOR_KITE y el
# THYROX_CODE_MESSAGING_SOCKET que el buzón de B exporta— y escribe lo que
# `listAllPeers` y `ListAgentsTool.call` devuelven. Medido antes de escribir
# esto: el bucle de `thyrox -p` arma sus herramientas con
# `@thyrox/tools/registry` (Bash, Read, …), no con `BuiltInToolsProvider`, así
# que la herramienta no puede llegar al modelo grabado de B como `tool_use`;
# la invoca un hijo de B, con el entorno de B.
#
# Dos condiciones medidas que esta suite declara y no asume:
#   - `feature('UDS_INBOX')` es falso al correr desde fuente, y sin él el
#     registro no lleva `messagingSocketPath` y `qRr` no lista la sesión:
#     `BUN_OPTIONS=--feature=UDS_INBOX` lo enciende a través de bin/cli.
#   - la referencia no imprime la dirección en el listing (sólo nombre y
#     `[ref]`): `uds:<socket>` se mide en los pares de `listAllPeers`, y el
#     nombre del par en el listing de la herramienta.
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
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

USAGE='{"input_tokens":1,"output_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}'
turnos() { # $1 = comando de la herramienta Bash del primer turno
  printf '[{"id":"m1","model":"claude-opus-5","stop_reason":"tool_use","usage":%s,"content":[{"type":"tool_use","id":"tu1","name":"Bash","input":{"command":%s}}]},{"id":"m2","model":"claude-opus-5","stop_reason":"end_turn","usage":%s,"content":[{"type":"text","text":"listo"}]}]' \
    "$USAGE" "$(printf '%s' "$1" | jq -Rs .)" "$USAGE"
}
cli() { # $1 = grabación. Se invoca con `&`: el exec conserva el pid del subshell hasta bun, que es el del registro.
  exec env -u THYROX_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_SOCKET \
    BUN_OPTIONS="--feature=UDS_INBOX" THYROX_CONFIG_DIR="$T/cfg" THYROX_CODE_HARBOR_KITE=1 \
    bash "$ROOT/bin/cli" -p hola --provider recorded --grabacion "$1" --no-session-persistence --output-format json
}
espera_registro() { # $1 = pid; imprime la ruta del socket cuando el registro la publica
  local sock
  for _ in $(seq 1 150); do
    sock="$(jq -r '.messagingSocketPath // empty' "$T/cfg/sessions/$1.json" 2>/dev/null)"
    [[ -n "$sock" && -S "$sock" ]] && { printf '%s' "$sock"; return 0; }
    kill -0 "$1" 2>/dev/null || return 1
    sleep 0.2
  done
  return 1
}

mkdir -p "$T/cfg"
cat > "$T/lister.ts" <<TS
import { ListAgentsTool } from '$ROOT/src/packages/tool-registry/src/tools/ListAgentsTool/ListAgentsTool.ts'
import { listAllPeers } from '$ROOT/src/packages/local-observability/src/uds/listAllPeers.ts'
const context = { getAppState: () => ({ tasks: {}, agentNameRegistry: new Map() }) }
const peers = await listAllPeers()
const call = ListAgentsTool.call as unknown as (input: object, context: object) => Promise<{ data: { listing: string } }>
const result = await call({}, context)
console.log(JSON.stringify({ addresses: peers.peers.map(peer => peer.address), listing: result.data.listing }))
TS

echo "== 1. A vive con su buzón publicado en el registro =="
turnos 'sleep 40' > "$T/turnos-a.json"
cli "$T/turnos-a.json" > "$T/a.out" 2> "$T/a.err" &
A_PID=$!
A_SOCK="$(espera_registro "$A_PID")"
check "A publica messagingSocketPath y el socket existe" "$([[ -n "$A_SOCK" && -S "$A_SOCK" ]] && echo si || echo no)" "si"
A_NAME="$(jq -r .name "$T/cfg/sessions/$A_PID.json")"
check "A tiene nombre en el registro" "$([[ -n "$A_NAME" && "$A_NAME" != null ]] && echo si || echo no)" "si"

echo "== 2. B lista desde su propia sesión, con A viva =="
turnos "bun \"$T/lister.ts\" > \"$T/listing.json\" 2> \"$T/lister.err\"" > "$T/turnos-b.json"
cli "$T/turnos-b.json" > "$T/b.out" 2> "$T/b.err" &
B_PID=$!
wait "$B_PID"; B_CODE=$?; B_PID=""
check "B termina su turno con éxito" "$B_CODE/$(jq -r .subtype "$T/b.out" 2>/dev/null)" "0/success"
check "el listado se escribió" "$([[ -s "$T/listing.json" ]] && echo si || echo no)" "si"
[[ -s "$T/listing.json" ]] || { echo "--- lister.err"; cat "$T/lister.err"; echo "--- b.err"; tail -5 "$T/b.err"; }
check "los pares de listAllPeers traen uds:<socket de A>" \
  "$(jq -r --arg a "uds:$A_SOCK" '.addresses | index($a) != null' "$T/listing.json" 2>/dev/null)" "true"
check "el listing de ListAgents nombra a A con su [ref]" \
  "$(jq -r --arg n "$A_NAME [" '.listing | contains($n)' "$T/listing.json" 2>/dev/null)" "true"
check "el listing abre la sección de pares" "$(jq -r '.listing | contains("Peer sessions (")' "$T/listing.json" 2>/dev/null)" "true"
check "A sigue viva mientras B lista" "$(kill -0 "$A_PID" 2>/dev/null && echo si || echo no)" "si"

echo "== 3. control de anulación: con HARBOR_KITE=0 el mismo listado es el aviso, sin pares =="
DISABLED="$(env -u THYROX_CODE_MESSAGING_SOCKET THYROX_CONFIG_DIR="$T/cfg" THYROX_CODE_HARBOR_KITE=0 bun "$T/lister.ts" 2>"$T/lister-off.err")"
check "sin mensajería no hay pares" "$(printf '%s' "$DISABLED" | jq -r '.addresses | length')" "0"
check "sin mensajería el listing es el aviso de apagado" \
  "$(printf '%s' "$DISABLED" | jq -r '.listing | startswith("Cross-session messaging is switched off in this session right now")')" "true"

kill "$A_PID" 2>/dev/null; wait "$A_PID" 2>/dev/null; A_PID=""
echo
echo "$total aserciones, $fallos fallo(s) (alcance medido: dos bin/cli reales, uno lista al otro)"
[[ $fallos -eq 0 ]]
