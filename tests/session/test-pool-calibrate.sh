#!/usr/bin/env bash
# `pool-calibrate`: la memoria de `thyrox -p` se mide contra el proxy local,
# sin credencial real. GNU Time mide el proceso LOCAL; el modelo corre en el
# servidor, así que un servidor de loopback basta para llenar el historial.
#
# Mitad roja medida antes de escribirlo: `ls src/session/pool-calibrate.sh`
# -> No such file or directory.
#
# Controles de anulación: sin retirar la credencial del anfitrión cae el caso
# 3 (llega `auth=authorization`); sin la cuenta de peticiones cae el caso 5;
# sin el `trap` que cierra el proxy cae el caso 4.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CAL="$ROOT/src/session/pool-calibrate.sh"
F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fi; }

printf 'Resume el ítem.\n' > "$F/prompt.md"
HIST="$F/hist"
# La credencial del anfitrión, simulada: no debe llegar al proxy.
SALIDA="$(printf 'alfa\nbeta\n' | ANTHROPIC_AUTH_TOKEN=token-del-anfitrion HEADLESS_POOL_HISTORY_DIR="$HIST" \
    bash "$CAL" --prompt "$F/prompt.md" --model claude-sonnet-5 --runs 2 --width 2 --out "$F/out" 2>&1)"; CODE=$?
ROWS="$(find "$HIST" -name runs.jsonl -exec cat {} + 2>/dev/null)"

check "1. sale 0" "$CODE" "0"
check "2. una fila por ejecución, de thyrox -p" "$(printf '%s\n' "$ROWS" | jq -r .runner | sort | uniq -c | gawk '{print $1"x"$2}')" "2x$ROOT/bin/cli"
check "2b. con la huella de la plantilla" "$(printf '%s\n' "$ROWS" | jq -r .template_digest | sort -u)" "$(sha256sum "$F/prompt.md" | gawk '{print $1}')"
check "3. cada ítem llegó al proxy con el marcador local, no con la credencial del anfitrión" \
    "$(gawk '{print $4}' "$F/out/requests.log" | sort | uniq -c | gawk '{print $1"x"$2}')" "4xauth=x-api-key"
check "4. el proxy no queda vivo" "$(kill -0 "$(cat "$F/out/proxy.pid" 2>/dev/null)" 2>/dev/null && echo vivo || echo muerto)" "muerto"
check "4b. lo dice: peticiones y filas" "$(printf '%s' "$SALIDA" | gawk '/^calibrado: 4 peticiones al proxy, 2 fila\(s\)/{n++} END{print n+0}')" "1"

# 5. Un ítem que no llega al proxy no se mide contra él: un ejecutor que no
# habla con la API da filas que no describen a `thyrox -p`.
printf '#!/usr/bin/env bash\ncat >/dev/null; echo "{\\"type\\":\\"result\\"}"\n' > "$F/no-habla"; chmod +x "$F/no-habla"
SALIDA="$(printf 'alfa\n' | HEADLESS_POOL_CLAUDE="$F/no-habla" HEADLESS_POOL_HISTORY_DIR="$F/hist-5" \
    bash "$CAL" --prompt "$F/prompt.md" --model claude-sonnet-5 --runs 1 --out "$F/out-5" 2>&1)"; CODE=$?
check "5. sin peticiones al proxy: exit 1" "$CODE" "1"
check "5b. lo nombra" "$(printf '%s' "$SALIDA" | gawk '/^pool-calibrate: 0 peticiones al proxy/{n++} END{print n+0}')" "1"

# 6. Sin GNU Time no hay medida: rehúsa antes de lanzar, sin filas.
SALIDA="$(printf 'alfa\n' | POOL_CALIBRATE_TIME=/no/existe HEADLESS_POOL_HISTORY_DIR="$F/hist-6" \
    bash "$CAL" --prompt "$F/prompt.md" --model claude-sonnet-5 --runs 1 --out "$F/out-6" 2>&1)"; CODE=$?
check "6. sin GNU Time: exit 2" "$CODE" "2"
check "6b. sin filas" "$(find "$F/hist-6" -name runs.jsonl 2>/dev/null | wc -l | tr -d ' ')" "0"

echo; echo "$PASS ok · $FAIL falla(s) (alcance medido: pool-calibrate contra el proxy local)"
[[ $FAIL -eq 0 ]]
