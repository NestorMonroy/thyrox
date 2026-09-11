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
# cada uno es otro perfil, no medido.
#
# Uso
# ---
#   run-task-pool.sh [--width N] [--timeout S] [--dir LOGDIR] [--prefix P] <archivo>
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
# `THYROX_BACKGROUND_LOG_<CLON>` (global: `THYROX_BACKGROUND_LOG_DIR`), y la
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

while [ $# -gt 0 ]; do
    case "$1" in
        --width)   WIDTH="$2"; shift 2 ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        --dir)     DIR="$2"; shift 2 ;;
        --prefix)  PREFIX="$2"; shift 2 ;;
        -h|--help) sed -n '2,60p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *)         INPUT="$1"; shift ;;
    esac
done

[ -n "$INPUT" ] || { echo "run-task-pool: falta el archivo de comandos (o '-' para stdin)" >&2; exit 4; }
[ -x "$WAIT_JOBS" ] || { echo "run-task-pool: no encuentro wait-jobs.sh en $HERE" >&2; exit 4; }

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

# Los comandos, sin vacías ni comentarios.
if [ "$INPUT" = "-" ]; then mapfile -t RAW; else mapfile -t RAW < "$INPUT"; fi
COMMANDS=()
for c in "${RAW[@]}"; do
    case "$c" in ''|'#'*) continue ;; esac
    COMMANDS+=("$c")
done
N=${#COMMANDS[@]}
[ "$N" -gt 0 ] || { echo "run-task-pool: 0 comandos que lanzar — nada que medir" >&2; exit 4; }

# El cap. Ver la nota de la cabecera: la cifra publicada es la EFECTIVA.
[ "$WIDTH" -le "$N" ] || WIDTH="$N"
SERIE=""
[ "$WIDTH" -eq 1 ] && SERIE=" (en serie)"

echo "run-task-pool: $N trabajo(s), anchura ${WIDTH}${SERIE}, logs en $DIR"

ALIVE=()
DRAINING=0
LAUNCHED=0

# Espera a que quede un hueco. No usa `wait -n`: los trabajos van desprendidos
# (`disown`) para sobrevivir al fin del turno, y un proceso desprendido ya no es
# hijo esperable de este shell.
free_a_slot() {
    while [ "${#ALIVE[@]}" -ge "$WIDTH" ]; do
        local remaining=()
        for p in "${ALIVE[@]}"; do
            kill -0 "$p" 2>/dev/null && remaining+=("$p")
        done
        ALIVE=("${remaining[@]}")
        refresh_width
        [ "$DRAINING" -eq 1 ] && return 0
        [ "${#ALIVE[@]}" -ge "$WIDTH" ] && sleep 1
    done
    refresh_width
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

i=0
for cmd in "${COMMANDS[@]}"; do
    i=$((i + 1))
    free_a_slot
    if [ "$DRAINING" -eq 1 ]; then
        echo "run-task-pool: sin lanzar ($((N - LAUNCHED))): $cmd" >&2
        continue
    fi
    LABEL="$(printf '%s-%03d' "$PREFIX" "$i")"
    LOG="$DIR/$LABEL.log"
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
    ALIVE+=("$PID")
    "$WAIT_JOBS" register "$LABEL" "$LOG" "$PID" >/dev/null
    LAUNCHED=$((LAUNCHED + 1))
    printf '  %-14s pid %-7s %s\n' "$LABEL" "$PID" "$cmd"
done

echo "run-task-pool: lanzados $LAUNCHED de $N; esperando en PRIMER PLANO (timeout ${TIMEOUT}s)"
"$WAIT_JOBS" wait --timeout "$TIMEOUT"
