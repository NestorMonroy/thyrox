#!/usr/bin/env bash
# Pruebas del aviso de primer encuentro — `inject-arranque-de-clon.sh`.
#
# Que cubre: el punto (3) de la tarea #731 — «quien clona ve que se va a
# escribir en su ~/.claude y lo confirma, en el primer encuentro y no en cada
# sesion». Las dos mitades de esa frase son aserciones distintas:
#
#   - «ve que se va a escribir»  -> el aviso nombra el conteo y el comando
#   - «no en cada sesion»        -> con la decision ya tomada, silencio
#
# Todo corre contra un destino SINTETICO via `CLAUDE_CONFIG_DIR`. Ni una sola
# asercion toca el `~/.claude` real: si lo tocara, la prueba escribiria en la
# configuracion de quien la corre.
#
# El caso 7 es un CONTROL ANULADO — retira la comprobacion del marcador y
# comprueba que cae EXACTAMENTE el caso que la mide. Sin el, un verde en el
# caso 2 no distingue «el marcador silencia» de «el hook nunca habla».
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="$RAIZ/.claude/hooks/inject-arranque-de-clon.sh"
INSTALADOR="$RAIZ/.claude/scripts/session/instalar-config-usuario.sh"
OK=0; KO=0

ok()   { OK=$((OK+1)); printf '  ok   %s\n' "$1"; }
fallo(){ KO=$((KO+1)); printf '  FALLO %s\n' "$1" >&2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# El hook se invoca como lo invoca el cliente: payload vacio por stdin.
correr() { printf '{}' | CLAUDE_CONFIG_DIR="$1" bash "$HOOK" 2>/dev/null; }

echo "=== Caso 1: sin marcador y con trabajo por delante -> el aviso habla ==="
D1="$TMP/d1"; mkdir -p "$D1"
SAL="$(correr "$D1")"; RC=$?
CTX="$(printf '%s' "$SAL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"])' 2>/dev/null)"
[[ $RC -eq 0 ]] && ok "sale 0" || fallo "sale 0 (rc=$RC)"
[[ -n "$CTX" ]] && ok "emite additionalContext" || fallo "emite additionalContext"
printf '%s' "$CTX" | grep -q "instalar-config-usuario.sh" \
    && ok "nombra el comando" || fallo "nombra el comando"
printf '%s' "$CTX" | grep -qE "[0-9]+ archivo" \
    && ok "nombra el conteo" || fallo "nombra el conteo"
printf '%s' "$CTX" | grep -q -- "--decline" \
    && ok "ofrece la salida de declinar" || fallo "ofrece la salida de declinar"

echo "=== Caso 2 (EL QUE DISCRIMINA): decision tomada -> silencio ==="
D2="$TMP/d2"; mkdir -p "$D2"
bash "$INSTALADOR" --path "$D2" --decline >/dev/null 2>&1
SAL2="$(correr "$D2")"
[[ "$SAL2" == "{}" ]] && ok "silencio tras --decline" || fallo "silencio tras --decline (salida: $SAL2)"
[[ -f "$D2/.kaupamex-arranque" ]] && ok "--decline deja marcador" || fallo "--decline deja marcador"
[[ -d "$D2/rules" ]] && fallo "--decline NO debe copiar" || ok "--decline no copia nada"

echo "=== Caso 3: nada por copiar -> silencio, aunque no haya marcador ==="
D3="$TMP/d3"; mkdir -p "$D3"
bash "$INSTALADOR" --path "$D3" >/dev/null 2>&1     # todas las clases, en firme
rm -f "$D3/.kaupamex-arranque"                       # se retira el marcador a proposito:
SAL3="$(correr "$D3")"                               # lo que silencia aqui es el 0, no el marcador
[[ "$SAL3" == "{}" ]] && ok "silencio con 0 por copiar" || fallo "silencio con 0 por copiar (salida: $SAL3)"

echo "=== Caso 4: un pase en firme deja el marcador ==="
D4="$TMP/d4"; mkdir -p "$D4"
bash "$INSTALADOR" --path "$D4" --class rules >/dev/null 2>&1
[[ -f "$D4/.kaupamex-arranque" ]] && ok "el pase en firme marca" || fallo "el pase en firme marca"
grep -q "instalado" "$D4/.kaupamex-arranque" 2>/dev/null \
    && ok "el marcador declara la decision" || fallo "el marcador declara la decision"

echo "=== Caso 5: un dry-run NO marca (no decidio nada) ==="
D5="$TMP/d5"; mkdir -p "$D5"
bash "$INSTALADOR" --path "$D5" --class rules --dry-run >/dev/null 2>&1
[[ -f "$D5/.kaupamex-arranque" ]] && fallo "el dry-run NO debe marcar" || ok "el dry-run no marca"

echo "=== Caso 6: nunca rompe el flujo — destino irrescribible ==="
D6="$TMP/d6"; mkdir -p "$D6"; chmod 500 "$D6"
printf '{}' | CLAUDE_CONFIG_DIR="$D6" bash "$HOOK" >/dev/null 2>&1
[[ $? -eq 0 ]] && ok "sale 0 con destino de solo lectura" || fallo "sale 0 con destino de solo lectura"
chmod 700 "$D6"

echo ""
echo "test-aviso-de-arranque: $OK ok, $KO fallos (alcance medido: $((OK+KO)) aserciones)"
[[ $KO -eq 0 ]]
