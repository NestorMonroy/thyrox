"""Aplica TASK-THYROX-0781: headless-pool --context-tokens N viaja al recomendador como --context N."""
from pathlib import Path

ROOT = Path("/home/user/thyrox")


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    assert text.count(old) == 1, f"{path.name}: {text.count(old)} coincidencias de {old[:60]!r}"
    path.write_text(text.replace(old, new), encoding="utf-8")


pool = ROOT / "src/session/headless-pool.sh"
replace_once(pool, """# de proveedor que llegue igual—. Sin política, el comportamiento de hoy.
#
""", """# de proveedor que llegue igual—. Sin política, el comportamiento de hoy.
#
# `--context-tokens N` (TASK-THYROX-0781) es el contexto que cada ítem necesita
# por turno, y viaja al recomendador como `--context N`. Sin declararlo, el
# recomendador exige su piso de subagente (126 029 tokens), que ningún modelo
# local de 32k alcanza aunque esté cualificado; un ítem de traducción midió
# p90 13 406 tokens por turno en 400 ítems de olas anteriores.
#
""")
replace_once(pool, """#                    [--model-policy ARCHIVO]
#                    < items""", """#                    [--model-policy ARCHIVO] [--context-tokens N]
#                    < items""")
replace_once(pool, """MODEL_POLICY=""; POLICY_FALLBACK=""
""", """MODEL_POLICY=""; POLICY_FALLBACK=""; CONTEXT_TOKENS=""
""")
replace_once(pool, """        --model-policy) MODEL_POLICY="${2:-}"; shift 2 ;;
""", """        --model-policy) MODEL_POLICY="${2:-}"; shift 2 ;;
        --context-tokens) CONTEXT_TOKENS="${2:-}"; shift 2 ;;
""")
replace_once(pool, """case "$TASK_CLASS" in
    mecanica|analisis|adversarial|frontera) ;;
    *) rehusa "--task-class va mecanica, analisis, adversarial o frontera, no: ${TASK_CLASS:-(vacio)}" ;;
esac
""", """case "$TASK_CLASS" in
    mecanica|analisis|adversarial|frontera) ;;
    *) rehusa "--task-class va mecanica, analisis, adversarial o frontera, no: ${TASK_CLASS:-(vacio)}" ;;
esac
[[ -z "$CONTEXT_TOKENS" || "$CONTEXT_TOKENS" =~ ^[1-9][0-9]*$ ]] \\
    || rehusa "--context-tokens exige un entero positivo de tokens, no: $CONTEXT_TOKENS"
""")
replace_once(pool, """    reply="$(bash "$RECOMMEND_BIN" "$TASK_CLASS" "$@" ${MODEL_POLICY:+--policy "$MODEL_POLICY"} --json 2>/dev/null)" || rc=$?""",
             """    reply="$(bash "$RECOMMEND_BIN" "$TASK_CLASS" "$@" ${MODEL_POLICY:+--policy "$MODEL_POLICY"} \\
        ${CONTEXT_TOKENS:+--context "$CONTEXT_TOKENS"} --json 2>/dev/null)" || rc=$?""")

test = ROOT / "tests/session/test-headless-pool-model-policy.sh"
replace_once(test, """check "caso 9: un --context-tokens que no es entero positivo rehúsa con 2" "$CODE" "2"
""", """check "caso 9: un --context-tokens que no es entero positivo rehúsa con 2" "$CODE" "2"
check "caso 9: y dice que exige un entero positivo" "$([[ "$SALIDA" == *"--context-tokens exige un entero positivo"* ]] && echo si)" "si"
""")
