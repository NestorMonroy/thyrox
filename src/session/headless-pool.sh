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
# La VRAM (`gpu_monitor.py`), si hay nvidia-smi (HEADLESS_POOL_NVIDIA_SMI):
# cada item deja <n>.gpu con su pico, media y uso de GPU, y antes de arrancar
# RESERVA su pico en un registro compartido (HEADLESS_POOL_VRAM_LEDGER) bajo
# lock: libre menos lo comprometido y aún no usado por otros items o pools
# (la admision de --memfree, que Parallel no tiene para la GPU). Al terminar
# suelta la reserva. La anchura con que se lanza es
# min(configurada, RAM, VRAM): cada tope es (libre - reserva) / (pico x 2),
# con la reserva de VRAM en HEADLESS_POOL_VRAM_RESERVE_MIB. Sin nvidia-smi se
# declara y no se mide.
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
# El ejecutor de cada ítem: `thyrox -p` (`bin/cli`) salvo que se declare otro.
# `HEADLESS_POOL_CLAUDE` conserva su nombre por compatibilidad con quien ya lo
# declara; su valor ya no es `claude` por defecto.
CLAUDE_BIN="${HEADLESS_POOL_CLAUDE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../bin" && pwd)/cli}"
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
        -h|--help) sed -n '2,62p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) rehusa "opcion desconocida: $1" ;;
    esac
done

command -v "$PARALLEL_BIN" >/dev/null 2>&1 \
    || rehusa "falta GNU parallel ($PARALLEL_BIN). Se instala con THYROX_INSTALL_PARALLEL=1 via src/lib/toolchain.sh."
command -v "$CLAUDE_BIN" >/dev/null 2>&1 || rehusa "falta el ejecutor de los ítems ($CLAUDE_BIN)."
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
            "") CACHE_TTL_WHY="option" ;;
            5m|1h) CACHE_TTL="$THYROX_CODE_PROMPT_CACHE_TTL"; CACHE_TTL_WHY="env" ;;
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
# Las herramientas Python se invocan por su interfaz en `bin/`, no por su
# fuente: el envoltorio resuelve el intérprete y PYTHONPATH.
HP_BIN="$HP_HERE/../../bin"
pool_history() { bash "$HP_BIN/pool_history" "$@"; }
HISTORY="$(pool_history dir "$PROMPT")" || rehusa "no se pudo resolver el historial de la plantilla (HEADLESS_POOL_HISTORY_DIR)"

# La VRAM de cada item, si hay GPU (`gpu_monitor.py`). `--memfree` es memoria
# del SISTEMA; la de la GPU es otro recurso. Con `claude -p` el modelo corre en
# el servidor y la GPU local no se usa: medirla informa cuando el pool corre
# trabajo local con CUDA. Sin nvidia-smi se declara, igual que sin GNU Time.
NVIDIA_SMI_BIN="${HEADLESS_POOL_NVIDIA_SMI:-nvidia-smi}"
HP_GPU="$HP_BIN/gpu_monitor"
HP_GPU_INTERVAL="${HEADLESS_POOL_GPU_INTERVAL:-0.5}"
# El registro de VRAM comprometida, compartido por TODOS los pools que usan la
# misma base de historial: lo que un pool reservó y aún no usa, otro no lo da.
HP_VRAM_LEDGER="${HEADLESS_POOL_VRAM_LEDGER:-$(dirname "$HISTORY")/vram-reservations.json}"
HP_NVIDIA_SMI=""
if bash "$HP_GPU" available --nvidia-smi "$NVIDIA_SMI_BIN" 2>/dev/null; then
    HP_NVIDIA_SMI="$NVIDIA_SMI_BIN"
    echo "gpu: se mide la VRAM de cada item con $NVIDIA_SMI_BIN (<n>.gpu)"
else
    echo "gpu: sin nvidia-smi ($NVIDIA_SMI_BIN): no se mide la VRAM de los items"
fi
export HP_NVIDIA_SMI HP_GPU HP_GPU_INTERVAL HP_VRAM_LEDGER
# La memoria de un VECINO que corre junto al pool —el `tsc` del pipeline en
# `tsc_cycle`—, parámetro del consumidor: se suma a la medida del ítem.
RESERVE_KB=0
if [[ -n "${HEADLESS_POOL_MEMFREE_RESERVE:-}" ]]; then
    RESERVE_BYTES="$(parse_binary_size "$HEADLESS_POOL_MEMFREE_RESERVE" 2>/dev/null)" \
        || rehusa "HEADLESS_POOL_MEMFREE_RESERVE ilegible: '$HEADLESS_POOL_MEMFREE_RESERVE' (ej. 2G, 512M)"
    RESERVE_KB=$(( RESERVE_BYTES / 1024 ))
fi
# La reserva de VRAM se RESTA de la libre (MiB): lo que queda para lo demás
# que usa la GPU. Parámetro del consumidor.
VRAM_RESERVE_MIB="${HEADLESS_POOL_VRAM_RESERVE_MIB:-0}"
[[ "$VRAM_RESERVE_MIB" =~ ^[0-9]+$ ]] || rehusa "HEADLESS_POOL_VRAM_RESERVE_MIB va en MiB enteros, no: $VRAM_RESERVE_MIB"
# Lo que se mide ahora para acotar la anchura: la RAM disponible y la VRAM
# libre. Sin dato, ese tope no existe y se corre con lo demás.
# El piso de VRAM por ítem, parámetro del consumidor: lo mínimo que pide cada
# ítem aunque el historial diga menos, y lo que pide mientras el historial no
# esté calibrado. Sin piso, un historial sin calibrar pide la GPU entera.
VRAM_FLOOR_MIB="${HEADLESS_POOL_VRAM_MIN_MIB:-0}"
[[ "$VRAM_FLOOR_MIB" =~ ^[0-9]+$ ]] || rehusa "HEADLESS_POOL_VRAM_MIN_MIB va en MiB enteros, no: $VRAM_FLOOR_MIB"
# Los ítems se leen antes de derivar: cuántos van a la vez —min(anchura,
# ítems)— es cuántos tiene que haber medido la fila para representarlos.
mapfile -t ITEMS < <(gawk 'NF')
[[ ${#ITEMS[@]} -gt 0 ]] || rehusa "no recibio ningun item por stdin."
MIN_ITEMS=$(( ${#ITEMS[@]} < WIDTH ? ${#ITEMS[@]} : WIDTH ))
DERIVE_ARGS=(--reserve-kb "$RESERVE_KB" --configured-width "$WIDTH" --vram-reserve-mib "$VRAM_RESERVE_MIB"
             # Representativa de lo que se lanza: la misma plantilla por su
             # contenido y al menos tantos ítems medidos como van a la vez.
             --template "$PROMPT" --min-items "$MIN_ITEMS"
             --gpu-interval "$HP_GPU_INTERVAL" --vram-floor-mib "$VRAM_FLOOR_MIB"
             # La cota es del binario que corre los ítems: una fila medida con
             # `claude -p` no fija la de `thyrox -p` (#48), y al revés.
             --runner "$CLAUDE_BIN"
             # Y del modelo: la misma plantilla con otro modelo es otra carga.
             --item-model "$MODEL")
# La edad máxima de la fila, parámetro del consumidor: sin declarar, la edad no
# cuenta.
if [[ -n "${HEADLESS_POOL_HISTORY_MAX_AGE_HOURS:-}" ]]; then
    [[ "$HEADLESS_POOL_HISTORY_MAX_AGE_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]] \
        || rehusa "HEADLESS_POOL_HISTORY_MAX_AGE_HOURS va en horas, no: $HEADLESS_POOL_HISTORY_MAX_AGE_HOURS"
    DERIVE_ARGS+=(--max-age-hours "$HEADLESS_POOL_HISTORY_MAX_AGE_HOURS")
fi
AVAILABLE_RAM_KB="$(gawk '/^MemAvailable:/{print $2}' "${THYROX_POOL_MEMINFO_PATH:-/proc/meminfo}" 2>/dev/null)"
[[ -z "$AVAILABLE_RAM_KB" ]] || DERIVE_ARGS+=(--available-ram-kb "$AVAILABLE_RAM_KB")
if [[ -n "$HP_NVIDIA_SMI" ]]; then
    FREE_VRAM_MIB="$(bash "$HP_GPU" free --nvidia-smi "$HP_NVIDIA_SMI" 2>/dev/null)"
    [[ -z "$FREE_VRAM_MIB" ]] || DERIVE_ARGS+=(--free-vram-mib "$FREE_VRAM_MIB")
fi
MEMFREE_WHY=option
HP_VRAM_NEED=""
# Se deriva SIEMPRE: el TTL y --memfree sólo si nadie los declaró, pero la
# anchura efectiva es min(configurada, RAM, VRAM) aunque la anchura se haya
# configurado — una anchura configurada es un máximo, no una garantía de sitio.
if IFS=$'\t' read -r H_TTL H_MEMFREE H_WIDTH H_VRAM_NEED H_WHY \
        < <(pool_history derive "$HISTORY" "$MODEL" "${DERIVE_ARGS[@]}"); then
    [[ -n "$CACHE_TTL" || "$H_TTL" == - ]] || { CACHE_TTL="$H_TTL"; CACHE_TTL_WHY=history; }
    [[ -n "$MEMFREE_SPEC" || "$H_MEMFREE" == - ]] || { MEMFREE_SPEC="$H_MEMFREE"; MEMFREE_WHY=history; }
    if [[ "$H_WIDTH" != - && "$H_WIDTH" -lt "$WIDTH" ]]; then
        echo "anchura: $H_WIDTH (configurada $WIDTH; acotada por lo medido)"
        WIDTH="$H_WIDTH"
    fi
    [[ -z "$HP_NVIDIA_SMI" || "$H_VRAM_NEED" == - ]] || HP_VRAM_NEED="$H_VRAM_NEED"
    echo "historial: $H_WHY"
else
    echo "historial: no se pudo derivar (sin catálogo de modelos); corre con lo declarado"
fi
export HP_VRAM_NEED

mkdir -p "$OUT"
: > "$OUT/index.tsv"
for i in "${!ITEMS[@]}"; do
    printf '%d\t%s\n' "$((i + 1))" "${ITEMS[$i]}" >> "$OUT/index.tsv"
done

# Un item por trabajo. El cuerpo va en una funcion exportada para que GNU
# Parallel no tenga que citar el prompt: recibe numero e item como argumentos.
_headless_item() {
    local n="$1" item="$2"
    # Admisión por VRAM, la mitad de `--memfree` que Parallel no tiene para la
    # GPU (`parallel` 20231122, líneas 4113-4118: no arranca si no hay sitio).
    # La VRAM libre cambia mientras los items arrancan: se mira por item, justo
    # antes de lanzar, y se RESERVA en el mismo paso bajo el lock del registro
    # (`gpu_monitor admit`): comprobar sin reservar dejaba arrancar a dos items
    # que no cabían juntos. El dueño es este shell, vivo hasta que el item
    # termina; el `release` de abajo suelta la reserva, y si el shell muere
    # antes, su reserva deja de contar sola. La otra mitad de Parallel —matar
    # al más joven cuando lo libre cae a la mitad, 6847 y 6980-7005— NO se
    # porta: matar un `claude -p` a mitad de su petición tira los tokens ya
    # pagados.
    local owner="$BASHPID" admit_rc=0
    if [[ -n "$HP_VRAM_NEED" ]]; then
        bash "$HP_GPU" admit "$HP_VRAM_NEED" --ledger "$HP_VRAM_LEDGER" --owner "$owner" \
            --nvidia-smi "$HP_NVIDIA_SMI" --timeout "$HP_TIMEOUT" --interval "$HP_GPU_INTERVAL" \
            2> "$HP_OUT/$n.admit.err" || admit_rc=$?
    fi
    # 3 es el plazo vencido, una medida; cualquier otro código es que la
    # admisión no pudo decidir, y decir «no hubo sitio» afirmaría lo que no
    # se midió.
    if [[ "$admit_rc" -ne 0 ]]; then
        if [[ "$admit_rc" -eq 3 ]]; then
            echo "admision por VRAM vencida: el item pide $HP_VRAM_NEED MiB y no hubo sitio en ${HP_TIMEOUT}s"
        else
            echo "la admision por VRAM fallo (exit $admit_rc); el item no se lanzo:"
            cat "$HP_OUT/$n.admit.err"
        fi > "$HP_OUT/$n.err"
        : > "$HP_OUT/$n.json"
        return 3
    fi
    rm -f "$HP_OUT/$n.admit.err"
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
        bash "$HP_GPU" watch "$pid" "$HP_OUT/$n.gpu" \
            --nvidia-smi "$HP_NVIDIA_SMI" --interval "$HP_GPU_INTERVAL" &
        monitor=$!
    fi
    wait "$pid"
    local rc=$?
    [[ -z "$monitor" ]] || wait "$monitor"
    [[ -z "$HP_VRAM_NEED" ]] || bash "$HP_GPU" release --ledger "$HP_VRAM_LEDGER" --owner "$owner"
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
HP_PROMPT="$(cd "$(dirname "$PROMPT")" && pwd)/$(basename "$PROMPT")"
HP_OUT="$(cd "$OUT" && pwd)"
HP_CLAUDE="$(command -v "$CLAUDE_BIN")"
export HP_PROMPT HP_OUT HP_CLAUDE
export HP_WORKDIR="$WORKDIR" HP_TIMEOUT="$TIMEOUT" HP_MODEL="$MODEL"
export HP_TOOLS="$TOOLS" HP_MAX_TURNS="$MAX_TURNS" HP_CACHE_TTL="$CACHE_TTL"
# Qué decidió el TTL, para que el paso lo registre y no haya que deducirlo.
[[ -z "$CACHE_TTL" ]] || echo "cache-ttl: $CACHE_TTL ($CACHE_TTL_WHY)"

# La memoria de cada item se mide con GNU Time si esta. Se resuelve por el
# toolchain, como en `bg.sh` y `run-task-pool.sh` —una sola definición de
# «es GNU Time» y su instalador opt-in (THYROX_INSTALL_GNU_TIME=1)—, con
# HEADLESS_POOL_TIME como anulación. La consulta va en una SUBSHELL: el
# toolchain exporta sus defaults y los heredarían los ítems. Sin GNU Time el
# pool corre igual y lo declara: una medida ausente no es un cero.
HP_TIME="$(THYROX_TOOLCHAIN_TIME_BIN="${HEADLESS_POOL_TIME:-${THYROX_TOOLCHAIN_TIME_BIN:-}}"
           source "$HP_HERE/../lib/toolchain.sh"
           thyrox_toolchain_require_gnu_time 2>/dev/null && thyrox_toolchain_gnu_time_bin)" || HP_TIME=""
export HP_TIME

MEMFREE_ARGS=()
if [[ -n "$MEMFREE_SPEC" ]]; then
    parse_binary_size "$MEMFREE_SPEC" >/dev/null 2>&1 || rehusa "--memfree ilegible: '$MEMFREE_SPEC' (ej. 2G, 512M)"
    MEMFREE_ARGS=(--memfree "$MEMFREE_SPEC")
    echo "memfree: $MEMFREE_SPEC ($MEMFREE_WHY)"
fi

"$PARALLEL_BIN" -j "$WIDTH" "${MEMFREE_ARGS[@]}" --colsep '\t' --joblog "$OUT/joblog.tsv" \
    _headless_item '{1}' '{2}' :::: "$OUT/index.tsv" >/dev/null 2>&1

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
[[ -z "$HP_TIME" ]] || pool_history record "$HISTORY" "$OUT" --runner "$CLAUDE_BIN" --item-model "$MODEL" --template "$PROMPT" >/dev/null
[[ -n "$HP_TIME" ]] || echo "memoria: sin GNU time, no se midio la de los items (instalalo con thyrox_toolchain_require_gnu_time)"
exit $STATUS
