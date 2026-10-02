from pathlib import Path
p = Path('src/session/headless-pool.sh'); s = p.read_text()
def sub(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)
sub("""#                    [--isolation worktree [--verify CMD]]
""", """#                    [--isolation worktree [--verify CMD]]
#                    [--execution host|unit [--work-reference CONSUMIDOR:ÁMBITO]]
""")
sub("""# El modelo de los ítems no se declara: se deriva de `--task-class` con
""", """# `--execution unit` (TASK-THYROX-0757) hace que cada ítem pida su ejecución a
# la primitiva por el runner gestionado (`src/lib/managed_execution.sh`, el de
# `thyrox-bg`) en vez de lanzar su ejecutor en el anfitrión. El ítem se
# autoriza por la identidad de trabajo del consumidor —`--work-reference
# CONSUMIDOR:ÁMBITO`, y el ítem n es `ÁMBITO/n`— con dueño `pool`, y no recibe
# ninguna credencial del pool. El pool sigue siendo el distribuidor: cómo se
# materializa la unidad lo decide la primitiva. Por defecto, `host`.
#
# El modelo de los ítems no se declara: se deriva de `--task-class` con
""")
sub("""CREDENTIAL_PROXY=""; STORE_CREDENTIAL_PROXY=""; CREDENTIAL_SOURCE=""
""", """CREDENTIAL_PROXY=""; STORE_CREDENTIAL_PROXY=""; CREDENTIAL_SOURCE=""
EXECUTION=host; WORK_REFERENCE=""
""")
sub("""        --runner) RUNNER_KIND="${2:-}"; shift 2 ;;
""", """        --runner) RUNNER_KIND="${2:-}"; shift 2 ;;
        --execution) EXECUTION="${2:-}"; shift 2 ;;
        --work-reference) WORK_REFERENCE="${2:-}"; shift 2 ;;
""")
sub("""        *) rehusa "opcion desconocida: $1" ;;
    esac
done
""", """        *) rehusa "opcion desconocida: $1" ;;
    esac
done
# Dónde corre cada ítem. En la unidad el ítem no hereda el entorno del pool, así
# que una fuente de credencial del pool no le llegaría: se rehúsa en vez de
# aceptarla y no entregarla.
case "$EXECUTION" in
    host) [[ -z "$WORK_REFERENCE" ]] || rehusa "--work-reference sólo aplica con --execution unit" ;;
    unit)
        [[ "$WORK_REFERENCE" =~ ^[a-z0-9][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9_.:/-]*$ ]] \\
            || rehusa "--execution unit exige --work-reference CONSUMIDOR:ÁMBITO, la identidad de trabajo del consumidor; no: ${WORK_REFERENCE:-(vacía)}"
        [[ -z "$ISOLATION" ]] || rehusa "--execution unit no va todavía con --isolation worktree"
        [[ -z "$CREDENTIAL_PROXY$STORE_CREDENTIAL_PROXY$CREDENTIAL_SOURCE" ]] \\
            || rehusa "--execution unit no entrega credenciales del pool al ítem: no va con --credential-*" ;;
    *) rehusa "--execution va host o unit, no: $EXECUTION" ;;
esac
""")
sub("""export HP_ISOLATION="$ISOLATION" HP_VERIFY="$VERIFY" HP_RUNNER_KIND="$RUNNER_KIND"
""", """export HP_ISOLATION="$ISOLATION" HP_VERIFY="$VERIFY" HP_RUNNER_KIND="$RUNNER_KIND"
# El runner gestionado, el mismo que usa `thyrox-bg --task`: el pool sólo pide la
# ejecución; qué la materializa no vive en este guion.
# shellcheck source=../lib/managed_execution.sh
source "$THYROX_ROOT/src/lib/managed_execution.sh"
export HP_EXECUTION="$EXECUTION" HP_WORK_CONSUMER="${WORK_REFERENCE%%:*}" HP_WORK_SCOPE="${WORK_REFERENCE#*:}"
export HP_THYROX_ROOT="$THYROX_ROOT" HP_EXECUTE_RUNNER_ARGV="$(thyrox_managed_execution_runner_argv)"
""")
sub("""export HP_TIME
""", """# En la unidad, GNU Time mediría al cliente que espera la ejecución, no al ítem:
# sus filas contaminarían el historial de memoria. La unidad acota memoria y CPU.
if [[ "$EXECUTION" == unit && -n "$HP_TIME" ]]; then
    HP_TIME=""
    echo "medida: --execution unit no mide el ítem con GNU Time; lo acota la unidad"
fi
export HP_TIME
""")
sub("""         exec setsid ${HP_TIME:+"$HP_TIME" -q -f "%M %e %U %S" -o "$HP_LIVE/$n.time"} \\
         timeout "$HP_TIMEOUT" "$HP_RUNNER" -p \\
            --model "$HP_MODEL" --setting-sources project \\
            --tools "$HP_TOOLS" --allowedTools "$HP_TOOLS" \\
            ${HP_MAX_TURNS:+--max-turns "$HP_MAX_TURNS"} --no-session-persistence "${session_args[@]}" \\
            --output-format stream-json --verbose) \\
""", """         item_argv=("$HP_RUNNER" -p \\
            --model "$HP_MODEL" --setting-sources project \\
            --tools "$HP_TOOLS" --allowedTools "$HP_TOOLS" \\
            ${HP_MAX_TURNS:+--max-turns "$HP_MAX_TURNS"} --no-session-persistence "${session_args[@]}" \\
            --output-format stream-json --verbose)
         if [[ "$HP_EXECUTION" == unit ]]; then
             # La unidad no recibe la entrada estándar del pool: el texto del
             # ítem va a un archivo de su salida, que la unidad monta. Recibe
             # sólo las variables que el pool le nombra, ninguna credencial.
             cat > "$HP_LIVE/$n.prompt"
             mapfile -t execute_argv <<< "$HP_EXECUTE_RUNNER_ARGV"
             unit_args=(--work "$HP_WORK_CONSUMER:$HP_WORK_SCOPE/$n" --owner "pool:${HP_WORK_SCOPE//[^A-Za-z0-9_.-]/-}-$n"
                        --kind maintenance --network host --workdir "$workdir")
             mounted=("$HP_THYROX_ROOT")
             for path in "$workdir" "$HP_LIVE"; do
                 covered=""
                 for parent in "${mounted[@]}"; do [[ "$path/" == "$parent/"* ]] && covered=1; done
                 [[ -n "$covered" ]] || { unit_args+=(--mount "$path:$path:rw"); mounted+=("$path"); }
             done
             for name in THYROX_CODE_PROMPT_CACHE_TTL THYROX_POOL_DOCUMENT_INTENT THYROX_POOL_RUN_ID THYROX_POOL_ITEM \\
                         THYROX_POOL_ITEM_GENERATION THYROX_MAILBOX_DIR THYROX_POOL_ITEM_ADDRESS; do
                 [[ -z "${!name:-}" ]] || unit_args+=(--env "$name")
             done
             exec setsid timeout "$HP_TIMEOUT" "${execute_argv[@]}" run "${unit_args[@]}" \\
                -- bash -c 'prompt="$1"; shift; exec "$@" < "$prompt"' item "$HP_LIVE/$n.prompt" "${item_argv[@]}"
         fi
         exec setsid ${HP_TIME:+"$HP_TIME" -q -f "%M %e %U %S" -o "$HP_LIVE/$n.time"} \\
         timeout "$HP_TIMEOUT" "${item_argv[@]}") \\
""")
p.write_text(s); print('ok')
