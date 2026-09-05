#!/usr/bin/env bash
# test-destino-del-reporte.sh — contrato del destino del reporte de referencias.
#
# H-DOCS-471: `detect_broken_references.py` escribia a un nombre relativo
# pelado, asi que su reporte de 61 KB aterrizaba donde el CWD quisiera —en la
# raiz del repo, fuera de `.claude/eventos/`, que es el hogar que el grifo de
# H-DOCS-456 fija para toda evidencia.
#
# El caso que DISCRIMINA es el 3: se invoca desde OTRO directorio de trabajo.
# Un destino que dependa del CWD cambia ahi y en ningun otro caso; los demas
# casos pasarian igual con el defecto presente.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/gates/detect_broken_references.py"
ok=0; ko=0
ok()  { echo "  OK   $*"; ok=$((ok+1)); }
bad() { echo "  FAIL $*"; ko=$((ko+1)); }

destino() {   # destino() [cwd] — la ruta REAL a la que se escribiria desde ese cwd
    # Se resuelve con os.path.abspath: es lo que el `open()` del guion hara.
    # Sin resolver, un nombre relativo pelado se compara igual a si mismo desde
    # los dos directorios y el caso 3 pasaria con el defecto presente — medido
    # con el control anulado, ver H-DOCS-471.
    ( cd "${1:-$RAIZ}" && python3 -c "
import sys, os
sys.path.insert(0, '$RAIZ/.claude/scripts/gates')
import detect_broken_references as m
print(os.path.abspath(m.destino_del_reporte()))
" 2>/dev/null )
}

echo "=== Caso 1: el guion parsea y expone destino_del_reporte ==="
if python3 -c "
import sys; sys.path.insert(0, '$RAIZ/.claude/scripts/gates')
import detect_broken_references as m
raise SystemExit(0 if callable(m.destino_del_reporte) else 1)
" 2>/dev/null; then ok "importa y la funcion existe"
else bad "no importa, o no expone destino_del_reporte"; fi

D1="$(destino)"
D1_CRUDO="$(cd "$RAIZ" && python3 -c "
import sys; sys.path.insert(0, '$RAIZ/.claude/scripts/gates')
import detect_broken_references as m
print(m.destino_del_reporte())
" 2>/dev/null)"
echo "=== Caso 2: el destino cae bajo .claude/eventos/ del arbol del guion ==="
# Control positivo del bucle: con UN salto de menos daria .claude/scripts/eventos.
if [[ "$D1" == "$RAIZ/.claude/eventos/"* ]]; then ok "$D1"
else bad "fuera de .claude/eventos/: $D1"; fi

echo "=== Caso 3 (EL QUE DISCRIMINA): el destino NO lo decide el CWD ==="
D2="$(destino /tmp)"
# Sellos distintos por el timestamp; se compara el prefijo, que es lo que el
# defecto movia. Un nombre relativo pelado daria `/tmp/...` aqui.
P1="${D1%/*/*}"; P2="${D2%/*/*}"
if [[ -n "$D2" && "$P1" == "$P2" ]]; then ok "mismo hogar desde otro CWD: $P2"
else bad "el CWD movio el destino: '$P1' vs '$P2'"; fi

echo "=== Caso 4: el destino no es un nombre relativo pelado ==="
if [[ "$D1_CRUDO" == /* ]]; then ok "ruta absoluta"
else bad "ruta relativa — el CWD decidiria: $D1_CRUDO"; fi

echo "=== Caso 5: REFERENCE_REPORT_PATH sustituye el default ==="
D3="$(REFERENCE_REPORT_PATH=/tmp/fijado.txt python3 -c "
import sys; sys.path.insert(0, '$RAIZ/.claude/scripts/gates')
import detect_broken_references as m
print(m.destino_del_reporte())
" 2>/dev/null)"
if [[ "$D3" == "/tmp/fijado.txt" ]]; then ok "el override manda"
else bad "override ignorado: $D3"; fi

echo "=== Caso 6: la raiz del repo NO conserva el reporte varado ==="
if [[ ! -e "$RAIZ/reference-validation-report.txt" ]]; then ok "raiz limpia"
else bad "sigue el reporte en la raiz del repo"; fi

echo ""
echo "$ok ok, $ko fallos (alcance medido: $((ok+ko)) aserciones sobre $GUION)"
[[ $ko -eq 0 ]]
