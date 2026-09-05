#!/usr/bin/env bash
# test-instalar-config-usuario.sh — contrato del copiador de `.claude/` al
# scope de usuario, con la forma de `agency-agents/scripts/install.sh`.
#
# H-DOCS-469 midio que ninguno de los cuatro guiones de `~/.claude/` es
# nuestro, y que el unico que lo parecia lo parecia POR EL NOMBRE. De ahi sus
# dos condiciones, que son los casos 2 y 7:
#
#   (a) el copiador declara por LISTA EXPLICITA que copia — `--list` lo
#       publica sin escribir nada;
#   (b) ante colision de nombre con contenido DISTINTO se rehusa, en vez de
#       sobreescribir un archivo ajeno que solo comparte el nombre.
#
# El caso que DISCRIMINA es el 7: un copiador que sobreescriba sin mirar pasa
# todos los demas. Se mide con un archivo ajeno ya puesto en el destino.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/session/instalar-config-usuario.sh"
ok=0; ko=0
ok()  { echo "  OK   $*"; ok=$((ok+1)); }
bad() { echo "  FAIL $*"; ko=$((ko+1)); }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "=== Caso 1: el guion existe y parsea ==="
if [[ -f "$GUION" ]] && bash -n "$GUION" 2>/dev/null; then ok "parsea"
else bad "ausente o con error de sintaxis"; fi

echo "=== Caso 2 (H-DOCS-469a): --list declara la lista y NO escribe ==="
D="$TMP/d2"; mkdir -p "$D"
SAL="$(bash "$GUION" --list --path "$D" 2>&1)"; RC=$?
N="$(find "$D" -mindepth 1 | wc -l)"
if [[ $RC -eq 0 && "$N" -eq 0 ]] && grep -qE '^ +(rules|agents|commands|skills|hooks|scripts)\b' <<<"$SAL"
then ok "lista por clase, destino intacto"
else bad "rc=$RC · $N entradas escritas · salida sin filas por clase"; fi

echo "=== Caso 3: --dry-run no escribe ==="
D="$TMP/d3"; mkdir -p "$D"
bash "$GUION" --dry-run --path "$D" --class rules >/dev/null 2>&1; RC=$?
N="$(find "$D" -mindepth 1 | wc -l)"
[[ $RC -eq 0 && "$N" -eq 0 ]] && ok "destino intacto tras --dry-run" \
                              || bad "rc=$RC · escribio $N entradas"

echo "=== Caso 4: precedencia --path > CLAUDE_CONFIG_DIR > ~/.claude ==="
D="$TMP/d4a"; E="$TMP/d4b"; mkdir -p "$D" "$E"
CLAUDE_CONFIG_DIR="$E" bash "$GUION" --path "$D" --class rules >/dev/null 2>&1
if [[ -d "$D/rules" && ! -d "$E/rules" ]]; then ok "--path gana a CLAUDE_CONFIG_DIR"
else bad "la precedencia no se respeta"; fi
D="$TMP/d4c"; mkdir -p "$D"
CLAUDE_CONFIG_DIR="$D" bash "$GUION" --class rules >/dev/null 2>&1
[[ -d "$D/rules" ]] && ok "CLAUDE_CONFIG_DIR gana al default" \
                    || bad "CLAUDE_CONFIG_DIR ignorado"

echo "=== Caso 5: por omision COPIA, no enlaza ==="
D="$TMP/d5"; mkdir -p "$D"
bash "$GUION" --path "$D" --class rules >/dev/null 2>&1
F="$(find "$D/rules" -type f -name '*.md' 2>/dev/null | head -1)"
if [[ -n "$F" && ! -L "$F" ]]; then ok "archivo real, no enlace"
else bad "no copio, o dejo un enlace: ${F:-(nada)}"; fi

echo "=== Caso 6: --link enlaza ==="
D="$TMP/d6"; mkdir -p "$D"
bash "$GUION" --link --path "$D" --class rules >/dev/null 2>&1
F="$(find "$D/rules" -maxdepth 1 -name '*.md' 2>/dev/null | head -1)"
[[ -n "$F" && -L "$F" ]] && ok "enlace simbolico" \
                         || bad "--link no produjo enlace: ${F:-(nada)}"

echo "=== Caso 7 (EL QUE DISCRIMINA, H-DOCS-469b): colision con contenido distinto ==="
D="$TMP/d7"; mkdir -p "$D/rules"
AJENO="$D/rules/commit-conventions.md"
printf 'ARCHIVO AJENO QUE SOLO COMPARTE EL NOMBRE\n' > "$AJENO"
ANTES="$(cat "$AJENO")"
bash "$GUION" --path "$D" --class rules >/dev/null 2>&1; RC=$?
DESPUES="$(cat "$AJENO")"
if [[ $RC -ne 0 && "$ANTES" == "$DESPUES" ]]; then ok "rehusa (rc=$RC) y no sobreescribe"
else bad "rc=$RC · contenido $( [[ "$ANTES" == "$DESPUES" ]] && echo intacto || echo SOBREESCRITO )"; fi

echo "=== Caso 8: colision con contenido IDENTICO no rehusa (idempotente) ==="
D="$TMP/d8"; mkdir -p "$D"
bash "$GUION" --path "$D" --class rules >/dev/null 2>&1
bash "$GUION" --path "$D" --class rules >/dev/null 2>&1; RC=$?
[[ $RC -eq 0 ]] && ok "segunda pasada limpia (rc=0)" \
                || bad "no es idempotente: rc=$RC"

echo "=== Caso 9: el resumen declara su denominador ==="
D="$TMP/d9"; mkdir -p "$D"
SAL="$(bash "$GUION" --path "$D" --class rules 2>&1)"
grep -qE '[0-9]+ archivo\(s\)' <<<"$SAL" && ok "publica el conteo copiado" \
                                         || bad "sin denominador en el resumen"

echo ""
echo "$ok ok, $ko fallos (alcance medido: $((ok+ko)) aserciones sobre $GUION)"
[[ $ko -eq 0 ]]
