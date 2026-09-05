#!/usr/bin/env bash
# Pruebas de auto-recall: cmd_auto_recall (.claude/scripts/agents/agent_store.py) +
# el hook UserPromptSubmit (.claude/hooks/inject_auto_recall.py).
#
# Adaptación de TencentDB Agent Memory: src/core/hooks/auto-recall.ts
# (estrategia keyword — FTS5 BM25). Corre contra un store SQLite temporal
# aislado (KX_TEST_CLAUDE_DIR), nunca contra .claude/agent-results/ real.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
HOOK=.claude/hooks/inject_auto_recall.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

afirmar_contiene() {  # afirmar_contiene <descripción> <patrón> <texto>
    if grep -q -- "$2" <<<"$3"; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        patrón=[%s] no encontrado en [%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?
python3 -c "import ast; ast.parse(open('$HOOK').read())"; afirmar "inject_auto_recall.py parsea" 0 $?

echo "== 2. _fts5_match_query_any: OR, no AND; filtra stopwords/ruido =="
Q=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts/agents'); sys.path.insert(0, '.claude/scripts/corpus')
import agent_store
print(agent_store._fts5_match_query_any('¿cómo se corrige el problema del ledger que escribía mal el archivo?'))
")
afirmar_contiene "usa OR entre términos" " OR " "$Q"
afirmar "filtra stopword 'del'" "" "$(grep -o '\bdel\b' <<<"$Q")"
afirmar "filtra stopword 'que'" "" "$(grep -o '\bque\b' <<<"$Q")"

echo "== 3. store temporal aislado: indexar + buscar =="
TMP=$(mktemp -d)
python3 "$STORE" init --claude-dir "$TMP/.claude/agent-results" >/dev/null
python3 "$STORE" agregar-hallazgo --claude-dir "$TMP/.claude/agent-results" \
    --finding-id H-TEST-RECALL-1 --submodule docs --initiative test \
    --summary "El ledger de trabajos no escribía atómicamente" \
    --content "cmd_registrar truncaba el archivo antes de escribirlo" >/dev/null

SALIDA=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "¿cómo se corrigió el problema del ledger de trabajos?")
afirmar_contiene "auto-recall encuentra el hallazgo indexado" "H-TEST-RECALL-1" "$SALIDA"

SALIDA_VACIA=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "receta de pastel de chocolate")
afirmar "auto-recall sin hits -> silencio" "" "$SALIDA_VACIA"

echo "== 4. --limit se respeta =="
for i in 2 3 4; do
    python3 "$STORE" agregar-hallazgo --claude-dir "$TMP/.claude/agent-results" \
        --finding-id "H-TEST-RECALL-$i" --submodule docs --initiative test \
        --summary "Otro hallazgo del ledger número $i" \
        --content "el ledger de trabajos también tenía este problema" >/dev/null
done
N=$(python3 "$STORE" auto-recall --claude-dir "$TMP/.claude/agent-results" \
    --query "ledger de trabajos" --limit 2 | wc -l)
afirmar "4 hallazgos indexados, --limit 2 -> 2 líneas" "2" "$N"

echo "== 5. el hook UserPromptSubmit — mismo mecanismo que auto-recall, self-contained =="
# El hook llama a agent_store.py con --repo docs (el store REAL, no $TMP —
# no hay --claude-dir en el hook). Por eso esta prueba no afirma sobre SU
# contenido (acoplaría el test al estado del store real, que cambia); solo
# afirma que la forma de la salida es correcta ante un prompt válido, y que
# nunca rompe el flujo — igual que las secciones 3-4 ya probaron el cmd
# subyacente contra un store aislado.
SALIDA_HOOK=$(echo '{"prompt":"cómo se corrige la atomicidad de un ledger que escribe archivos de estado"}' \
    | python3 "$HOOK")
python3 -c "import json,sys; json.loads(sys.argv[1])" "$SALIDA_HOOK"
afirmar "el hook siempre emite JSON válido" 0 $?

echo "== 6. el hook nunca rompe el flujo — payload corto/inválido =="
afirmar "prompt corto -> {}" "{}" "$(echo '{"prompt":"ok"}' | python3 "$HOOK")"
afirmar "sin campo prompt -> {}" "{}" "$(echo '{}' | python3 "$HOOK")"
afirmar "JSON inválido -> {}" "{}" "$(echo 'no-json' | python3 "$HOOK")"
afirmar "stdin vacío -> {}" "{}" "$(echo -n '' | python3 "$HOOK")"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
