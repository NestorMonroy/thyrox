from pathlib import Path
p = Path('src/session/headless-pool.sh'); s = p.read_text()
def sub(old, new):
    global s
    assert s.count(old) == 1, old[:80]; s = s.replace(old, new)
sub("""#                    [--execution host|unit [--work-reference CONSUMIDOR:ÁMBITO]]
""", """#                    [--execution host|unit [--work-reference CONSUMIDOR:ÁMBITO]]
#                    [--model-policy ARCHIVO]
""")
sub("""# El modelo de los ítems no se declara: se deriva de `--task-class` con
""", """# `--model-policy ARCHIVO` (TASK-THYROX-0758) es la política de ejecución del
# consumidor (`@thyrox/provider: executionPolicy.ts`): viaja al recomendador, y
# si no permite el respaldo, el pool rehúsa en vez de caer a `claude-cli` —por
# una recomendación bloqueada, por un Ollama que no arranca o por un runtime
# de proveedor que llegue igual—. Sin política, el comportamiento de hoy.
#
# El modelo de los ítems no se declara: se deriva de `--task-class` con
""")
sub("""EXECUTION=host; WORK_REFERENCE=""
""", """EXECUTION=host; WORK_REFERENCE=""; MODEL_POLICY=""; POLICY_FALLBACK=""
""")
sub("""        --work-reference) WORK_REFERENCE="${2:-}"; shift 2 ;;
""", """        --work-reference) WORK_REFERENCE="${2:-}"; shift 2 ;;
        --model-policy) MODEL_POLICY="${2:-}"; shift 2 ;;
""")
sub("""    *) rehusa "--execution va host o unit, no: $EXECUTION" ;;
esac
""", """    *) rehusa "--execution va host o unit, no: $EXECUTION" ;;
esac
# El respaldo de la política se lee aquí sólo para defender la frontera; la
# política la interpreta el recomendador. Sin `fallback.enabled` no hay default.
if [[ -n "$MODEL_POLICY" ]]; then
    [[ -r "$MODEL_POLICY" ]] || rehusa "--model-policy no se puede leer: $MODEL_POLICY"
    POLICY_FALLBACK="$(jq -r '.fallback.enabled | if type == "boolean" then tostring else "" end' "$MODEL_POLICY" 2>/dev/null)"
    [[ "$POLICY_FALLBACK" == true || "$POLICY_FALLBACK" == false ]] \\
        || rehusa "--model-policy declara fallback.enabled (true o false); el respaldo no tiene valor por defecto: $MODEL_POLICY"
fi
""")
sub("""derive_recommendation() {
    local reply
    reply="$(bash "$RECOMMEND_BIN" "$TASK_CLASS" "$@" --json 2>/dev/null)" || reply=""
""", """derive_recommendation() {
    local reply rc=0
    reply="$(bash "$RECOMMEND_BIN" "$TASK_CLASS" "$@" ${MODEL_POLICY:+--policy "$MODEL_POLICY"} --json 2>/dev/null)" || rc=$?
    # 3: la política bloqueó la clase; su causa viene en el JSON.
    [[ "$rc" -ne 3 ]] || rehusa "la política de modelo bloquea --task-class $TASK_CLASS: $(jq -r '.blockedReason // "sin causa"' <<< "$reply" 2>/dev/null)"
    [[ "$rc" -eq 0 ]] || reply=""
""")
sub("""        *) rehusa "no se pudo derivar el modelo de --task-class $TASK_CLASS con $RECOMMEND_BIN: runtime ${RUNTIME:-(sin respuesta)}, modelo ${MODEL:-(sin respuesta)}" ;;
    esac
}
""", """        *) rehusa "no se pudo derivar el modelo de --task-class $TASK_CLASS con $RECOMMEND_BIN: runtime ${RUNTIME:-(sin respuesta)}, modelo ${MODEL:-(sin respuesta)}" ;;
    esac
    [[ "$POLICY_FALLBACK" != false || "$RUNTIME" == "$LOCAL_RUNTIME" ]] \\
        || rehusa "la política de modelo no permite el proveedor y el selector devolvió $RUNTIME ($MODEL)"
}
""")
sub("""    [[ "$ensure_exit" -ne 0 ]] || return 0
    derive_recommendation --runtime "$PROVIDER_RUNTIME"
""", """    [[ "$ensure_exit" -ne 0 ]] || return 0
    [[ "$POLICY_FALLBACK" != false ]] \\
        || rehusa "$MANAGED_OLLAMA_SERVICE no arrancó (infrastructure_ensure salió $ensure_exit) y la política de modelo no permite respaldo"
    derive_recommendation --runtime "$PROVIDER_RUNTIME"
""")
p.write_text(s); print('ok')
