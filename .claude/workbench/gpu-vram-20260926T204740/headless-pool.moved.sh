#!/usr/bin/env bash
# =============================================================================
# headless-pool.sh — la TERCERA forma de despacho: N lecturas con juicio, una
# conversacion `claude -p` por item, repartidas con GNU Parallel
# =============================================================================
#
# Por que existe
# --------------
# `trabajo-en-segundo-plano.md` tenia dos formas: el PROCESO (determinista,
# cero tokens: `bg.sh`, `run-task-pool.sh`) y el SUBAGENTE (una conversacion
# con juicio). Entre las dos faltaba la que el ejecutor pidio en H-THYROX-168:
# N items independientes que SI exigen juicio —leer una nota y extraer sus
# conceptos, clasificar un hallazgo— y que no necesitan ni el contexto del
# orquestador ni su anchura de subagentes. Hasta hoy eso solo existia como un
# guion suelto de banco (`notas-ai-course-aplicables-a-thyrox-*/probes/
# extraer-conceptos.sh`), que corrio bien y que nadie mas podia invocar.
#
# Frente a un subagente, cada `claude -p` de aqui:
#   - no hereda la conversacion del orquestador, solo la plantilla y su item;
#   - no ocupa la anchura del tool `Agent`, que RECHAZA el lanzamiento N+1
#     (`model-selection-subagents.md`);
#   - deja su salida en disco, por item, antes de que nadie la resuma.
#
# Contrato
# --------
#   headless-pool.sh --prompt <plantilla> --out <dir> --model <claude-…>
#                    [--width N] [--timeout S] [--tools LISTA] [--max-turns N]
#                    [--cwd DIR] [--memfree TAM] [--cache-ttl 5m|1h]
#                    < items (uno por linea)
#
# Con GNU Time (/usr/bin/time, o HEADLESS_POOL_TIME) cada item deja <n>.time
# con "memoria-pico-KB pared-s usuario-s sistema-s". La memoria pico incluye
# al nieto que corre bajo `timeout`: medido, un proceso que reserva 200 MB bajo
# `timeout` da 212 680 KB. Sin GNU Time el pool corre igual y lo declara.
#
# `--cache-ttl` fija el TTL de la cache de cada `claude -p` con
# CLAUDE_CODE_PROMPT_CACHE_TTL. Sin la opcion decide el cliente: 1 h en
# suscripcion, 5 m con clave de API. Otro valor rehusa con exit 2.
#
# `--memfree` pasa la cota por MEMORIA de GNU Parallel (admision: no lanza un
# item si queda menos que TAM; aplicacion: si baja de la mitad, mata al mas
# joven y lo reencola), la misma que `run-task-pool.sh` porta a mano. La
# anchura acota cuantos corren, no cuanta memoria ocupan; y con el pool
# corriendo junto a un `tsc` completo (2.0 GB) en el arbol de medicion
# (`pool_pipeline.py`), la anchura sola no protege a ninguno de los dos.
#
# El historial (`pool_history.py`, uno por plantilla bajo
# HEADLESS_POOL_HISTORY_DIR o el caché del repo): cada ejecución medida con
# GNU Time deja una fila, y la siguiente deriva de ella lo que nadie declaró —
# el TTL con `choose_cache_ttl` sobre la pared máxima, y `--memfree` como la
# memoria pico × 2 más HEADLESS_POOL_MEMFREE_RESERVE (la de un vecino que corre
# al lado). Lo declarado —opción o entorno— gana siempre; sin historial no se
# inventa nada, y la salida lo dice.
#
# El prompt de cada item es la plantilla seguida de `Item: <linea>`. Por item
# escribe `<out>/<n>.stream.jsonl` (una linea por evento de `--output-format
# stream-json`, con el uso de cada peticion), `<n>.json` (su linea `result`) y
# `<n>.err`;
# `<out>/index.tsv` empareja numero e item, y `<out>/joblog.tsv` es el de
# GNU Parallel. Publica `-- FALLIDO <item>` por cada fallo y una linea final
# `items=N ok=K fallidos=F`. Sale 0 si todos terminaron bien, 1 si alguno no.
#
# Cada `claude -p` corre con `--no-session-persistence`, `--setting-sources
# project` y sus herramientas acotadas (`--tools`, por defecto `Read`): es una
# lectura, no un agente con permisos de escritura.
#
# Rehusa con exit 2, y SIN la linea de resumen, si falta GNU Parallel, falta
# `claude`, falta la plantilla, no hay items o el modelo es un alias: un
# resumen ahi no distinguiria «no hubo fallos» de «no pude despachar».
#
# El modelo va por IDENTIFICADOR COMPLETO: un alias resuelve distinto segun el
# proveedor, y con el no se sabe que tier ni que ventana se pago.
#
# *Ciega a:* la CALIDAD de lo que cada item devuelve. El veredicto es de
# despacho —termino, fallo, se corto—; que el resultado sirva lo juzga quien lo
# agrega.
set -uo pipefail

PARALLEL_BIN="${HEADLESS_POOL_PARALLEL:-parallel}"
CLAUDE_BIN="${HEADLESS_POOL_CLAUDE:-claude}"
PROMPT=""; OUT=""; MODEL=""
WIDTH="$(nproc 2>/dev/null || echo 4)"
TIMEOUT=600; TOOLS="Read"; MAX_TURNS=12; WORKDIR="$PWD"; MEMFREE_SPEC=""; CACHE_TTL=""

rehusa() { echo "headless-pool: REHUSA — $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prompt) PROMPT="${2:-}"; shift 2 ;;
        --out) OUT="${2:-}"; shift 2 ;;
        --model) MODEL="${2:-}"; shift 2 ;;
        --width) WIDTH="${2:-}"; shift 2 ;;
        --timeout) TIMEOUT="${2:-}"; shift 2 ;;
        --tools) TOOLS="${2:-}"; shift 2 ;;
        --max-turns) MAX_TURNS="${2:-}"; shift 2 ;;
        --cwd) WORKDIR="${2:-}"; shift 2 ;;
        --memfree) MEMFREE_SPEC="${2:-}"; shift 2 ;;
        --cache-ttl) CACHE_TTL="${2:-}"; shift 2 ;;
        -h|--help) sed -n '2,54p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) rehusa "opcion desconocida: $1" ;;
    esac
done

command -v "$PARALLEL_BIN" >/dev/null 2>&1 \
    || rehusa "falta GNU parallel ($PARALLEL_BIN). Se instala con THYROX_INSTALL_PARALLEL=1 via src/lib/toolchain.sh."
command -v "$CLAUDE_BIN" >/dev/null 2>&1 || rehusa "falta \`claude\` ($CLAUDE_BIN)."
[[ -n "$PROMPT" && -f "$PROMPT" ]] || rehusa "la plantilla de prompt no existe: ${PROMPT:-(sin --prompt)}"
[[ -n "$OUT" ]] || rehusa "falta --out"
case "$MODEL" in
    claude-*) ;;
    *) rehusa "--model va por identificador completo (claude-…), no alias: ${MODEL:-(vacio)}" ;;
esac
[[ -d "$WORKDIR" ]] || rehusa "--cwd no existe: $WORKDIR"
# El TTL de la caché de cada `claude -p` (CLAUDE_CODE_PROMPT_CACHE_TTL). Sin
# la opción no se fija y decide el cliente: 1 h en suscripción, 5 m con clave.
case "$CACHE_TTL" in
    ""|5m|1h) ;;
    *) rehusa "--cache-ttl va \"5m\" o \"1h\", no: $CACHE_TTL" ;;
esac
# El entorno manda sobre la opción, en el orden de `QCt` (2.1.282, extraído
# con `bin/binary symbol chunk-c9jscxk0.js QCt`): forzar 5m, luego la variable
# de la conversación principal —cada ítem es un `-p`, que el ejecutable cuenta
# como principal—, luego lo que el llamador decidió. Porte TS de la misma
# cadena: `src/packages/agent/promptCacheTtl.ts`.
case "$(printf '%s' "${THYROX_FORCE_PROMPT_CACHING_5M:-}" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on) CACHE_TTL=5m; CACHE_TTL_WHY=force_5m_env ;;
    *)
        case "${THYROX_CODE_PROMPT_CACHE_TTL:-}" in
            "") CACHE_TTL_WHY=option ;;
            5m|1h) CACHE_TTL="$THYROX_CODE_PROMPT_CACHE_TTL"; CACHE_TTL_WHY=env ;;
            *) rehusa "THYROX_CODE_PROMPT_CACHE_TTL va \"5m\" o \"1h\", no: $THYROX_CODE_PROMPT_CACHE_TTL" ;;
        esac ;;
esac
# Activar 1h (regla 5 de `QCt`): sólo si nada de arriba decidió.
if [[ -z "$CACHE_TTL" ]]; then
    case "$(printf '%s' "${THYROX_ENABLE_PROMPT_CACHING_1H:-}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|on) CACHE_TTL=1h; CACHE_TTL_WHY=enable_1h_env ;;
    esac
fi

# El historial de ESTA plantilla (`pool_history.py`): lo que nadie declaró
# arriba —TTL ni `--memfree`— se deriva de la última ejecución medida. Va
# después de toda la cadena de TTL, así que lo declarado gana siempre. Sin
# historial no se inventa nada, y se dice.
HP_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# El mismo parser de tamaños que `run-task-pool.sh` y `bg.sh`: una cota
# ilegible no se deja a la interpretación de Parallel.
source "$HP_HERE/../lib/memory.sh"
pool_history() { PYTHONPATH="$HP_HERE/..${PYTHONPATH:+:$PYTHONPATH}" python3 "$HP_HERE/pool_history.py" "$@"; }
HISTORY="$(pool_history dir "$PROMPT")" || rehusa "no se pudo resolver el historial de la plantilla (HEADLESS_POOL_HISTORY_DIR)"

# La VRAM de cada item, si hay GPU (`gpu_monitor.py`). `--memfree` es memoria
# del SISTEMA; la de la GPU es otro recurso. Con `claude -p` el modelo corre en
# el servidor y la GPU local no se usa: medirla informa cuando el pool corre
# trabajo local con CUDA. Sin nvidia-smi se declara, igual que sin GNU Time.
NVIDIA_SMI_BIN="${HEADLESS_POOL_NVIDIA_SMI:-nvidia-smi}"
HP_GPU_PY="$HP_HERE/gpu_monitor.py"
HP_PYPATH="$HP_HERE/..${PYTHONPATH:+:$PYTHONPATH}"
HP_GPU_INTERVAL="${HEADLESS_POOL_GPU_INTERVAL:-0.5}"
HP_NVIDIA_SMI=""
if PYTHONPATH="$HP_PYPATH" python3 "$HP_GPU_PY" available --nvidia-smi "$NVIDIA_SMI_BIN" 2>/dev/null; then
    HP_NVIDIA_SMI="$NVIDIA_SMI_BIN"
    echo "gpu: se mide la VRAM de cada item con $NVIDIA_SMI_BIN (<n>.gpu)"
else
    echo "gpu: sin nvidia-smi ($NVIDIA_SMI_BIN): no se mide la VRAM de los items"
fi
export HP_NVIDIA_SMI HP_GPU_PY HP_PYPATH HP_GPU_INTERVAL
# La memoria de un VECINO que corre junto al pool —el `tsc` del pipeline en
# `tsc_cycle`—, parámetro del consumidor: se suma a la medida del ítem.
RESERVE_KB=0
if [[ -n "${HEADLESS_POOL_MEMFREE_RESERVE:-}" ]]; then
    RESERVE_BYTES="$(parse_binary_size "$HEADLESS_POOL_MEMFREE_RESERVE" 2>/dev/null)" \
        || rehusa "HEADLESS_POOL_MEMFREE_RESERVE ilegible: '$HEADLESS_POOL_MEMFREE_RESERVE' (ej. 2G, 512M)"
    RESERVE_KB=$(( RESERVE_BYTES / 1024 ))
fi
MEMFREE_WHY=option
if [[ -z "$CACHE_TTL" || -z "$MEMFREE_SPEC" ]]; then
    if IFS=$'\t' read -r H_TTL H_MEMFREE H_WHY < <(pool_history derive "$HISTORY" "$MODEL" --reserve-kb "$RESERVE_KB"); then
        [[ -n "$CACHE_TTL" || "$H_TTL" == - ]] || { CACHE_TTL="$H_TTL"; CACHE_TTL_WHY=history; }
        [[ -n "$MEMFREE_SPEC" || "$H_MEMFREE" == - ]] || { MEMFREE_SPEC="$H_MEMFREE"; MEMFREE_WHY=history; }
        echo "historial: $H_WHY"
    else
        echo "historial: no se pudo derivar (sin catálogo de modelos); corre con lo declarado"
    fi
fi

mapfile -t ITEMS < <(gawk 'NF')
[[ ${#ITEMS[@]} -gt 0 ]] || rehusa "no recibio ningun item por stdin."

mkdir -p "$OUT"
: > "$OUT/index.tsv"
for i in "${!ITEMS[@]}"; do
    printf '%d\t%s\n' "$((i + 1))" "${ITEMS[$i]}" >> "$OUT/index.tsv"
done

# Un item por trabajo. El cuerpo va en una funcion exportada para que GNU
# Parallel no tenga que citar el prompt: recibe numero e item como argumentos.
_headless_item() {
    local n="$1" item="$2"
    { cat "$HP_PROMPT"; printf '\nItem: %s\n' "$item"; } \
      | (cd "$HP_WORKDIR" || exit 1
         # Con los dos nombres: `claude -p` lee CLAUDE_CODE_*; `thyrox -p`, THYROX_*.
         [[ -z "$HP_CACHE_TTL" ]] || export CLAUDE_CODE_PROMPT_CACHE_TTL="$HP_CACHE_TTL" \
                                           THYROX_CODE_PROMPT_CACHE_TTL="$HP_CACHE_TTL"
         # Con GNU Time, la memoria pico, la pared y la CPU del item quedan en
         # <n>.time; el codigo de salida es el del item, que time conserva.
         # `-q`: sin el, GNU Time antepone «Command exited with non-zero status
         # N» a la medida del item que falla, y un consumidor que lee la
         # primera palabra (`ai-course-notes: translation_loop.py`) revienta.
         ${HP_TIME:+"$HP_TIME" -q -f "%M %e %U %S" -o "$HP_OUT/$n.time"} \
         timeout "$HP_TIMEOUT" "$HP_CLAUDE" -p \
            --model "$HP_MODEL" --setting-sources project \
            --tools "$HP_TOOLS" --allowedTools "$HP_TOOLS" \
            --max-turns "$HP_MAX_TURNS" --no-session-persistence \
            --output-format stream-json --verbose) \
      > "$HP_OUT/$n.stream.jsonl" 2> "$HP_OUT/$n.err" &
    local pid=$! monitor=""
    # La VRAM del item: GNU Time mide su RAM y no ve la GPU. El monitor
    # muestrea el ARBOL de `pid` (el item y `claude`) mientras vive y deja
    # <n>.gpu; sin nvidia-smi no se lanza y el pool ya lo declaro.
    if [[ -n "$HP_NVIDIA_SMI" ]]; then
        PYTHONPATH="$HP_PYPATH" python3 "$HP_GPU_PY" watch "$pid" "$HP_OUT/$n.gpu" \
            --nvidia-smi "$HP_NVIDIA_SMI" --interval "$HP_GPU_INTERVAL" &
        monitor=$!
    fi
    wait "$pid"
    local rc=$?
    [[ -z "$monitor" ]] || wait "$monitor"
    # El .json de siempre es la linea `result` del stream: sus consumidores
    # no cambian. El stream se queda porque es lo unico que trae el uso de
    # cada peticion; `usage.iterations` del result trae solo la ultima.
    # Se elige por el campo `type` ya parseado, no por el orden de las claves,
    # que el ejecutable no garantiza; una linea truncada por timeout se salta.
    jq -cR 'fromjson? | select(.type == "result")' "$HP_OUT/$n.stream.jsonl" \
        | tail -1 > "$HP_OUT/$n.json"
    return "$rc"
}
export -f _headless_item
export HP_PROMPT="$(cd "$(dirname "$PROMPT")" && pwd)/$(basename "$PROMPT")"
export HP_OUT="$(cd "$OUT" && pwd)" HP_WORKDIR="$WORKDIR" HP_TIMEOUT="$TIMEOUT"
export HP_CLAUDE="$(command -v "$CLAUDE_BIN")" HP_MODEL="$MODEL"
export HP_TOOLS="$TOOLS" HP_MAX_TURNS="$MAX_TURNS" HP_CACHE_TTL="$CACHE_TTL"
# Qué decidió el TTL, para que el paso lo registre y no haya que deducirlo.
[[ -z "$CACHE_TTL" ]] || echo "cache-ttl: $CACHE_TTL ($CACHE_TTL_WHY)"

# La memoria de cada item se mide con GNU Time si esta (se instala con
# thyrox_toolchain_require_gnu_time). Sin el, el pool corre igual y lo declara:
# una medida ausente no es un cero.
TIME_BIN="${HEADLESS_POOL_TIME:-/usr/bin/time}"
HP_TIME=""
if [[ -x "$TIME_BIN" ]] && [[ "$("$TIME_BIN" --version 2>&1)" == *"GNU Time"* ]]; then
    HP_TIME="$TIME_BIN"
fi
export HP_TIME

MEMFREE_ARGS=()
if [[ -n "$MEMFREE_SPEC" ]]; then
    parse_binary_size "$MEMFREE_SPEC" >/dev/null 2>&1 || rehusa "--memfree ilegible: '$MEMFREE_SPEC' (ej. 2G, 512M)"
    MEMFREE_ARGS=(--memfree "$MEMFREE_SPEC")
    echo "memfree: $MEMFREE_SPEC ($MEMFREE_WHY)"
fi

"$PARALLEL_BIN" -j "$WIDTH" "${MEMFREE_ARGS[@]}" --colsep '\t' --joblog "$OUT/joblog.tsv" \
    _headless_item {1} {2} :::: "$OUT/index.tsv" >/dev/null 2>&1

# El veredicto sale del joblog (columna Exitval), emparejado con el indice por
# numero: no depende del orden en que terminaron.
gawk -F'\t' '
    NR == FNR { item[$1] = $2; next }
    FNR == 1 { next }
    { split($9, a, " "); n = a[2]; total++
      if ($7 == 0) ok++; else { printf "-- FALLIDO %s\n", item[n]; mal++ } }
    END { printf "items=%d ok=%d fallidos=%d\n", total, ok, mal; exit (mal > 0) }
' "$OUT/index.tsv" "$OUT/joblog.tsv"
STATUS=$?
# La medida de esta ejecución alimenta a la siguiente. Sin GNU Time no hay
# `.time` y `record` no escribe fila: una medida ausente no es un cero.
[[ -z "$HP_TIME" ]] || pool_history record "$HISTORY" "$OUT" >/dev/null
[[ -n "$HP_TIME" ]] || echo "memoria: sin GNU time, no se midio la de los items (instalalo con thyrox_toolchain_require_gnu_time)"
exit $STATUS
