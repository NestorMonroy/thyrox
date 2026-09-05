#!/usr/bin/env bash
# Pruebas de la cota de --limit en `auto-recall` (scripts/agents/agent_store.py).
#
# SQLite trata `LIMIT` negativo como "sin límite" — verificado con
# sqlite3 en memoria, no supuesto (ver docstring de cmd_auto_recall).
# Sin la cota, un `--limit` negativo volcaría el índice completo de
# hallazgos en cada prompt. Patrón de acotar el parámetro en el punto
# de uso —no confiar sólo en el tipo declarado por argparse— tomado de
# TencentDB Agent Memory: index.ts:381 (`Math.min(Math.max(n, 1), 20)`).
# Ver H-DOCS-164.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

TMP=$(mktemp -d)
python3 "$STORE" init --claude-dir "$TMP/.claude/agent-results" >/dev/null

echo "== 0. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

echo "== 1. poblar 25 hallazgos con el mismo término buscable =="
for i in $(seq -w 1 25); do
    python3 "$STORE" agregar-hallazgo --claude-dir "$TMP/.claude/agent-results" \
        --finding-id "H-TEST-$i" --submodule docs --initiative t \
        --summary "hallazgo de prueba clamp $i" \
        --content "hallazgo de prueba clamp $i" >/dev/null
done

echo "== 2. --limit negativo (bug de invocación) NO vuelca el índice completo =="
FILAS=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "clamp" --limit -5 | wc -l)
if [[ "$FILAS" -le 20 && "$FILAS" -ge 1 ]]; then
    printf '  ok    limit=-5 acotado (filas=%s, <=20)\n' "$FILAS"; (( OK++ ))
else
    printf '  FALLO limit=-5 no acotado (filas=%s)\n' "$FILAS"; (( FALLO++ ))
fi

echo "== 3. --limit sobre 20 se acota a 20, no a 25 (todos los indexados) =="
FILAS=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "clamp" --limit 500 | wc -l)
afirmar "limit=500 acotado a 20" "20" "$FILAS"

echo "== 4. --limit sano (3, el default del hook) sigue devolviendo 3 =="
FILAS=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "clamp" --limit 3 | wc -l)
afirmar "limit=3 sin cambios" "3" "$FILAS"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
