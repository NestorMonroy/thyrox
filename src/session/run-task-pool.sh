#!/bin/bash
# =============================================================================
# run-task-pool.sh — N trabajos en segundo plano con anchura acotada, SIN agentes
# =============================================================================
#
# Por qué existe
# --------------
# `bg.sh` lanza **uno**; `wait-jobs.sh` es la **barrera** de N. Entre los
# dos faltaba la pieza que el ejecutor pidió: lanzar N comandos a la vez sin
# despachar un agente por cada uno, con la anchura acotada a lo que la máquina
# de verdad aprovecha.
#
# Y despachar un agente para esto es caro por una razón medida, no estética: el
# gasto de un subagente lo domina el `cache_read` —98.07 % del consumo sobre
# 313 agentes con telemetría (`model-selection-subagents.md`)— y paga **en
# frío** el piso siempre-cargado, 126 029 tokens, **por turno**. Un trabajo en
# segundo plano lanzado desde aquí cuesta **cero** tokens: es un proceso, no una
# conversación. El agente rinde cuando el trabajo es *ancho y con juicio*; una
# tanda de comandos deterministas no lo es.
#
# La anchura: dos caps distintos, y sólo uno acota de verdad
# -----------------------------------------------------------
# Medido en `api: scripts/workbench/background-task-capacity-20260902T171637/`
# sobre el ejecutable 2.1.258 y esta máquina (4 núcleos, 16 GB):
#
#   eje 1 — anchura de HERRAMIENTA: `KEo(){return
#           a.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY??10}` → 10. Acota cuántas
#           llamadas emite el cliente en un turno, NO cuántos procesos viven.
#   eje 2 — procesos desprendidos: 24 lanzados, **24 concurrentes**, 0 sin
#           terminar; `background_caps_declared_by_the_client: []`. El cliente
#           **no** pone techo a las tareas en segundo plano.
#   eje 3 — anchura ÚTIL, que es la que importa: repartiendo 24 unidades con
#           CPU sobre N trabajadores —1: 21.77 s · 2: 10.92 s (1.99x) ·
#           **4: 5.61 s (3.88x)** · 8: 5.41 s (4.03x) · 16: 5.09 s (4.28x)—.
#           Saturación en **nproc**: de 4 a 16 trabajadores se gana 0.4x.
#
# De ahí el default `--width $(nproc)`: caben 24, sirven 4. Lanzar 16 no acelera
# y sí multiplica la contención de memoria y de disco.
#
# Ciega a: carga dominada por E/S (red, disco), donde la anchura útil es mayor
# que nproc y este default queda corto — subirla con `--width` y declararlo; y a
# la memoria, porque el eje 2 se midió con durmientes: 24 `pytest` con su base
# cada uno es otro perfil, no medido. Para ese eje existe `--memfree`, que
# acota por memoria disponible y no por numero de trabajos (ver su seccion).
#
# Uso
# ---
#   run-task-pool.sh [--width N] [--timeout S] [--dir LOGDIR] [--prefix P]
#                    [--memfree SIZE] <archivo>
#   ... | run-task-pool.sh [opciones] -            # los comandos por stdin
#
# Una línea = un comando. Se saltan las vacías y las que empiezan por `#`.
# Cada trabajo se registra en el ledger de `wait-jobs.sh`, así que el
# Stop hook bloquea el turno si alguien omite la barrera.
#
# Sale: 0 todos asentaron · 2 alguno murió sin marcador · 3 timeout · 4 uso.
# =============================================================================

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT_JOBS="$HERE/wait-jobs.sh"

WIDTH="$(nproc 2>/dev/null || echo 4)"
TIMEOUT=1800
# El hogar de los logs. `BG_DIR` es la grafia HEREDADA; la vigente es la familia
# `THYROX_BACKGROUND_LOG_<CLONE>` (global: `THYROX_BACKGROUND_LOG_DIR`), y la
# resuelve `background.py --log-home` para que este guion no vuelva a componer
# una ruta por su cuenta.
#
# El default anterior era `${TMPDIR:-/tmp}/kaupamex-pool`, y era el defecto que
# `background.log_dir` existe para no cometer: `/tmp` es efimero y esta fuera
# del arbol que el consumidor eligio, asi que los logs de una tanda se perdian
# con el contenedor sin que nada avisara. Ahora se REHUSA (exit 4).
DIR="${BG_DIR:-}"
PREFIX="job"
INPUT=""
MEMFREE_SPEC=""

while [ $# -gt 0 ]; do
    case "$1" in
        --width)   WIDTH="$2"; shift 2 ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        --dir)     DIR="$2"; shift 2 ;;
        --prefix)  PREFIX="$2"; shift 2 ;;
        --memfree) MEMFREE_SPEC="$2"; shift 2 ;;
        -h|--help) sed -n '2,60p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *)         INPUT="$1"; shift ;;
    esac
done

[ -n "$INPUT" ] || { echo "run-task-pool: falta el archivo de comandos (o '-' para stdin)" >&2; exit 4; }
[ -x "$WAIT_JOBS" ] || { echo "run-task-pool: no encuentro wait-jobs.sh en $HERE" >&2; exit 4; }

# ---------------------------------------------------------------------------
# La cota por MEMORIA — `--memfree` de GNU Parallel 20231122
# ---------------------------------------------------------------------------
# La anchura acota CUANTOS trabajos corren; no acota cuanta memoria consumen.
# Un `tsc` completo de este arbol ocupa 2.0 GB a los 18 s de arrancar, asi que
# una anchura alta agota la memoria antes que los nucleos. La referencia
# resuelve eso con dos mitades, y se portan las dos:
#
#   admision   (`/usr/bin/parallel:4113-4118`) — no se lanza un trabajo si la
#              memoria disponible es menor que la cota;
#   aplicacion (`:6972-7005`) — si baja de la MITAD de la cota, se mata al
#              trabajo mas joven y se reencola.
#
# La segunda no es redundante con la primera. La admision mide la memoria AL
# ADMITIR y es ciega a lo que el trabajo consuma despues: varios `tsc`
# admitidos con memoria de sobra crecen juntos y la agotan igual.
#
# DIVERGENCIAS DECLARADAS:
#   - la medida es `MemAvailable`, la estimacion del kernel de memoria
#     recuperable sin swap. La referencia suma `MemFree + Buffers + Cached +
#     SwapCached`, que cuenta `Shmem` como libre aunque no se pueda recuperar.
#     Sin `MemAvailable` (kernel < 3.14) se usa la suma de la referencia.
#   - con cero trabajos vivos se admite aunque falte memoria. Sin esa
#     excepcion, un trabajo mayor que la cota bloquearia el pool para siempre.
#   - no se mata al ULTIMO trabajo vivo: matarlo no libera memoria que otro
#     trabajo del despacho pueda usar, solo repite el mismo trabajo.
#   - los sufijos llegan hasta `T`/`Ti`; `P` a `Y` no se portan porque ninguna
#     maquina de este arbol tiene esa memoria.
#   - `--memsuspend` (SIGSTOP en vez de matar) no se porta en este pase.
MEMFREE=0

# `parse_binary_size` y `mem_available_bytes` viven en `src/lib/memory.sh`,
# compartidas con `bg.sh --memfree`.
source "$HERE/../lib/memory.sh"

if [ -n "$MEMFREE_SPEC" ]; then
    # El awk es el que declara `THYROX_TOOLCHAIN_AWK_BIN` —el mismo nombre que
    # `thyrox_toolchain_require_gawk` sondea por conducta—, no el `awk` del
    # PATH, que en Debian suele resolver a mawk. Se resuelve con
    # `thyrox_config_value`, que lee el proceso y despues el `.env`: un `grep`
    # propio del `.env` seria una segunda fuente de verdad. Se resuelve UNA vez:
    # cada consulta lanza un interprete, y la sonda corre en cada ciclo.
    source "$HERE/../lib/reach.sh"
    AWK_BIN="$(thyrox_config_value THYROX_TOOLCHAIN_AWK_BIN awk)"
    MEMFREE="$(parse_binary_size "$MEMFREE_SPEC")" || {
        echo "run-task-pool: --memfree ilegible: '$MEMFREE_SPEC' (ej. 1G, 512M, 800m)" >&2; exit 4; }
    # Una cota que no se puede medir no se ignora en silencio: se rehusa.
    mem_available_bytes >/dev/null || {
        echo "run-task-pool: --memfree pedido, pero no puedo leer la memoria disponible" \
             "(${THYROX_POOL_MEMINFO_PATH:-/proc/meminfo})" >&2; exit 4; }
fi

# ---------------------------------------------------------------------------
# La anchura: entero, porcentaje de nucleos, o un archivo que se RELEE
# ---------------------------------------------------------------------------
# Las tres formas salen de `--jobs` de GNU Parallel (20231122): `-j N`,
# `-j 50%` / `-j 200%` sobre el numero de nucleos, y `--jobs <archivo>`, que la
# referencia relee cada vez que un trabajo termina.
#
# DIVERGENCIA DECLARADA — `-j 0` («tantos como sea posible») no se porta como
# anchura de lanzamiento. La saturacion esta medida y vive en la cabecera de
# este guion: de 4 a 16 trabajadores se gana 0.4x. «Tantos como sea posible»
# compra ese 0.4x y multiplica la contencion de memoria y de disco.
#
# Lo que SI hace el cero, y es la mitad que da valor a la forma de archivo:
# escrito en el archivo A MITAD de un despacho, drena — se deja de admitir
# trabajos nuevos y los vivos terminan. Es la unica manera de frenar un
# despacho ya lanzado sin matarlo.
# LA ANCHURA EFECTIVA ES min(WIDTH, N), y se capa donde N ya se conoce. La
# derivacion es la de la referencia: `max_workers = min(cpu_cap,
# len(uncached_work))` (graphify/extract.py:6184-6185). Aqui el coste es DE
# REPORTE, no de spawn —el bucle de despacho no preasigna procesos, solo no
# bloquea— pero una cifra publicada que no es la efectiva miente sobre lo que
# la maquina va a hacer.
#
# DIVERGENCIA DECLARADA — el SEGUNDO caso de la referencia no se porta.
# `max_workers == 1` le hace devolver `return False` y entregar el trabajo a un
# extractor secuencial EN PROCESO (:6193-6201). Aqui no hay camino en serie en
# primer plano, y no por comodidad. Sus tres razones, medidas contra el caso
# nuestro:
#
#   razon que la fuente declara        | aqui
#   -----------------------------------|-----------------------------------------
#   spawn + un ida y vuelta de IPC por  | NO transfiere: lanzamos un `nohup setsid
#   archivo, que una sola ranura no     | bash` por comando a CUALQUIER anchura,
#   amortiza                            | asi que anchura 1 no anade ni un spawn
#   el worker huerfano que deja         | NO transfiere: es el defecto que el kill
#   `os._exit`                          | por grupo cierra en este mismo pase
#   el hook de Windows                  | no aplica
#
# Y la razon propia, que es la que decide: el cap hace que N=1 implique
# WIDTH=1, asi que un camino en serie dispararia en TODA invocacion de un solo
# trabajo y le quitaria `--timeout`, el ledger y el gate de `Stop` justo al caso
# para el que `bg.sh` existe. La fuente entrega el trabajo A SU LLAMADOR; el
# nuestro es el turno de shell, y portar un retorno-al-llamador sin llamador
# analogo seria inventar el llamador.
CORES="$(nproc 2>/dev/null || echo 4)"

# resolve_width <spec> -> imprime el entero, o nada + motivo en stderr.
# No resuelve un archivo: eso lo hace `width_now`, que decide que pasa con el 0.
resolve_width() {
    local spec="$1"
    case "$spec" in
        *%)
            local pct="${spec%\%}"
            case "$pct" in ''|*[!0-9]*) echo "run-task-pool: porcentaje no numerico: '$spec'" >&2; return 1 ;; esac
            # Piso 1: un porcentaje que redondea a cero seguiria siendo una
            # anchura valida en la referencia, y aqui colgaria el bucle.
            local n=$(( CORES * pct / 100 ))
            [ "$n" -lt 1 ] && n=1
            [ "$pct" -eq 0 ] && { echo "run-task-pool: 0% cae en la divergencia declarada de --width 0" >&2; return 1; }
            printf '%s' "$n" ;;
        ''|*[!0-9]*)
            echo "run-task-pool: --width no es entero, porcentaje ni archivo: '$spec'" >&2; return 1 ;;
        0)
            echo "run-task-pool: --width 0 no se porta — ver la divergencia declarada en la cabecera" >&2; return 1 ;;
        *)  printf '%s' "$spec" ;;
    esac
}

# El archivo aporta su primera linea util. Se lee entero y se filtra aqui en vez
# de con `head`: un archivo que el escritor esta truncando puede dar una linea
# vacia, y eso no es un valor invalido sino un valor que aun no esta.
width_from_file() {
    local line
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) continue ;; esac
        printf '%s' "$line"; return 0
    done < "$1"
    return 1
}

WIDTH_FILE=""
if [ -f "$WIDTH" ]; then
    WIDTH_FILE="$WIDTH"
    RAW_WIDTH="$(width_from_file "$WIDTH_FILE")" \
        || { echo "run-task-pool: el archivo de anchura '$WIDTH_FILE' no tiene valor" >&2; exit 4; }
else
    RAW_WIDTH="$WIDTH"
fi
WIDTH="$(resolve_width "$RAW_WIDTH")" || exit 4

# Un valor absoluto vuelve igual; uno relativo se compone bajo el hogar del
# clon; sin ninguno, el resolutor rehusa y su motivo llega por stderr.
DIR="$(python3 "$HERE/background.py" --log-home "$DIR")" || exit 4

mkdir -p "$DIR"

# ---------------------------------------------------------------------------
# UN DIRECTORIO POR DESPACHO — la etiqueta plana pisaba la evidencia
# ---------------------------------------------------------------------------
# El defecto, medido por conducta: la etiqueta era `<prefijo>-<ordinal>` y el
# log `$DIR/<etiqueta>.log`, los dos PLANOS en el hogar global. Dos despachos
# que compartieran `--prefix` reusaban `cifras-001`, y el segundo SOBREESCRIBIA
# el log del primero sin un byte de aviso. Y la etiqueta es la CLAVE del ledger
# (`job_ledger._path_for`), cuyo `register` «sobrescribe si la etiqueta ya
# existia»: la colision no era del archivo, era de la IDENTIDAD del trabajo.
#
# La forma sale de dos precedentes MEDIDOS, no de una preferencia:
#   - el cliente organiza por DIRECTORIO POR SUJETO (`projects/<slug>/<uuid>/`,
#     `tasks/<uuid>/`), nunca por ordinal plano;
#   - este arbol ya lo ejerce en `.claude/build-logs/rojo-…-20260917T090330/`,
#     con nombres DESCRIPTIVOS dentro.
# Y `convention-naming.md` prohibe el prefijo numerico: un ordinal fabrica un
# orden que no existe y no dice que contiene el archivo.
#
# El sufijo es ISO-8601 compacto para que ordene cronologicamente por nombre.
# Dos despachos dentro del mismo segundo se desempatan con un contador: sin el,
# la colision volveria por la puerta de atras en una tanda rapida.
# La marca temporal tiene granularidad de SEGUNDO, asi que dos pools lanzados
# a la vez la comparten. Comprobar-luego-crear no cierra esa ventana: los dos
# ven el directorio ausente, los dos eligen el mismo nombre, y vuelve la
# colision de etiqueta que esta tarea existe para cerrar — medido, 5 de 5
# vueltas con dos pools concurrentes (sonda del banco).
#
# `mkdir` SIN `-p` es la primitiva que lo cierra: falla con EEXIST y esa
# comprobacion es atomica en el kernel, asi que exactamente un pool se lleva
# cada nombre. El desempate es un ordinal, no un reintento del reloj: dentro
# del mismo segundo el reloj devolveria el mismo valor y el bucle no avanzaria.
_suffix=1
DISPATCH="$PREFIX-$(date -u +%Y%m%dT%H%M%S)"
RUN_DIR="$DIR/$DISPATCH"
until mkdir "$RUN_DIR" 2>/dev/null; do
    _suffix=$((_suffix + 1))
    if [ "$_suffix" -gt 1000 ]; then
        echo "run-task-pool: no se pudo abrir un despacho unico bajo $DIR" >&2
        exit 4
    fi
    DISPATCH="$PREFIX-$(date -u +%Y%m%dT%H%M%S)-$_suffix"
    RUN_DIR="$DIR/$DISPATCH"
done

# Los comandos, sin vacías ni comentarios.
#
# Cada linea admite `nombre<TAB>comando`. El nombre es DESCRIPTIVO y sustituye
# al ordinal; sin el, se cae al ordinal, que dentro de su propio directorio ya
# es inambiguo. El primer campo se toma como nombre SOLO si parece un nombre
# —sin espacios ni barras— para no partir un comando que lleve un tabulador
# dentro (`awk '{print $1"\t"$2}'`), que lo dejaria lanzando la mitad del
# cuerpo.
if [ "$INPUT" = "-" ]; then mapfile -t RAW; else mapfile -t RAW < "$INPUT"; fi
COMMANDS=()
NAMES=()
for c in "${RAW[@]}"; do
    case "$c" in ''|'#'*) continue ;; esac
    _nombre=""
    case "$c" in
        *$'\t'*)
            _cand="${c%%$'\t'*}"
            case "$_cand" in
                ''|*[[:space:]]*|*/*) : ;;   # no parece un nombre: la linea es el comando
                *) _nombre="$_cand"; c="${c#*$'\t'}" ;;
            esac
            ;;
    esac
    COMMANDS+=("$c")
    NAMES+=("$_nombre")
done
N=${#COMMANDS[@]}
[ "$N" -gt 0 ] || { echo "run-task-pool: 0 comandos que lanzar — nada que medir" >&2; exit 4; }

# El cap. Ver la nota de la cabecera: la cifra publicada es la EFECTIVA.
[ "$WIDTH" -le "$N" ] || WIDTH="$N"
SERIE=""
[ "$WIDTH" -eq 1 ] && SERIE=" (en serie)"

echo "run-task-pool: $N trabajo(s), anchura ${WIDTH}${SERIE}, logs en $RUN_DIR"

ALIVE=()          # pids vivos, del mas viejo al mas joven
ALIVE_INDEX=()    # el indice del comando de cada pid
ALIVE_LABEL=()    # la etiqueta del ledger de cada pid
DRAINING=0
LAUNCHED=0
REQUEUED=0
QUEUE=()
for ((q = 0; q < N; q++)); do QUEUE+=("$q"); done
ATTEMPTS=()

# Retira de las tres listas paralelas los trabajos que ya terminaron.
prune_alive() {
    local k keep_pid=() keep_index=() keep_label=()
    for k in "${!ALIVE[@]}"; do
        if kill -0 "${ALIVE[$k]}" 2>/dev/null; then
            keep_pid+=("${ALIVE[$k]}"); keep_index+=("${ALIVE_INDEX[$k]}")
            keep_label+=("${ALIVE_LABEL[$k]}")
        fi
    done
    ALIVE=("${keep_pid[@]}"); ALIVE_INDEX=("${keep_index[@]}"); ALIVE_LABEL=("${keep_label[@]}")
}

# ¿La memoria impide admitir otro trabajo? Nunca con cero vivos.
memory_blocks_admission() {
    [ "$MEMFREE" -gt 0 ] && [ "${#ALIVE[@]}" -gt 0 ] || return 1
    local available
    available="$(mem_available_bytes)" || return 1
    [ "$available" -lt "$MEMFREE" ]
}

# La mitad de aplicacion: por debajo de la mitad de la cota, se mata al mas
# joven —el ultimo de la lista— y su comando vuelve al final de la cola.
enforce_memfree() {
    [ "$MEMFREE" -gt 0 ] && [ "${#ALIVE[@]}" -gt 1 ] || return 0
    local available last
    available="$(mem_available_bytes)" || return 0
    [ "$available" -lt $(( MEMFREE / 2 )) ] || return 0
    last=$(( ${#ALIVE[@]} - 1 ))
    "$WAIT_JOBS" kill "${ALIVE_LABEL[$last]}" >/dev/null 2>&1
    echo "run-task-pool: memoria disponible $available < $(( MEMFREE / 2 )) —" \
         "${ALIVE_LABEL[$last]} matado y reencolado" >&2
    QUEUE+=("${ALIVE_INDEX[$last]}")
    REQUEUED=$((REQUEUED + 1))
    LAUNCHED=$((LAUNCHED - 1))
    unset "ALIVE[$last]" "ALIVE_INDEX[$last]" "ALIVE_LABEL[$last]"
    ALIVE=("${ALIVE[@]}"); ALIVE_INDEX=("${ALIVE_INDEX[@]}"); ALIVE_LABEL=("${ALIVE_LABEL[@]}")
}

# Espera a que quede un hueco. No usa `wait -n`: los trabajos van desprendidos
# (`disown`) para sobrevivir al fin del turno, y un proceso desprendido ya no es
# hijo esperable de este shell.
free_a_slot() {
    while :; do
        prune_alive
        enforce_memfree
        refresh_width
        [ "$DRAINING" -eq 1 ] && return 0
        if [ "${#ALIVE[@]}" -lt "$WIDTH" ] && ! memory_blocks_admission; then
            return 0
        fi
        sleep 1
    done
}

# Relee el archivo de anchura, si lo hay. Un valor invalido NO mata el despacho:
# se avisa una vez y se conserva la anchura anterior, porque un error de dedo en
# un archivo de configuracion no debe tumbar trabajos que ya estan corriendo.
refresh_width() {
    [ -n "$WIDTH_FILE" ] || return 0
    local raw nueva
    raw="$(width_from_file "$WIDTH_FILE")" || return 0
    [ "$raw" = "$RAW_WIDTH" ] && return 0
    RAW_WIDTH="$raw"
    # El cero drena: se deja de admitir, los vivos terminan.
    case "$raw" in 0|0%) DRAINING=1
        echo "run-task-pool: anchura 0 en $WIDTH_FILE — se drena: no se admiten trabajos nuevos" >&2
        return 0 ;;
    esac
    nueva="$(resolve_width "$raw")" || return 0
    # El mismo cap: la forma de archivo puede subir la anchura EN VUELO por
    # encima del numero de trabajos, y lo que se publique al releerla tiene que
    # seguir siendo la anchura efectiva.
    [ "$nueva" -le "$N" ] || nueva="$N"
    [ "$nueva" = "$WIDTH" ] && return 0
    WIDTH="$nueva"
    echo "run-task-pool: anchura ahora $WIDTH (releida de $WIDTH_FILE)" >&2
}

# La cola se consume hasta vaciarse. Con `--memfree` un trabajo matado vuelve a
# ella, asi que el bucle no termina al lanzar el ultimo: sigue vigilando la
# memoria mientras quede alguno vivo, y relanza lo que se reencole.
while :; do
    if [ "${#QUEUE[@]}" -eq 0 ]; then
        [ "$MEMFREE" -gt 0 ] || break
        prune_alive
        [ "${#ALIVE[@]}" -eq 0 ] && break
        enforce_memfree
        [ "${#QUEUE[@]}" -eq 0 ] && sleep 1
        continue
    fi
    free_a_slot
    if [ "$DRAINING" -eq 1 ]; then
        for idx in "${QUEUE[@]}"; do
            echo "run-task-pool: sin lanzar ($((N - LAUNCHED))): ${COMMANDS[$idx]}" >&2
        done
        QUEUE=()
        continue
    fi
    idx="${QUEUE[0]}"; QUEUE=("${QUEUE[@]:1}")
    cmd="${COMMANDS[$idx]}"
    ATTEMPTS[$idx]=$(( ${ATTEMPTS[$idx]:-0} + 1 ))
    # El nombre: el declarado, o el ordinal dentro de ESTE despacho. Un
    # reintento lleva sufijo propio: su etiqueta y su log no pisan los del
    # intento matado, que se conservan como evidencia.
    _nombre="${NAMES[$idx]}"
    [ -n "$_nombre" ] || _nombre="$(printf '%s-%03d' "$PREFIX" "$((idx + 1))")"
    [ "${ATTEMPTS[$idx]}" -gt 1 ] && _nombre="$_nombre-retry$(( ATTEMPTS[$idx] - 1 ))"
    # La etiqueta lleva el despacho: es la clave del ledger, y sin el
    # discriminante dos despachos se pisaban la fila.
    LABEL="$DISPATCH/$_nombre"
    LOG="$RUN_DIR/$_nombre.log"
    # El marcador `EXIT=` es lo que hace decidible la muerte: sin él,
    # `wait-jobs.sh` no distingue "sigue corriendo" de "murió callado".
    #
    # Va en un shell EXTERIOR al comando, no concatenado con `;`. Un `cmd; echo
    # EXIT=$?` lo defiere cualquier comando que llame a `exit`: `exit 7` termina
    # ese mismo shell y el `echo` no llega a correr — medido, el log quedaba
    # vacío y la barrera lo daba por muerto callado. Con el shell interior, el
    # `exit` mata al de dentro y el de fuera sí escribe el marcador.
    # `setsid` — lider de su propio grupo, para que el kill del ledger barra a
    # los hijos y no deje huerfanos. La nota larga esta en `bg.sh`: con el
    # control de trabajos apagado no bifurca, asi que `$!` sigue siendo el pid
    # que se registra.
    nohup setsid bash -c 'bash -c "$1"; echo EXIT=$?' _ "$cmd" > "$LOG" 2>&1 &
    PID=$!
    disown "$PID" 2>/dev/null || true
    ALIVE+=("$PID"); ALIVE_INDEX+=("$idx"); ALIVE_LABEL+=("$LABEL")
    "$WAIT_JOBS" register "$LABEL" "$LOG" "$PID" >/dev/null
    LAUNCHED=$((LAUNCHED + 1))
    printf '  %-14s pid %-7s %s\n' "$LABEL" "$PID" "$cmd"
done
[ "$REQUEUED" -eq 0 ] || echo "run-task-pool: $REQUEUED reencolado(s) por memoria"

# `--only "$DISPATCH"` acota la espera a los hijos de ESTE despacho. Con
# `$PREFIX` a secas —como estaba— dos pools que compartieran prefijo se
# esperaban mutuamente, que es la mitad de TASK-THYROX-0084 que da nombre a
# la tarea. Sin ninguno, la
# barrera globea todo el ledger — y cuando el pool se lanza a traves de
# `bg.sh` esta registrado ahi, asi que se esperaba a si mismo: nunca asentaba
# y agotaba su timeout entero con sus hijos ya terminados. TASK-THYROX-0083.
echo "run-task-pool: lanzados $LAUNCHED de $N; esperando en PRIMER PLANO (timeout ${TIMEOUT}s)"
"$WAIT_JOBS" wait --timeout "$TIMEOUT" --only "$DISPATCH"
