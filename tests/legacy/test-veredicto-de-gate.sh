#!/usr/bin/env bash
# Prueba de `medir_gate` / `gate_midio` de thyrox-audit.sh.
#
# Mide las funciones REALES: las extrae del guion en vez de copiarlas, para que
# una divergencia entre la prueba y el guion sea imposible por construccion.
#
# El control que puede fallar es el caso 1: con el idioma anterior
# —`${VAR:-0}` sobre la salida de un gate con `2>/dev/null`— un gate que rehusa
# publicaba PASS. Reproducido antes del arreglo (H-DOCS-492):
#
#   codigo del gate: 2 (rehusa) | AMIN capturado: '<>'
#   VEREDICTO PUBLICADO: ok
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

AUDIT=.claude/scripts/thyrox-audit.sh
[[ -f $AUDIT ]] || { echo "ERROR - no encuentro $AUDIT" >&2; exit 2; }

PASS=0; WARN=0
ok()   { echo "     PASS  · $1"; PASS=$((PASS+1)); }
warn() { echo "     WARN  · $1"; WARN=$((WARN+1)); }

# Las dos funciones, tal cual estan en el guion.
eval "$(sed -n '/^medir_gate() {/,/^}/p;/^gate_midio() {/,/^}/p' "$AUDIT")"
declare -F medir_gate >/dev/null && declare -F gate_midio >/dev/null || {
    echo "ERROR - no se pudieron extraer medir_gate/gate_midio de $AUDIT" >&2
    echo "        NO se emite conteo: un 0 aqui seria un verde falso." >&2
    exit 2; }

OK=0; FALLOS=0
check() {   # $1 caso · $2 esperado · $3 obtenido
    if [[ "$2" == "$3" ]]; then OK=$((OK+1)); echo "ok   — $1"
    else FALLOS=$((FALLOS+1)); echo "FAIL — $1: esperaba '$2', obtuvo '$3'"; fi
}

rehusa()  { echo "ERROR - falta una precondicion; NO se emite conteo" >&2; return 2; }
mide_0()  { echo "0"; }
mide_7()  { echo "7"; }
muda()    { return 1; }

# 1 — CONTROL POSITIVO: el gate rehusa y el veredicto NO puede ser PASS.
WARN=0; PASS=0
medir_gate rehusa
gate_midio "prueba" || true
check "un gate que rehusa no publica PASS" "PASS=0 WARN=1" "PASS=$PASS WARN=$WARN"
check "el codigo del gate llega intacto"   "2"             "$GATE_RC"

# 2 — el gate mide y no encuentra nada: PASS legitimo.
WARN=0; PASS=0
medir_gate mide_0
if gate_midio "prueba"; then [[ "$GATE_N" -eq 0 ]] && ok "sin defectos"; fi
check "un 0 medido si publica PASS" "PASS=1 WARN=0" "PASS=$PASS WARN=$WARN"

# 3 — el gate mide y encuentra: WARN, no PASS.
WARN=0; PASS=0
medir_gate mide_7
if gate_midio "prueba"; then [[ "$GATE_N" -eq 0 ]] || warn "7 defectos"; fi
check "un conteo distinto de 0 publica WARN" "PASS=0 WARN=1" "PASS=$PASS WARN=$WARN"
check "el conteo llega intacto"              "7"             "$GATE_N"

# 4 — el gate muere sin decir nada (codigo 1, sin salida): tampoco es PASS.
WARN=0; PASS=0
medir_gate muda
gate_midio "prueba" || true
check "un gate mudo no publica PASS" "PASS=0 WARN=1" "PASS=$PASS WARN=$WARN"

# 5 — el idioma viejo NO sobrevive en el guion.
VIEJOS=$(grep -cE '\$\{(AMIN|FRADM|SUC|WFR|RSTC|IDS|RSTS|HIDX|DOCN|HSUB):-0\}' "$AUDIT" || true)
check "ninguna medida de gate usa el idioma \${VAR:-0}" "0" "$VIEJOS"

echo
echo "test-veredicto-de-gate: $OK ok, $FALLOS fallo(s) (alcance medido: $((OK+FALLOS)) aserciones)"
[[ $FALLOS -eq 0 ]]
