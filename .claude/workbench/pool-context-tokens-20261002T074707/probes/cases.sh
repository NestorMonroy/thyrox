
# --context-tokens (TASK-THYROX-0781): el contexto que el ítem necesita viaja al
# recomendador. Sin declararlo, el recomendador usa su piso de 126 029 tokens.
SALIDA="$(pool --model-policy "$F/policy.json" --context-tokens 32768)"; CODE=$?
check "caso 7: con --context-tokens el pool sale 0" "$CODE" "0"
check "caso 7: el recomendador recibe --context 32768" "$(grep -c -- '--context 32768' "$F/recommend.log")" "1"

SALIDA="$(pool --model-policy "$F/policy.json")"; CODE=$?
check "caso 8: sin --context-tokens el recomendador no recibe --context" "$(grep -c -- '--context' "$F/recommend.log")" "0"

SALIDA="$(pool --model-policy "$F/policy.json" --context-tokens mucho)"; CODE=$?
check "caso 9: un --context-tokens que no es entero positivo rehúsa con 2" "$CODE" "2"
check "caso 9: sin preguntar al recomendador" "$(wc -l < "$F/recommend.log" | tr -d ' ')" "0"
