#!/usr/bin/env bash
# =============================================================================
# headless-pool.sh — la TERCERA forma de despacho: N lecturas con juicio, una
# conversacion `thyrox -p` por item, repartidas con GNU Parallel
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
# Frente a un subagente, cada `thyrox -p` de aqui:
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
#                    [--credential-proxy] [--isolation worktree [--verify CMD]]
#                    < items (uno por linea)
#
# Sin `--max-turns` el ítem no tiene tope de turnos, igual que `claude -p`:
# lo acota su `--timeout`. Un conteo fijo cortaba ítems largos a mitad de
# trabajo y sin entrega (`error_max_turns`).
#
# `--isolation worktree` hace que cada item implemente: corre en su propio
# worktree desde HEAD (`item_worktree.sh`), con Bash como única herramienta por
# defecto, y al terminar deja <n>.patch, <n>.files y <n>.verdict
# (`verificado`, `rechazado`, `sin-verificar`, `sin-cambios`, `fallido` o
# `con-stash` —el ítem intentó `git stash`, que el pool rehúsa—;
# `--verify CMD` corre en el worktree). El arbol principal no cambia:
# `bin/pool_integrate OUT` aplica lo verificado y disjunto, y el commit es de
# quien integra.
#
# `--credential-proxy` lanza el proxy de credencial
# (`bin/provider-credential-proxy`, o HEADLESS_POOL_CREDENTIAL_PROXY) con la
# credencial del entorno del pool, y cada item recibe sólo
# ANTHROPIC_UNIX_SOCKET y el marcador `ssh-placeholder` como
# ANTHROPIC_API_KEY: ningún item ve el secreto. Es el túnel por socket del
# ejecutable (`i1` de 2.1.283). Si el proxy no arranca, el pool rehúsa con
# exit 2 sin lanzar items; al terminar, el pool lo detiene.
#
# Con GNU Time (/usr/bin/time, o HEADLESS_POOL_TIME) cada item deja <n>.time
# con "memoria-pico-KB pared-s usuario-s sistema-s". La memoria pico incluye
# al nieto que corre bajo `timeout`: medido, un proceso que reserva 200 MB bajo
# `timeout` da 212 680 KB. Sin GNU Time el pool corre igual y lo declara.
#
# `--cache-ttl` fija el TTL de la cache de cada `thyrox -p` con
# THYROX_CODE_PROMPT_CACHE_TTL. Sin la opcion decide el cliente: 1 h en
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
# El prompt de cada item es la plantilla seguida de `Item: <linea>`. Mientras
# corre, el item escribe en el runtime de la ejecución
# (`$THYROX_RUNTIME_DIR/pool/<run-id>/`, ignorado por git), no en `<out>`: su
# `<n>.stream.jsonl` (una linea por evento de `--output-format stream-json`,
# con el uso de cada peticion), `<n>.json` (su linea `result`) y `<n>.err`.
# Al cerrarse, `pool_lifecycle publish` los mueve a `<out>` y deja
# `<n>.closed` —su manifiesto con generación y sha256— como última escritura;
# un consumidor lee sólo ítems con `<n>.closed`. Al final `<out>/index.tsv`
# (número e item), `<out>/joblog.tsv` (el de GNU Parallel) y `run.closed`. Publica `-- FALLIDO <item>` por cada fallo y una linea final
# `items=N ok=K fallidos=F`. Sale 0 si todos terminaron bien, 1 si alguno no.
#
# Cada `thyrox -p` corre con `--no-session-persistence`, `--setting-sources
# project` y sus herramientas acotadas (`--tools`, por defecto `Read`): es una
# lectura, no un agente con permisos de escritura.
#
# Rehusa con exit 2, y SIN la linea de resumen, si falta GNU Parallel, falta
# el ejecutor, falta la plantilla, no hay items o el modelo es un alias: un
# resumen ahi no distinguiria «no hubo fallos» de «no pude despachar».
#
# El modelo va por IDENTIFICADOR COMPLETO: un alias resuelve distinto segun el
# proveedor, y con el no se sabe que tier ni que ventana se pago.
#
# *Ciega a:* la CALIDAD de lo que cada item devuelve. El veredicto es de
# despacho —termino, fallo, se corto—; que el resultado sirva lo juzga quien lo
# agrega.

# >>> frozen-launcher
# El pool corre desde una copia de su capa de shell tomada al lanzar
# (`launcher_freeze.sh`): bash lee este archivo por partes mientras corre, y
# editarlo en el checkout cambiaría lo que un pool vivo hace después. Este
# bloque es lo único que se lee del checkout; el resto lo lee la copia. La
# marca `_HP_FROZEN_LAUNCHER` nombra la copia en curso y se retira en cuanto
# la copia arranca, así que un pool anidado —el que lance un ítem— congela la
# suya.
_hp_source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ "${_HP_FROZEN_LAUNCHER:-}" != "$_hp_source_root" ]]; then
    export THYROX_ROOT="${THYROX_ROOT:-$_hp_source_root}"
    source "$_hp_source_root/src/lib/launcher_freeze.sh" || exit 2
    _hp_frozen="$(thyrox_launcher_freeze "$_hp_source_root" headless-pool)" || {
        echo "headless-pool: REHUSA — no se pudo copiar el lanzador bajo $(thyrox_runtime_dir "$_hp_source_root")" >&2
        exit 2
    }
    _HP_FROZEN_LAUNCHER="$_hp_frozen" bash "$_hp_frozen/src/session/headless-pool.sh" "$@"
    _hp_exit=$?
    rm -rf "${_hp_frozen:?}"
    exit "$_hp_exit"
fi
unset _HP_FROZEN_LAUNCHER
# <<< frozen-launcher
set -uo pipefail

PARALLEL_BIN="${HEADLESS_POOL_PARALLEL:-parallel}"
# El ejecutor de cada ítem se declara con `--runner`:
# - `thyrox` (por defecto): `thyrox -p` (`bin/cli`), que resuelve su propia
#   credencial con la cadena de `@thyrox/provider: credentials.ts`.
#   `HEADLESS_POOL_RUNNER` sólo declara un doble que habla su contrato.
# - `claude`: el `claude` del PATH, para un entorno donde el cliente ya
#   autentica solo y thyrox no tiene credencial propia. thyrox no lee ni
#   reenvía ninguna credencial: la resuelve el cliente. Cada ítem lleva su
#   `--session-id`, porque un `claude -p` hijo hereda la sesión de quien lo
#   lanza (.claude/workbench/claude-p-from-shell-20260928T234121).
RUNNER_KIND=thyrox
PROMPT=""; OUT=""; MODEL=""
WIDTH="$(nproc 2>/dev/null || echo 4)"
TIMEOUT=600; TOOLS="Read"; TOOLS_SET=""; ISOLATION=""; VERIFY=""; MAX_TURNS=""; WORKDIR="$PWD"; MEMFREE_SPEC=""; CACHE_TTL=""; CREDENTIAL_PROXY=""

rehusa() { echo "headless-pool: REHUSA — $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prompt) PROMPT="${2:-}"; shift 2 ;;
        --out) OUT="${2:-}"; shift 2 ;;
        --model) MODEL="${2:-}"; shift 2 ;;
        --width) WIDTH="${2:-}"; shift 2 ;;
        --timeout) TIMEOUT="${2:-}"; shift 2 ;;
        --tools) TOOLS="${2:-}"; TOOLS_SET=1; shift 2 ;;
        --isolation) ISOLATION="${2:-}"; shift 2 ;;
        --verify) VERIFY="${2:-}"; shift 2 ;;
        --max-turns) MAX_TURNS="${2:-}"; shift 2 ;;
        --cwd) WORKDIR="${2:-}"; shift 2 ;;
        --memfree) MEMFREE_SPEC="${2:-}"; shift 2 ;;
        --cache-ttl) CACHE_TTL="${2:-}"; shift 2 ;;
        --credential-proxy) CREDENTIAL_PROXY=1; shift ;;
        --runner) RUNNER_KIND="${2:-}"; shift 2 ;;
        -h|--help) sed -n '2,62p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) rehusa "opcion desconocida: $1" ;;
    esac
done

command -v "$PARALLEL_BIN" >/dev/null 2>&1 \
    || rehusa "falta GNU parallel ($PARALLEL_BIN). Se instala con THYROX_INSTALL_PARALLEL=1 via src/lib/toolchain.sh."
[[ -z "${HEADLESS_POOL_CLAUDE+x}" ]] || rehusa "HEADLESS_POOL_CLAUDE se retiró: el ejecutor se declara con --runner claude."
case "$RUNNER_KIND" in
    thyrox) RUNNER_BIN="${HEADLESS_POOL_RUNNER:-$THYROX_ROOT/bin/cli}" ;;
    claude) RUNNER_BIN=claude ;;
    *) rehusa "--runner va thyrox o claude, no: $RUNNER_KIND" ;;
esac
command -v "$RUNNER_BIN" >/dev/null 2>&1 || rehusa "falta el ejecutor de los ítems ($RUNNER_BIN)."
[[ -n "$PROMPT" && -f "$PROMPT" ]] || rehusa "la plantilla de prompt no existe: ${PROMPT:-(sin --prompt)}"
[[ -n "$OUT" ]] || rehusa "falta --out"
case "$MODEL" in
    claude-*) ;;
    *) rehusa "--model va por identificador completo (claude-…), no alias: ${MODEL:-(vacio)}" ;;
esac
[[ -d "$WORKDIR" ]] || rehusa "--cwd no existe: $WORKDIR"
# Con --isolation worktree cada ítem implementa en su propio worktree, y el
# árbol principal no cambia hasta que `pool_integrate` aplique lo verificado.
# Por defecto recibe sólo Bash: lee, busca y escribe con cat, rg, gawk y
# bin/replace_literal (operaciones-de-archivo-con-bash.md). Si se le ofrecen
# Edit y Write, el ítem los usa en su lugar.
case "$ISOLATION" in
    "") [[ -z "$VERIFY" ]] || rehusa "--verify sólo aplica con --isolation worktree" ;;
    worktree)
        git -C "$WORKDIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
            || rehusa "--isolation worktree exige que --cwd sea un árbol de git: $WORKDIR"
        [[ -n "$TOOLS_SET" ]] || TOOLS="Bash" ;;
    *) rehusa "--isolation va vacío o \"worktree\", no: $ISOLATION" ;;
esac
# El TTL de la caché de cada `thyrox -p` (THYROX_CODE_PROMPT_CACHE_TTL). Sin
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
# Activar 1h (regla 5 de `QCt`/`SPt`): sólo si nada de arriba decidió. Tiene
# dos mitades, como en el ejecutable: la variable general, y la de Bedrock
# cuando el proveedor ES Bedrock. El pool lo sabe por la misma variable con
# que el proveedor lo elige (`@thyrox/provider: providers.ts`, getAPIProvider).
env_truthy() {
    case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|on) return 0 ;;
        *) return 1 ;;
    esac
}
if [[ -z "$CACHE_TTL" ]]; then
    if env_truthy "${THYROX_ENABLE_PROMPT_CACHING_1H:-}" \
       || { env_truthy "${CLAUDE_CODE_USE_BEDROCK:-}" \
            && env_truthy "${THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK:-}"; }; then
        CACHE_TTL=1h; CACHE_TTL_WHY=enable_1h_env
    fi
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
# fuente: el envoltorio resuelve el intérprete y PYTHONPATH. `bin/` se resuelve
# contra THYROX_ROOT y no contra este archivo, que corre desde su copia.
HP_BIN="$THYROX_ROOT/bin"
pool_history() { bash "$HP_BIN/pool_history" "$@"; }
HISTORY="$(pool_history dir "$PROMPT")" || rehusa "no se pudo resolver el historial de la plantilla (HEADLESS_POOL_HISTORY_DIR)"

# La VRAM de cada item, si hay GPU (`gpu_monitor.py`). `--memfree` es memoria
# del SISTEMA; la de la GPU es otro recurso. Con `thyrox -p` el modelo corre en
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
             # otro ejecutor (un doble, o filas anteriores a #48) no fija la
             # de `thyrox -p`, y al revés.
             --runner "$RUNNER_BIN"
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

# El proxy de credencial: lo lanza el pool con SU entorno, y los items sólo
# reciben la ruta del socket. Se espera su anuncio (`socket=<ruta>`) antes de
# lanzar ningún item; si sale antes de anunciarlo, no hay proxy y no se lanza
# nada.
HP_PROXY_SOCKET=""
if [[ -n "$CREDENTIAL_PROXY" ]]; then
    proxy_bin="${HEADLESS_POOL_CREDENTIAL_PROXY:-$THYROX_ROOT/bin/provider-credential-proxy}"
    proxy_socket="$OUT/.credential-proxy.sock"
    proxy_log="$OUT/.credential-proxy.log"
    "$proxy_bin" --socket "$proxy_socket" > "$proxy_log" 2>&1 &
    proxy_pid=$!
    trap 'kill "$proxy_pid" 2>/dev/null; wait "$proxy_pid" 2>/dev/null' EXIT
    for _ in $(seq 1 100); do
        grep -q '^socket=' "$proxy_log" 2>/dev/null && break
        kill -0 "$proxy_pid" 2>/dev/null || break
        sleep 0.1
    done
    grep -q '^socket=' "$proxy_log" 2>/dev/null \
        || rehusa "el proxy de credencial no arrancó ($proxy_bin): $(tr '\n' ' ' < "$proxy_log")"
    HP_PROXY_SOCKET="$proxy_socket"
fi
export HP_PROXY_SOCKET
# La ejecución vive en su runtime hasta cerrarse: el índice, el joblog y los
# artefactos de cada ítem se escriben ahí, y a la salida sólo llega lo publicado
# (`pool_lifecycle`). Un pool que muere deja su runtime para `reconcile`.
export HP_LIFECYCLE="$HP_BIN/pool_lifecycle"
HP_LIVE="$(bash "$HP_LIFECYCLE" open-run "$OUT" --owner $$)" \
    || rehusa "no se pudo abrir el runtime de la ejecución para $OUT"
export HP_LIVE
: > "$HP_LIVE/index.tsv"
for i in "${!ITEMS[@]}"; do
    printf '%d\t%s\n' "$((i + 1))" "${ITEMS[$i]}" >> "$HP_LIVE/index.tsv"
done

# Un item por trabajo. El cuerpo va en una funcion exportada para que GNU
# Parallel no tenga que citar el prompt: recibe numero e item como argumentos.
#
# El ítem vive en el runtime (`HP_LIVE`, ignorado por git) y llega a la salida
# sólo al cerrarse: `pool_lifecycle begin` le da su generación, y `publish`
# mueve sus artefactos, los verifica contra su sha256 y deja `<n>.closed` como
# última escritura. Se publica también el ítem que falló —su `.err` es el
# motivo—; si la publicación misma falla, el runtime se conserva para
# `pool_lifecycle reconcile` y el ítem sale con 7. Cada transición y la
# publicación presentan la generación del ítem: si la recuperación lo tomó
# mientras corría, la suya ya no es la vigente y `pool_lifecycle` rehúsa.
_headless_item() {
    local n="$1" rc=0 publish_rc=0
    local -r publish_failed_exit=7
    # El shell del trabajo vive lo que el ítem; dentro de `$(...)` BASHPID
    # sería el de la sustitución, que sale al instante.
    local -r item_owner="$BASHPID"
    HP_ITEM_GENERATION="$(bash "$HP_LIFECYCLE" begin "$HP_LIVE" "$HP_OUT" "$n" --owner "$item_owner" \
        2>> "$HP_LIVE/$n.lifecycle.err")" || return "$publish_failed_exit"
    export HP_ITEM_GENERATION
    rm -f "${HP_LIVE:?}/${n:?}.lifecycle.err"
    _headless_item_run "$@" || rc=$?
    bash "$HP_LIFECYCLE" publish "$HP_LIVE" "$HP_OUT" "$n" --exit "$rc" --generation "$HP_ITEM_GENERATION" \
        2>> "$HP_LIVE/$n.lifecycle.err" || publish_rc=$?
    [[ "$publish_rc" -eq 0 ]] || return "$publish_failed_exit"
    # La ref de la foto del worktree se conserva también cuando el ítem se
    # publica con éxito: la foto es la garantía de no perder código, no un
    # sustituto de la salida final.
    return "$rc"
}
export -f _headless_item

_headless_item_run() {
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
    # porta: matar un `thyrox -p` a mitad de su petición tira los tokens ya
    # pagados.
    local owner="$BASHPID" admit_rc=0
    if [[ -n "$HP_VRAM_NEED" ]]; then
        bash "$HP_GPU" admit "$HP_VRAM_NEED" --ledger "$HP_VRAM_LEDGER" --owner "$owner" \
            --nvidia-smi "$HP_NVIDIA_SMI" --timeout "$HP_TIMEOUT" --interval "$HP_GPU_INTERVAL" \
            2> "$HP_LIVE/$n.admit.err" || admit_rc=$?
    fi
    # 3 es el plazo vencido, una medida; cualquier otro código es que la
    # admisión no pudo decidir, y decir «no hubo sitio» afirmaría lo que no
    # se midió.
    if [[ "$admit_rc" -ne 0 ]]; then
        if [[ "$admit_rc" -eq 3 ]]; then
            echo "admision por VRAM vencida: el item pide $HP_VRAM_NEED MiB y no hubo sitio en ${HP_TIMEOUT}s"
        else
            echo "la admision por VRAM fallo (exit $admit_rc); el item no se lanzo:"
            cat "$HP_LIVE/$n.admit.err"
        fi > "$HP_LIVE/$n.err"
        : > "$HP_LIVE/$n.json"
        return 3
    fi
    rm -f "$HP_LIVE/$n.admit.err"
    local workdir="$HP_WORKDIR"
    if [[ "$HP_ISOLATION" == worktree ]]; then
        workdir="$(bash "$HP_ITEM_WORKTREE" prepare "$HP_WORKDIR" "$HP_OUT" "$n" "$HP_LIVE" 2> "$HP_LIVE/$n.prepare.err")" || {
            { echo "no se pudo preparar el worktree del item:"; cat "$HP_LIVE/$n.prepare.err"; } > "$HP_LIVE/$n.err"
            : > "$HP_LIVE/$n.json"; return 4; }
    fi
    { cat "$HP_PROMPT"; printf '\nItem: %s\n' "$item"; } \
      | (cd "$workdir" || exit 1
         # Un item aislado hereda THYROX_ROOT del arbol principal (lo exporta
         # bin/cli y el runner lo necesita para su node_modules), y con el
         # los trabajos que lance, su ledger y su archivo caerian en el arbol
         # principal. Van a la salida del item: ni al arbol ni al parche.
         if [[ "$HP_ISOLATION" == worktree ]]; then
             export THYROX_JOBS_DIR="$HP_LIVE/$n.jobs" \
                    THYROX_SESSION_LEDGER_DIR="$HP_LIVE/$n.ledger" \
                    THYROX_JOBS_ARCHIVE_DIR="$HP_LIVE/$n.jobs"
             # El envoltorio de `git` que rehúsa `git stash` (refs/stash es
             # compartido entre worktrees, TASK-THYROX-0604): va antes en el
             # PATH del ítem, y el archivo donde registra cada intento
             # rehusado es el que `item_worktree.sh finalize` lee para dar el
             # veredicto `con-stash`.
             export THYROX_POOL_STASH_ATTEMPTS_FILE="$HP_LIVE/$n.stash-attempts"
             export PATH="$HP_ITEM_GIT_GUARD_DIR:$PATH"
         fi
         # Cada cliente lee el TTL con su propio nombre: `thyrox -p`
         # THYROX_CODE_PROMPT_CACHE_TTL, `claude -p` CLAUDE_CODE_PROMPT_CACHE_TTL.
         # `claude -p` recibe además su propia sesión: sin ella hereda la del
         # proceso que lanzó el pool.
         session_args=()
         if [[ "$HP_RUNNER_KIND" == claude ]]; then
             # el runner claude lee su propia variable; thyrox-rename: keep
             [[ -z "$HP_CACHE_TTL" ]] || export CLAUDE_CODE_PROMPT_CACHE_TTL="$HP_CACHE_TTL"
             session_args=(--session-id "$(cat /proc/sys/kernel/random/uuid)")
         else
             [[ -z "$HP_CACHE_TTL" ]] || export THYROX_CODE_PROMPT_CACHE_TTL="$HP_CACHE_TTL"
         fi
         # Con proxy, el item recibe el socket y el marcador; la credencial
         # real se retira de su entorno por todas sus vías.
         if [[ -n "$HP_PROXY_SOCKET" ]]; then
             unset ANTHROPIC_AUTH_TOKEN THYROX_CODE_OAUTH_TOKEN THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR \
                   CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR
             export ANTHROPIC_UNIX_SOCKET="$HP_PROXY_SOCKET" ANTHROPIC_API_KEY=ssh-placeholder
         fi
         # Con GNU Time, la memoria pico, la pared y la CPU del item quedan en
         # <n>.time; el codigo de salida es el del item, que time conserva.
         # `-q`: sin el, GNU Time antepone «Command exited with non-zero status
         # N» a la medida del item que falla, y un consumidor que lee la
         # primera palabra (`ai-course-notes: translation_loop.py`) revienta.
         # `setsid` hace del ítem el líder de una sesión propia: su pid es el id
         # de la sesión, y todo lo que lance —también lo que `timeout` pone en
         # otro grupo de procesos— queda dentro, donde el drenaje lo encuentra.
         exec setsid ${HP_TIME:+"$HP_TIME" -q -f "%M %e %U %S" -o "$HP_LIVE/$n.time"} \
         timeout "$HP_TIMEOUT" "$HP_RUNNER" -p \
            --model "$HP_MODEL" --setting-sources project \
            --tools "$HP_TOOLS" --allowedTools "$HP_TOOLS" \
            ${HP_MAX_TURNS:+--max-turns "$HP_MAX_TURNS"} --no-session-persistence "${session_args[@]}" \
            --output-format stream-json --verbose) \
      > "$HP_LIVE/$n.stream.jsonl" 2> "$HP_LIVE/$n.err" &
    local pid=$! monitor=""
    # La VRAM del item: GNU Time mide su RAM y no ve la GPU. El monitor
    # muestrea el ARBOL de `pid` (el item y el ejecutor) mientras vive y deja
    # <n>.gpu; sin nvidia-smi no se lanza y el pool ya lo declaro.
    if [[ -n "$HP_NVIDIA_SMI" ]]; then
        bash "$HP_GPU" watch "$pid" "$HP_LIVE/$n.gpu" \
            --nvidia-smi "$HP_NVIDIA_SMI" --interval "$HP_GPU_INTERVAL" &
        monitor=$!
    fi
    local snapshot_loop=""
    if [[ "$HP_ISOLATION" == worktree && "$HP_SNAPSHOT_INTERVAL" -gt 0 ]]; then
        _headless_item_periodic_snapshots "$n" "$workdir" "$pid" "$HP_SNAPSHOT_INTERVAL" &
        snapshot_loop=$!
    fi
    wait "$pid"
    local rc=$?
    # El bucle sale solo en cuanto el ítem terminó; se espera antes de la foto
    # final para que ninguna foto periódica la adelante ni la reemplace.
    [[ -z "$snapshot_loop" ]] || wait "$snapshot_loop"
    # >>> item-drain
    # El ítem no termina porque salió su proceso principal: termina cuando su
    # sesión quedó vacía y nadie escribe ya en sus salidas. Un hijo que siga
    # escribiendo tiene hasta HP_DRAIN_SECONDS para salir solo; si hubo que
    # terminarlo, o si alguien sigue escribiendo, el ítem se marca fallido con
    # el motivo, porque lo que dejó en disco no es confiable.
    local -r unsettled_exit=6
    local drain_rc=0 writers_report writers_rc=0
    bash "$HP_PROCESS_OWNERSHIP" drain "$pid" --grace "$HP_DRAIN_SECONDS" >> "$HP_LIVE/$n.err" 2>&1 || drain_rc=$?
    if [[ "$drain_rc" -ne 0 ]]; then
        echo "el ítem dejó procesos vivos después de salir su principal (drenaje exit $drain_rc); sus salidas no son confiables" >> "$HP_LIVE/$n.err"
        rc="$unsettled_exit"
    fi
    # La salida del inspector se captura antes de anexarla: redirigida al
    # `.err`, el propio inspector sería un escritor de las rutas que mide.
    local -a item_paths=("$HP_LIVE/$n".*)
    writers_report="$(bash "$HP_WRITER_INSPECTOR" "${item_paths[@]}" 2>&1)" || writers_rc=$?
    if [[ "$writers_rc" -ne 0 ]]; then
        printf 'las salidas del ítem siguen abiertas en escritura (inspector exit %s):\n%s\n' \
            "$writers_rc" "$writers_report" >> "$HP_LIVE/$n.err"
        rc="$unsettled_exit"
    fi
    # <<< item-drain
    [[ -z "$monitor" ]] || wait "$monitor"
    [[ -z "$HP_VRAM_NEED" ]] || bash "$HP_GPU" release --ledger "$HP_VRAM_LEDGER" --owner "$owner"
    if [[ "$HP_ISOLATION" == worktree ]]; then
        # Antes de que `finalize` retire el worktree, su estado queda guardado
        # en objetos de git bajo refs/thyrox/snapshots/<run>/<n>/<gen>: si algo
        # falla después, `recovery_controller recover` lo abre aparte. Una foto
        # que no se pudo tomar se declara en el `.err`; no cambia el veredicto.
        # Si la transición a SNAPSHOTTING se rehúsa, otra generación ya es dueña
        # del ítem: su registro de foto no se reemplaza (I4).
        _headless_item_snapshot "$n" "$workdir" \
            || echo "la generación $HP_ITEM_GENERATION ya no es dueña del ítem; no se toma su foto" >> "$HP_LIVE/$n.err"
        bash "$HP_ITEM_WORKTREE" finalize "$HP_WORKDIR" "$workdir" "$HP_LIVE" "$n" "$rc" "$HP_VERIFY"
    fi
    # El .json de siempre es la linea `result` del stream: sus consumidores
    # no cambian. El stream se queda porque es lo unico que trae el uso de
    # cada peticion; `usage.iterations` del result trae solo la ultima.
    # Se elige por el campo `type` ya parseado, no por el orden de las claves,
    # que el ejecutable no garantiza; una linea truncada por timeout se salta.
    jq -cR 'fromjson? | select(.type == "result")' "$HP_LIVE/$n.stream.jsonl" \
        | tail -1 > "$HP_LIVE/$n.json"
    return "$rc"
}
export -f _headless_item_run

# La foto del worktree del ítem bajo su generación, en objetos de git bajo
# refs/thyrox/snapshots/<run>/<n>/<gen>. Si la ref ya existe, la foto la
# avanza sólo si nadie la movió desde que se leyó; si no, la crea. Sale 1 si la
# transición a SNAPSHOTTING se rehúsa: otra generación ya es dueña del ítem y
# su registro de foto no se toca (I4). Una foto que no se pudo tomar se
# declara en el `.err` y no cambia el veredicto.
_headless_item_snapshot() {
    local n="$1" workdir="$2" ref previous
    bash "$HP_LIFECYCLE" transition "$HP_LIVE" "$n" SNAPSHOTTING --generation "$HP_ITEM_GENERATION" \
        2>> "$HP_LIVE/$n.err" || return 1
    ref="refs/thyrox/snapshots/${HP_LIVE##*/}/$n/$HP_ITEM_GENERATION"
    previous="$(git -C "$workdir" rev-parse --verify --quiet "$ref")"
    bash "$HP_SNAPSHOT" take "$workdir" "${HP_LIVE##*/}" "$n" "$HP_ITEM_GENERATION" \
        ${previous:+--advance-from "$previous"} \
        > "$HP_LIVE/$n.snapshot.json.tmp" 2>> "$HP_LIVE/$n.err" \
        && mv "$HP_LIVE/$n.snapshot.json.tmp" "$HP_LIVE/$n.snapshot.json" \
        || echo "no se pudo guardar la foto del worktree del ítem" >> "$HP_LIVE/$n.err"
    rm -f "$HP_LIVE/$n.snapshot.json.tmp"
    bash "$HP_LIFECYCLE" transition "$HP_LIVE" "$n" RUNNING --generation "$HP_ITEM_GENERATION" 2>> "$HP_LIVE/$n.err"
    return 0
}
export -f _headless_item_snapshot

# Mientras `pid` vive, una foto cada `interval` segundos. Comprueba el proceso
# cada segundo para salir en cuanto el ítem termina, sin esperar el intervalo
# entero. Si la generación ya no es dueña del ítem, deja de fotografiar.
_headless_item_periodic_snapshots() {
    local n="$1" workdir="$2" pid="$3" interval="$4" elapsed=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
        elapsed=$((elapsed + 1))
        (( elapsed < interval )) && continue
        kill -0 "$pid" 2>/dev/null || break
        _headless_item_snapshot "$n" "$workdir" || return 0
        elapsed=0
    done
}
export -f _headless_item_periodic_snapshots
HP_PROMPT="$(cd "$(dirname "$PROMPT")" && pwd)/$(basename "$PROMPT")"
HP_OUT="$(cd "$OUT" && pwd)"
HP_RUNNER="$(command -v "$RUNNER_BIN")"
export HP_PROMPT HP_OUT HP_RUNNER
export HP_WORKDIR="$WORKDIR" HP_TIMEOUT="$TIMEOUT" HP_MODEL="$MODEL"
export HP_TOOLS="$TOOLS" HP_MAX_TURNS="$MAX_TURNS" HP_CACHE_TTL="$CACHE_TTL"
export HP_ISOLATION="$ISOLATION" HP_VERIFY="$VERIFY" HP_RUNNER_KIND="$RUNNER_KIND"
export HP_ITEM_WORKTREE="${HEADLESS_POOL_ITEM_WORKTREE:-$HP_HERE/item_worktree.sh}"
# Cuánto se espera a que un hijo del ítem salga solo después de que salió el
# principal, antes de terminarlo (`process_ownership drain`).
HP_DRAIN_SECONDS="${HEADLESS_POOL_ITEM_DRAIN_SECONDS:-30}"
# Cada cuántos segundos se fotografía el worktree de un ítem que sigue
# corriendo; 0 deja sólo la foto final.
HP_SNAPSHOT_INTERVAL="${THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS:-0}"
[[ "$HP_SNAPSHOT_INTERVAL" =~ ^[0-9]+$ ]] \
    || rehusa "THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS va en segundos enteros, no: $HP_SNAPSHOT_INTERVAL"
export HP_SNAPSHOT_INTERVAL
[[ "$HP_DRAIN_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]] \
    || rehusa "HEADLESS_POOL_ITEM_DRAIN_SECONDS va en segundos, no: $HP_DRAIN_SECONDS"
export HP_DRAIN_SECONDS
export HP_PROCESS_OWNERSHIP="$HP_BIN/process_ownership" HP_WRITER_INSPECTOR="$HP_BIN/writer_inspector"
export HP_SNAPSHOT="$HP_BIN/snapshot_store"
export HP_ITEM_GIT_GUARD_DIR="${HEADLESS_POOL_ITEM_GIT_GUARD_DIR:-$HP_HERE/item_git_guard}"
# El pool retiene el candado de su ejecución hasta salir: lo heredan los ítems,
# y mientras alguno viva, el barrido de huérfanos de una sesión nueva no toca
# estos worktrees.
if [[ "$ISOLATION" == worktree ]]; then
    HP_RUN_LOCK="$(bash "$HP_ITEM_WORKTREE" lock-path "$WORKDIR" "$HP_OUT")" && [[ -n "$HP_RUN_LOCK" ]] \
        || rehusa "no se pudo resolver el candado de la ejecución"
    mkdir -p "${HP_RUN_LOCK%/*}" || rehusa "no se pudo crear ${HP_RUN_LOCK%/*}"
    exec 8> "$HP_RUN_LOCK"
    flock -n 8 || rehusa "otra ejecución con la misma salida retiene $HP_RUN_LOCK"
fi
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

"$PARALLEL_BIN" -j "$WIDTH" "${MEMFREE_ARGS[@]}" --colsep '\t' --joblog "$HP_LIVE/joblog.tsv" \
    _headless_item '{1}' '{2}' :::: "$HP_LIVE/index.tsv" >/dev/null 2>&1

# El veredicto sale del joblog (columna Exitval), emparejado con el indice por
# numero: no depende del orden en que terminaron. El total sale del índice: un
# `parallel` que muere sin correr un ítem no le deja fila, y ese ítem no tiene
# veredicto — contarlo desde el joblog publicaba un cero que salía 0.
gawk -F'\t' '
    NR == FNR { item[$1] = $2; total++; next }
    FNR == 1 { next }
    { split($9, a, " "); n = a[2]; seen[n] = 1
      if ($7 == 0) ok++; else { printf "-- FALLIDO %s\n", item[n]; mal++ } }
    END {
        for (n in item) if (!(n in seen)) { printf "-- SIN VEREDICTO %s\n", item[n]; missing++ }
        printf "items=%d ok=%d fallidos=%d", total, ok, mal
        if (missing) printf " sin-veredicto=%d", missing
        print ""
        exit (mal > 0 || missing > 0)
    }
' "$HP_LIVE/index.tsv" "$HP_LIVE/joblog.tsv"
STATUS=$?
if [[ "$ISOLATION" == worktree ]]; then
    bash "$HP_LIFECYCLE" closed-items "$OUT" | while read -r n; do cat "$OUT/$n.verdict" 2>/dev/null; done | gawk '{c[$1]++} END {
        printf "verificados=%d rechazados=%d sin-cambios=%d fallidos=%d", c["verificado"], c["rechazado"], c["sin-cambios"], c["fallido"]
        if (c["sin-verificar"]) printf " sin-verificar=%d", c["sin-verificar"]
        if (c["con-stash"]) printf " con-stash=%d", c["con-stash"]
        print "" }'
    bash "$HP_ITEM_WORKTREE" sweep "$WORKDIR" "$HP_OUT"
fi
# El cierre de la ejecución publica el índice y el joblog y deja `run.closed` al
# final. Si algún ítem no llegó a cerrarse, su runtime se conserva y el pool
# sale con fallo aunque el joblog diga lo contrario.
if ! bash "$HP_LIFECYCLE" close-run "$HP_LIVE" "$OUT"; then
    echo "runtime conservado para pool_lifecycle reconcile: $HP_LIVE"
    STATUS=1
fi
# La medida de esta ejecución alimenta a la siguiente. Sin GNU Time no hay
# `.time` y `record` no escribe fila: una medida ausente no es un cero.
[[ -z "$HP_TIME" ]] || pool_history record "$HISTORY" "$OUT" --runner "$RUNNER_BIN" --item-model "$MODEL" --template "$PROMPT" >/dev/null
[[ -n "$HP_TIME" ]] || echo "memoria: sin GNU time, no se midio la de los items (instalalo con thyrox_toolchain_require_gnu_time)"
exit $STATUS
