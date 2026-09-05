#!/usr/bin/env bash
# Suite del gate de resolucion de raiz de referencia.
#
# Los positivos son REALES: copias de git de las dos versiones defectuosas que
# el barrido corrigio. Un incumplidor fabricado por quien escribio el patron
# hereda su encuadre y confirma el instrumento en vez de probarlo
# (hallazgo-abierto-genera-sucesor.md).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_reference_root_resolution.py"
CONTROL="$RAIZ/.claude/eventos/barrido-una-raiz-20260829T040354/control"

fallos=0
total=0

check() {
  total=$((total + 1))
  if [ "$1" != "$2" ]; then
    echo "  FALLO $3 — esperado '$1', obtenido '$2'"
    fallos=$((fallos + 1))
  fi
}

# --- caso 1: el arbol vivo esta limpio -----------------------------------
salida="$(python3 "$GATE")"
check "0" "$(echo "$salida" | grep -oE '^check-reference-root-resolution: [0-9]+'              | grep -oE '[0-9]+')" "caso 1: 0 incumplidores en el arbol"
check "0" "$(python3 "$GATE" --strict >/dev/null 2>&1; echo $?)"       "caso 1b: --strict sale 0"

# --- caso 2: el denominador se publica -----------------------------------
check "1" "$(echo "$salida" | grep -c 'alcance medido')"       "caso 2: publica su denominador"

# --- caso 3: positivo REAL, la forma «una sola raiz» ---------------------
uno="$(python3 "$GATE" "$CONTROL" 2>&1 || true)"
check "1" "$(echo "$uno" | grep -c 'compone contra UNA raiz')"       "caso 3: ve la composicion contra una sola raiz"

# --- caso 4: positivo REAL, la forma «lista duplicada» -------------------
check "1" "$(echo "$uno" | grep -c 'DUPLICA la lista')"       "caso 4: ve la lista duplicada"

# --- caso 5: --strict sobre los positivos sale 1 -------------------------
check "1" "$(python3 "$GATE" --strict "$CONTROL" >/dev/null 2>&1; echo $?)"       "caso 5: --strict sale 1 ante incumplidores"

# --- caso 6: el gate NO se marca a si mismo ------------------------------
propio="$(python3 "$GATE" "$RAIZ/.claude/scripts/gates" 2>&1 || true)"
check "0" "$(echo "$propio" | grep -c 'check_reference_root_resolution.py')"       "caso 6: no se marca por citar el anti-patron"

# --- caso 7: el barrido por omision SALTA los controles ------------------
# Sin esto el gate quedaria rojo para siempre por su propia evidencia, y la
# unica salida seria borrarla — que es como se pierde la prueba de que sirve.
check "0" "$(python3 "$GATE" | grep -c 'control/')"       "caso 7: por omision no mide el directorio de control"

echo "aserciones: $total  fallos: $fallos"
[ "$fallos" -eq 0 ]
