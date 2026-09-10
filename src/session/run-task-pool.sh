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

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT_JOBS="$AQUI/wait-jobs.sh"

WIDTH="$(nproc 2>/dev/null || echo 4)"
TIMEOUT=1800
DIR="${BG_DIR:-${TMPDIR:-/tmp}/kaupamex-pool}"
PREFIX="job"
ENTRADA=""

while [ $# -gt 0 ]; do
    case "$1" in
        --width)   WIDTH="$2"; shift 2 ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        --dir)     DIR="$2"; shift 2 ;;
        --prefix)  PREFIX="$2"; shift 2 ;;
        -h|--help) sed -n '2,60p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *)         ENTRADA="$1"; shift ;;
    esac
done

[ -n "$ENTRADA" ] || { echo "run-task-pool: falta el archivo de comandos (o '-' para stdin)" >&2; exit 4; }
[ -x "$WAIT_JOBS" ] || { echo "run-task-pool: no encuentro wait-jobs.sh en $AQUI" >&2; exit 4; }

# El ancho se valida: un 0 o un negativo colgaría el bucle de asignación sin
# decir por qué, que es peor que fallar.
case "$WIDTH" in ''|*[!0-9]*|0) echo "run-task-pool: --width debe ser un entero >= 1 (dado: '$WIDTH')" >&2; exit 4 ;; esac

mkdir -p "$DIR"

# Los comandos, sin vacías ni comentarios.
if [ "$ENTRADA" = "-" ]; then mapfile -t CRUDO; else mapfile -t CRUDO < "$ENTRADA"; fi
COMANDOS=()
for c in "${CRUDO[@]}"; do
    case "$c" in ''|'#'*) continue ;; esac
    COMANDOS+=("$c")
done
N=${#COMANDOS[@]}
[ "$N" -gt 0 ] || { echo "run-task-pool: 0 comandos que lanzar — nada que medir" >&2; exit 4; }

echo "run-task-pool: $N trabajo(s), anchura $WIDTH, logs en $DIR"

VIVOS=()

# Espera a que quede un hueco. No usa `wait -n`: los trabajos van desprendidos
# (`disown`) para sobrevivir al fin del turno, y un proceso desprendido ya no es
# hijo esperable de este shell.
libre_un_hueco() {
    while [ "${#VIVOS[@]}" -ge "$WIDTH" ]; do
        local quedan=()
        for p in "${VIVOS[@]}"; do
            kill -0 "$p" 2>/dev/null && quedan+=("$p")
        done
        VIVOS=("${quedan[@]}")
        [ "${#VIVOS[@]}" -ge "$WIDTH" ] && sleep 1
    done
}

i=0
for cmd in "${COMANDOS[@]}"; do
    i=$((i + 1))
    libre_un_hueco
    ETIQUETA="$(printf '%s-%03d' "$PREFIX" "$i")"
    LOG="$DIR/$ETIQUETA.log"
    # El marcador `EXIT=` es lo que hace decidible la muerte: sin él,
    # `wait-jobs.sh` no distingue "sigue corriendo" de "murió callado".
    #
    # Va en un shell EXTERIOR al comando, no concatenado con `;`. Un `cmd; echo
    # EXIT=$?` lo defiere cualquier comando que llame a `exit`: `exit 7` termina
    # ese mismo shell y el `echo` no llega a correr — medido, el log quedaba
    # vacío y la barrera lo daba por muerto callado. Con el shell interior, el
    # `exit` mata al de dentro y el de fuera sí escribe el marcador.
    nohup bash -c 'bash -c "$1"; echo EXIT=$?' _ "$cmd" > "$LOG" 2>&1 &
    PID=$!
    disown "$PID" 2>/dev/null || true
    VIVOS+=("$PID")
    "$WAIT_JOBS" register "$ETIQUETA" "$LOG" "$PID" >/dev/null
    printf '  %-14s pid %-7s %s\n' "$ETIQUETA" "$PID" "$cmd"
done

echo "run-task-pool: lanzados $N; esperando en PRIMER PLANO (timeout ${TIMEOUT}s)"
"$WAIT_JOBS" wait --timeout "$TIMEOUT"
