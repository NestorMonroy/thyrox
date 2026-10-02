from pathlib import Path
p = Path('src/session/headless-pool.sh'); s = p.read_text()
def sub(old, new):
    global s
    assert s.count(old) == 1, old[:80]; s = s.replace(old, new)
sub("""announce_model
""", """announce_model
# Con el modelo local en la unidad, el `thyrox -p` del ítem pide admisión al
# coordinador de ESTE anfitrión: la unidad recibe su socket —el directorio de
# sólo lectura y la ruta nombrada—, no el runtime entero (TASK-THYROX-0759).
HP_COORDINATOR_SOCKET=""
if [[ "$EXECUTION" == unit && "$RUNTIME" == "$LOCAL_RUNTIME" ]]; then
    HP_COORDINATOR_SOCKET="${THYROX_MODEL_COORDINATOR_SOCKET:-$(bash "$THYROX_ROOT/bin/model-scheduling-socket-path" 2>/dev/null)}"
    [[ "$HP_COORDINATOR_SOCKET" == /* ]] || rehusa "no se resolvió el socket del coordinador para el modelo local $MODEL"
fi
export HP_COORDINATOR_SOCKET
""")
sub("""             for name in THYROX_CODE_PROMPT_CACHE_TTL THYROX_POOL_DOCUMENT_INTENT""",
"""             if [[ -n "$HP_COORDINATOR_SOCKET" ]]; then
                 export THYROX_MODEL_COORDINATOR_SOCKET="$HP_COORDINATOR_SOCKET"
                 unit_args+=(--mount "${HP_COORDINATOR_SOCKET%/*}:${HP_COORDINATOR_SOCKET%/*}:ro" --env THYROX_MODEL_COORDINATOR_SOCKET)
             fi
             for name in THYROX_CODE_PROMPT_CACHE_TTL THYROX_POOL_DOCUMENT_INTENT""")
p.write_text(s); print('pool ok')
