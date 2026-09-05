#!/bin/bash
# =============================================================================
# wait-jobs.sh — barrera de N trabajos: bloquea el turno hasta que
# TODOS se asienten, y da veredicto por trabajo
# =============================================================================
#
# Por qué existe
# --------------
# `esperar-marcador.sh` espera UN trabajo. Con N lanzados, esperarlos "de a
# uno" no es una barrera: el primero que se atasca deja a los demás sin
# recoger, y el turno puede cerrar creyendo que sólo faltaba ese.
#
# El defecto que ataca no es la espera larga: es que la espera se implemente
# como **tarea paralela** en vez de **bloqueo**. Un `Monitor` observa y no
# bloquea; un `Bash` en primer plano sí. Ese es el sitio, y es lo que
# `bash-background-tasks.md` nombraba sin fijar.
#
# De dónde sale el mecanismo
# ---------------------------
# `hccw: 17-autonomy-goal-loop.md:19,25` documenta el único sustrato de
# bloqueo del cliente, verbatim: `/goal` es *"syntactic sugar over a Stop
# hook"*, y el hook *"will block stopping until the condition holds"*.
#
# Lo que el corpus NO documenta —medido: 0 hits de `barrier`/`await all`/
# `join all`/`wait for all` en los seis capítulos presentes— es una barrera
# para N. Por eso se construye aquí en vez de adaptarse.
#
# El registro es lo que hace posible el gate: sin ledger, un Stop hook no
# puede distinguir "no había trabajos" de "había N y nadie los esperó". Las
# dos se ven igual desde el final del turno, que es exactamente la ceguera de
# `metrica-decide-la-conclusion.md`.
#
# Uso
# ---
#   wait-jobs.sh register <etiqueta> <log> [pid]
#   wait-jobs.sh wait [--timeout SEGUNDOS] [--pattern RE]
#   wait-jobs.sh pending
#   wait-jobs.sh status [--pattern RE]         resumen por clase, antes de decidir
#   wait-jobs.sh continue <etiqueta|--todos>   SIGCONT a los DETENIDOs
#   wait-jobs.sh kill <etiqueta|--todos>       TERM, luego KILL, y suelta
#   wait-jobs.sh adopt --match RE              reanota los huérfanos que ya corren
#   wait-jobs.sh forget <etiqueta>
#
# El subcomando va en INGLES desde 2026-09-04 (`identificadores-en-ingles.md`,
# ampliada por el ejecutor a scripts, funciones y firmas). El nombre español
# queda como ALIAS y no se retira: mas de treinta `.rst` de hallazgo y analisis
# lo citan como evidencia fechada de lo que se ejecuto ese dia, y esa clase de
# cita no se reescribe —mismo criterio que las citas historicas a `odoo19x/`—.
# El alias mantiene cierta la evidencia sin congelar el idioma del codigo.
#
# `wait` sale:
#     0 — todos los trabajos escribieron su marcador
#     2 — al menos uno murió sin escribirlo (los nombra)
#     3 — timeout con al menos uno vivo y sin marcador
#
# Los trabajos que asientan (marcador o muerte confirmada) se retiran del
# ledger al recogerse. Los que quedan por timeout siguen registrados, así que
# el Stop hook bloquea el fin del turno: es la red que sostiene la barrera
# cuando alguien la omite.
# =============================================================================

set -uo pipefail

# El ledger vive en un sitio DURABLE, no en /tmp. Medido 2026-09-02 tras el
# reinicio del worker (época 247): el directorio de /tmp no sobrevivió al
# reinicio —justo cuando el ledger importa—, así que un trabajo registrado y no
# recogido se perdía sin rastro. El ledger VIVO es un directorio de trabajo por
# sesión bajo `.claude/eventos/trabajos-ledger/<id>/`; lo que se COMMITEA como
# evidencia es su archivo comprimido `<id>.tar.gz` bajo `.claude/eventos/trabajos/`,
# uno por sesión —como el binario guarda `jobs/<short>/`, pero empaquetado, para
# no cargar GitHub con muchos `.job` sueltos (directiva del ejecutor 2026-09-02)—.
# El subcomando `archive` produce ese `.tar.gz`. Un test aísla el ledger vivo
# con KX_TRABAJOS_DIR.
_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
_SESSION="${CLAUDE_CODE_SESSION_ID:-sin-sesion}"
LEDGER="${KX_TRABAJOS_DIR:-$_ROOT/.claude/eventos/jobs-ledger/$_SESSION}"
_ARCHIVE_DIR="${KX_TRABAJOS_ARCHIVO_DIR:-$_ROOT/.claude/eventos/jobs}"
DEFAULT_PATTERN='^EXIT=[0-9]+'
INTERVAL="${WAIT_JOBS_INTERVAL:-2}"

mkdir -p "$LEDGER"

# `kill -0` pregunta por la existencia del proceso sin señalarlo. Devuelve
# falso también si el proceso existe pero es de otro usuario — por eso el
# veredicto dice "no responde a kill -0", no "murió": es lo que se mide.
still_alive() { [[ -n "${1:-}" ]] && kill -0 "$1" 2>/dev/null; }
has_marker() { grep -qE "$2" "$1" 2>/dev/null; }

# ¿El pid vive Y sigue siendo el proceso que se registró? `kill -0` responde lo
# primero; `read_proc_start` lo segundo. Sin la segunda mitad un pid reciclado
# se lee como el trabajo original, y `wait` agota su timeout esperando a un
# proceso ajeno que nunca va a escribir el marcador.
still_ours() {
    still_alive "$1" || return 1
    [[ -z "${2:-}" ]] && return 0
    [[ "$2" == "$(read_proc_start "$1")" ]]
}

# Veredicto de un trabajo: OK | BAIL | ESPERANDO
verdict() {
    local log="$1" pid="$2" pattern="$3" recorded="${4:-}"
    if has_marker "$log" "$pattern"; then echo OK; return; fi
    if [[ -n "$pid" ]] && ! still_ours "$pid" "$recorded"; then
        # Carrera real: el proceso puede escribir el marcador y morir entre
        # las dos comprobaciones. Se vuelve a mirar antes de declarar BAIL.
        sleep 1
        if has_marker "$log" "$pattern"; then echo OK; else echo BAIL; fi
        return
    fi
    echo ESPERANDO
}

cmd_register() {
    local label="${1:?uso: registrar <label> <log> [pid]}"
    local log="${2:?uso: registrar <label> <log> [pid]}"
    local pid="${3:-}"
    local target="$LEDGER/${label//\//_}.job"
    # tmp+mv: `wait`/`pending` reglobean `*.job` en caliente; una
    # escritura directa (`>`) trunca el archivo antes de llenarlo y un lector
    # concurrente puede verlo vacío. mv dentro del mismo filesystem es atómico
    # (rename(2)), así que nunca hay un job a medio escribir.
    local tmp="$target.tmp.$$"
    # `cmd=` y `proc_start=` son lo que hace posible ADOPTAR después. Sin la
    # línea de comando no hay con qué barrer `ps` para reencontrar un trabajo
    # soltado; sin el `starttime` no hay con qué distinguir su pid de un pid
    # reciclado. Los dos se leen del propio proceso, no se piden al llamador:
    # un dato que hay que acordarse de pasar es un dato que falta.
    local cmd="${4:-}"
    [[ -z "$cmd" && -n "$pid" && -r "/proc/$pid/cmdline" ]] \
        && cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline")"
    local ps0=""; [[ -n "$pid" ]] && ps0="$(read_proc_start "$pid")"
    printf 'log=%s\npid=%s\nproc_start=%s\ncmd=%s\n' "$log" "$pid" "$ps0" "$cmd" > "$tmp"
    mv -f "$tmp" "$target"
    echo "registrado: $label -> $log (pid=${pid:-sin-pid})"
}

# La ESCOTILLA del gate: declara que un trabajo se abandona a propósito y lo
# retira del ledger, para que `stop-gate-espera-pendiente.sh` deje cerrar el
# turno. Su contrato lo fija `tests/test-contrato-de-escotilla.sh`:
#
#   - el aviso va a **stderr**, no a stdout. Un aviso en stdout desaparece con
#     el primer `>/dev/null`, y eso es exactamente lo que dejó esta escotilla
#     sin probar durante toda su vida (`test-wait-jobs.sh:77`).
#   - sobre una etiqueta que NO está en el ledger sale **2** y no dice
#     «olvidado»: un abandono declarado sobre nada no es un abandono. El
#     `rm -f` de antes absolvía el vacío en silencio.
#
# Lo que `olvidar` NO hace, y hay que decirlo: **no toca el proceso**. Suelta
# la anotación y deja el trabajo corriendo, huérfano de todo seguimiento.
# Medido 2026-09-04: tras `olvidar ctl-001`, su `sleep 40` seguía vivo. Para
# terminarlo de verdad existe `kill`, que señala y luego suelta; `forget`
# queda para el trabajo que se quiere **dejar correr** sin bloquear el turno.
cmd_forget() {
    local label="${1:?uso: olvidar <label>}"
    local target="$LEDGER/${label//\//_}.job"
    if [[ ! -f "$target" ]]; then
        echo "sin registro: '$label' no está en el ledger; nada que soltar" >&2
        return 2
    fi
    rm -f "$target"
    echo "olvidado: $label (abandono declarado; anotar el motivo en el progreso)" >&2
}

# Imprime los trabajos LANZADOS Y NO RECOGIDOS. Exit 1 si hay alguno — así el
# Stop hook no necesita parsear nada.
#
# Pendiente es «no recogido», NO «no asentado». La diferencia es el episodio
# entero: en H-DOCS-155 la suite **sí** escribió su `EXIT=1` a las 21:52 y el
# turno murió a las ~22:05 sin leerlo. Un predicado sobre el marcador la habría
# dado por buena y el gate no habría bloqueado — habría medido la terminación
# del proceso, que no es el fenómeno, en vez de la recogida del resultado, que
# sí lo es (`metrica-decide-la-conclusion.md`).
#
# Sólo `wait` (o un `forget` explícito) retira del ledger. Por eso un
# trabajo terminado y sin recoger sigue contando como pendiente, y se anota
# como `SIN-RECOGER` para distinguirlo del que aún corre.
cmd_pending() {
    local pattern="${1:-$DEFAULT_PATTERN}" any_pending=0
    shopt -s nullglob
    for f in "$LEDGER"/*.job; do
        local log pid ps0 label v
        log=$(sed -n 's/^log=//p' "$f"); pid=$(sed -n 's/^pid=//p' "$f")
        ps0=$(sed -n 's/^proc_start=//p' "$f")
        label=$(basename "$f" .job)
        v=$(verdict "$log" "$pid" "$pattern" "$ps0")
        [[ "$v" == OK ]] && v=SIN-RECOGER
        echo "$label  [$v]  $log"
        any_pending=1
    done
    shopt -u nullglob
    return $any_pending
}

cmd_wait() {
    local timeout=1800 pattern="$DEFAULT_PATTERN"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --timeout) timeout="${2:?--timeout exige segundos}"; shift 2 ;;
            --pattern)  pattern="${2:?--pattern exige una expresión}"; shift 2 ;;
            *) echo "argumento no reconocido: $1" >&2; exit 64 ;;
        esac
    done

    shopt -s nullglob
    local jobs=("$LEDGER"/*.job)
    shopt -u nullglob
    if [[ ${#jobs[@]} -eq 0 ]]; then
        echo "== sin trabajos registrados =="
        return 0
    fi

    local started_at; started_at=$(date +%s)
    local -A settled_as=()
    local total=${#jobs[@]}

    while true; do
        local settled=0
        for f in "${jobs[@]}"; do
            local label; label=$(basename "$f" .job)
            if [[ -n "${settled_as[$label]:-}" ]]; then
                (( settled++ )); continue
            fi
            [[ -f "$f" ]] || { settled_as[$label]=OLVIDADO; (( settled++ )); continue; }
            local log pid ps0 v
            log=$(sed -n 's/^log=//p' "$f"); pid=$(sed -n 's/^pid=//p' "$f")
            ps0=$(sed -n 's/^proc_start=//p' "$f")
            v=$(verdict "$log" "$pid" "$pattern" "$ps0")
            if [[ "$v" != ESPERANDO ]]; then
                settled_as[$label]="$v"
                (( settled++ ))
            fi
        done

        (( settled == total )) && break

        if (( $(date +%s) - started_at >= timeout )); then
            echo "TIMEOUT — ${timeout}s con $((total - settled)) de $total trabajos sin asentar."
            echo "          Siguen en el ledger: el Stop hook bloqueará el fin del turno."
            for f in "${jobs[@]}"; do
                local e; e=$(basename "$f" .job)
                [[ -n "${settled_as[$e]:-}" ]] || echo "          | $e — vivo y sin marcador"
            done
            return 3
        fi
        sleep "$INTERVAL"
    done

    # Todos asentados: publicar el veredicto por trabajo y retirarlos.
    local had_bail=0
    echo "== $total trabajos asentados =="
    for f in "${jobs[@]}"; do
        local label log; label=$(basename "$f" .job)
        log=$(sed -n 's/^log=//p' "$f" 2>/dev/null)
        printf '%-6s %s\n' "${settled_as[$label]}" "$label"
        # La cola se imprime SIEMPRE, no sólo en BAIL. Recoger un trabajo es
        # leer su resultado; un `OK` a secas deja el turno sin la única cifra
        # por la que se esperó — que es literalmente lo que pasó en
        # H-DOCS-155, donde el `7 failed` existía y nadie lo vio.
        if [[ "${settled_as[$label]}" == BAIL ]]; then
            had_bail=1
            echo "       murió sin escribir su marcador. Últimas líneas de $log:"
        fi
        tail -10 "$log" 2>/dev/null | sed 's/^/       | /'
        [[ -s "$log" ]] || echo "       | (vacío — no emitió nada)"
        rm -f "$f"
    done
    return $(( had_bail ? 2 : 0 ))
}

# El estado de un proceso, leído de `ps`. Distingue lo que `kill -0` no puede:
# un trabajo DETENIDO (SIGSTOP, estado `T`) y uno ZOMBIE (`Z`) responden los dos
# a `kill -0` y ninguno de los dos va a escribir su marcador nunca. Sin este eje,
# `wait` los cuenta como «vivos» y agota el timeout esperando a un muerto.
process_state() {
    [[ -n "${1:-}" ]] || { echo ""; return; }
    ps -o state= -p "$1" 2>/dev/null | tr -d ' \n'
}

# La hora de arranque del proceso, campo 22 de `/proc/<pid>/stat` (`starttime`,
# en ticks desde el arranque del sistema). Es el discriminador que `kill -0` no
# puede dar: un pid vuelve a existir siendo OTRO proceso, y su `starttime` no
# coincide. Sin este eje, adoptar por pid adopta a un desconocido.
#
# El nombre del ejecutable va entre paréntesis y puede traer espacios, así que
# se corta por el ÚLTIMO `) ` para que los campos numéricos queden alineados —
# misma aritmética que `readProcStart` de `.claude/packages/harness/`
# `src/session/reconcile.ts`, que resuelve lo mismo para las filas del store.
# Son dos registros distintos (el ledger de trabajos y `agent_sessions`), por
# eso la primitiva se declara en los dos y el bucle no llama al harness.
read_proc_start() {
    [[ -n "${1:-}" ]] || { echo ""; return; }
    local stat; stat="$(cat "/proc/$1/stat" 2>/dev/null)" || { echo ""; return; }
    [[ -n "$stat" ]] || { echo ""; return; }
    echo "${stat##*') '}" | awk '{print $20}'
}

# Clase de un trabajo: el veredicto de `esperar` MÁS el estado del proceso.
#   SIN-RECOGER  marcador escrito, nadie lo leyó         → recoger con `wait`
#   DETENIDO     estado T: parado, no va a avanzar solo  → `continue` o `kill`
#   ZOMBIE       estado Z: terminó y nadie lo cosechó    → `kill` (suelta)
#   VIVO         corriendo, sin marcador                 → esperar o `matar`
#   BAIL         pid ausente y sin marcador              → murió callado
#   RECICLADO    el pid vive pero es OTRO proceso        → el trabajo murió
#   SIN-PID      registrado sin pid: no se puede señalar → sólo `forget`
#
# `RECICLADO` se nombra en español como sus seis hermanos aunque el código vaya
# en inglés: es vocabulario PUBLICADO en una columna, no un identificador, y
# mezclar dos idiomas en la misma columna la vuelve ilegible.
class() {
    local log="$1" pid="$2" pattern="$3" recorded="${4:-}" st
    if has_marker "$log" "$pattern"; then echo SIN-RECOGER; return; fi
    if [[ -z "$pid" ]]; then echo SIN-PID; return; fi
    st="$(process_state "$pid")"
    # El pid vive, pero ¿es el nuestro? Sólo se puede preguntar si al registrar
    # se anotó su `starttime`; los .job anteriores a TASK-DOCS-0377 no lo traen
    # y siguen clasificándose por estado, sin este eje.
    if [[ -n "$recorded" && -n "$st" && "$recorded" != "$(read_proc_start "$pid")" ]]; then
        echo RECICLADO; return
    fi
    case "$st" in
        '')   echo BAIL ;;
        *T*)  echo DETENIDO ;;
        *Z*)  echo ZOMBIE ;;
        *)    echo VIVO ;;
    esac
}

# El resumen que se mira ANTES de decidir. `pending` imprime una línea por
# trabajo y no dice cuántos hay de cada clase; con veinte trabajos eso no es un
# estado, es un volcado. Exit 1 si queda algo sin recoger — mismo contrato que
# `pending`, para que el Stop hook no tenga que parsear.
cmd_status() {
    local pattern="$DEFAULT_PATTERN"
    [[ "${1:-}" == "--pattern" ]] && { pattern="${2:?--pattern exige una expresión}"; shift 2; }
    local -A count=() ; local total=0
    shopt -s nullglob
    for f in "$LEDGER"/*.job; do
        local log pid ps0 label c
        log=$(sed -n 's/^log=//p' "$f"); pid=$(sed -n 's/^pid=//p' "$f")
        ps0=$(sed -n 's/^proc_start=//p' "$f")
        label=$(basename "$f" .job)
        c=$(class "$log" "$pid" "$pattern" "$ps0")
        count[$c]=$(( ${count[$c]:-0} + 1 ))
        total=$((total + 1))
        printf '  %-12s %-10s pid %-8s %s\n' "$label" "$c" "${pid:-—}" "$log"
    done
    shopt -u nullglob
    if [[ $total -eq 0 ]]; then
        echo "estado: ledger vacío — 0 jobs registrados en $LEDGER"
        return 0
    fi
    local summary=""
    for c in SIN-RECOGER VIVO DETENIDO ZOMBIE RECICLADO BAIL SIN-PID; do
        [[ -n "${count[$c]:-}" ]] && summary+="$c=${count[$c]} "
    done
    echo "estado: $total trabajo(s) — $summary"
    [[ -n "${count[DETENIDO]:-}" ]] && echo "  → los DETENIDO no avanzan solos: 'continuar <label>' o 'matar'"
    [[ -n "${count[ZOMBIE]:-}"  ]] && echo "  → los ZOMBIE ya terminaron sin cosechar: 'kill' los suelta"
    [[ -n "${count[RECICLADO]:-}" ]] && echo "  → los RECICLADO: su pid es de otro proceso; el trabajo murió — 'forget'"
    return 1
}

# Los .job que una selección nombra: una etiqueta, o `--todos`.
_selection() {
    local sel="${1:?uso: <label>|--todos}"
    if [[ "$sel" == "--todos" ]]; then
        shopt -s nullglob; printf '%s\n' "$LEDGER"/*.job; shopt -u nullglob
    else
        local f="$LEDGER/${sel//\//_}.job"
        [[ -f "$f" ]] && echo "$f"
    fi
}

# SIGCONT a los detenidos. Es la mitad «reactivar»: sólo tiene efecto sobre un
# proceso en estado T; sobre cualquier otro se dice y no se señala, porque un
# CONT a un proceso que corre es un no-op que se leería como acción.
cmd_continue() {
    local sel="${1:?uso: continuar <label>|--todos}" n=0
    while IFS= read -r f; do
        [[ -n "$f" ]] || continue
        local pid label st
        pid=$(sed -n 's/^pid=//p' "$f"); label=$(basename "$f" .job)
        st="$(process_state "$pid")"
        case "$st" in
            *T*) kill -CONT "$pid" 2>/dev/null && { echo "continuado: $label (pid $pid)"; n=$((n+1)); } ;;
            '')  echo "sin proceso: $label (pid ${pid:-—} no existe)" >&2 ;;
            *)   echo "no detenido: $label (estado '$st') — no se señala" >&2 ;;
        esac
    done < <(_selection "$sel")
    [[ $n -gt 0 ]]
}

# Termina el trabajo Y suelta su anotación. Es lo que `olvidar` no hace: TERM
# primero (deja limpiar), KILL si sigue vivo tras la gracia. El .job se retira
# sólo DESPUÉS de comprobar que el proceso se fue — si no, el ledger mentiría
# en la dirección peligrosa: diría que no queda nada habiendo un huérfano.
cmd_kill() {
    local sel="${1:?uso: matar <label>|--todos}" grace="${2:-5}" n=0
    while IFS= read -r f; do
        [[ -n "$f" ]] || continue
        local pid label
        pid=$(sed -n 's/^pid=//p' "$f"); label=$(basename "$f" .job)
        if [[ -z "$pid" ]]; then
            echo "sin pid: $label no se puede señalar; usa 'forget'" >&2
            continue
        fi
        if [[ -z "$(process_state "$pid")" ]]; then
            rm -f "$f"; echo "ya no corría: $label (pid $pid) — soltado"; n=$((n+1)); continue
        fi
        kill -TERM "$pid" 2>/dev/null
        local i=0
        while [[ $i -lt $grace && -n "$(process_state "$pid")" ]]; do sleep 1; i=$((i+1)); done
        if [[ -n "$(process_state "$pid")" ]]; then
            kill -KILL "$pid" 2>/dev/null; sleep 1
        fi
        if [[ -n "$(process_state "$pid")" ]]; then
            echo "NO murió: $label (pid $pid) sigue vivo tras TERM y KILL — NO se suelta del ledger" >&2
        else
            rm -f "$f"; echo "matado: $label (pid $pid) — soltado del ledger"; n=$((n+1))
        fi
    done < <(_selection "$sel")
    [[ $n -gt 0 ]]
}

# Reencuentra los trabajos que el ledger PERDIÓ y los vuelve a anotar.
#
# El hueco que cierra (h-docs-1037): `forget` suelta la anotación y **deja el
# proceso corriendo** — lo dice su propio docstring y está medido. Tras él hay
# un trabajo vivo que ninguna herramienta ve: `status` sólo mira el ledger, así
# que un huérfano no se distingue de un trabajo que nunca existió. Es la misma
# ceguera que `metrica-decide-la-conclusion.md` describe, aplicada al registro.
# Un ledger perdido (contenedor reciclado, `KX_TRABAJOS_DIR` distinto) deja el
# mismo estado.
#
# Adoptar NO relanza: sólo vuelve a anotar lo que ya corre. Es deliberado —
# `reconciliar-agentes.sh` resuelve esto mismo para subagentes y su trampa está
# medida (H-DOCS-1004: el instrumento lee «atascado» un agente que trabaja), así
# que aquí la única acción es la anotación, que no puede dañar nada. Terminar un
# trabajo sigue siendo `kill`, con su confirmación.
cmd_adopt() {
    local match="" prefix="adoptado" log_override="" dry=0
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --match)   match="${2:?--match exige una expresión}"; shift 2 ;;
            --label)   prefix="${2:?--label exige un prefijo}"; shift 2 ;;
            --log)     log_override="${2:?--log exige una ruta}"; shift 2 ;;
            --dry-run) dry=1; shift ;;
            *) echo "argumento no reconocido: $1" >&2; return 64 ;;
        esac
    done
    if [[ -z "$match" ]]; then
        echo "uso: adopt --match RE [--label PREFIJO] [--log RUTA] [--dry-run]" >&2
        return 64
    fi

    local -A known=()
    shopt -s nullglob
    for f in "$LEDGER"/*.job; do
        local p; p=$(sed -n 's/^pid=//p' "$f"); [[ -n "$p" ]] && known[$p]=1
    done
    shopt -u nullglob

    # UNA sola foto de `ps`, recorrida dos veces. La segunda pasada necesita
    # saber qué otros pid se van a adoptar, y una foto por pasada los vería en
    # estados distintos: sería medir dos poblaciones y compararlas.
    local snapshot; snapshot="$(ps -eo pid=,ppid=,args= 2>/dev/null)"
    local -A cand=() parent=()
    # El filtro va DENTRO del bucle, no en un `grep` encadenado: un `ps | grep RE`
    # incluye al propio grep, cuya línea de comando trae el RE — se filtraría a
    # sí mismo y el ledger se llenaría de basura efímera.
    while read -r pid ppid args; do
        [[ -n "$pid" && -n "$args" ]] || continue
        [[ "$args" =~ $match ]] || continue
        [[ -n "${known[$pid]:-}" ]] && continue
        # Nunca adoptarse a sí mismo: la línea de comando de ESTE `adopt` trae
        # el RE por definición, así que sin el guardia el ledger se anotaría a
        # sí mismo y no volvería a vaciarse nunca.
        [[ "$pid" == "$$" || "$pid" == "$PPID" ]] && continue
        case "$args" in *wait-jobs.sh*) continue ;; esac
        cand[$pid]="$args"; parent[$pid]="$ppid"
    done <<< "$snapshot"

    local n=0 skipped=0
    for pid in "${!cand[@]}"; do
        # Un trabajo es un ÁRBOL de procesos: el shell lanzado, su hijo, su
        # `sleep`. Todos comparten la línea de comando en `args`, así que un
        # filtro por RE los ve a todos y adoptaría el mismo trabajo tres veces.
        # Se anota la RAÍZ: si el padre ya está anotado o va a adoptarse, el
        # hijo no es un huérfano distinto — es el mismo trabajo por dentro.
        local pp="${parent[$pid]}"
        [[ -n "${known[$pp]:-}" || -n "${cand[$pp]:-}" ]] && continue

        local args="${cand[$pid]}" log="$log_override"
        if [[ -z "$log" ]]; then
            # El log se RECUPERA, no se adivina: los trabajos se lanzan con
            # `> "$LOG" 2>&1`, así que el fd 1 del proceso apunta al archivo.
            log="$(readlink "/proc/$pid/fd/1" 2>/dev/null)"
        fi
        if [[ ! -f "$log" ]]; then
            # fd 1 puede ser una tubería, un tty o un socket. Ninguno es un log
            # que `wait` pueda leer, y un log inventado es peor que ninguno: la
            # barrera esperaría un marcador en un archivo que nadie escribe.
            echo "sin log recuperable: pid $pid (fd 1 -> ${log:-?}) — repite con --log" >&2
            skipped=$((skipped + 1)); continue
        fi

        if [[ $dry -eq 1 ]]; then
            echo "adoptaría: ${prefix}-${pid} -> $log  [$args]"
        else
            cmd_register "${prefix}-${pid}" "$log" "$pid" "$args" >/dev/null
            echo "adoptado: ${prefix}-${pid} (pid $pid) -> $log"
        fi
        n=$((n + 1))
    done

    if [[ $n -eq 0 ]]; then
        echo "adopt: ningún huérfano coincide con '$match' (revisados los pid no anotados)"
    fi
    [[ $skipped -gt 0 ]] && echo "adopt: $skipped omitido(s) por log no recuperable" >&2
    return 0
}

# Empaqueta el ledger vivo en `<id>.tar.gz` — el artefacto versionado. `id`
# por defecto es la sesión. Vacía el ledger vivo tras archivar: el `.tar.gz` es
# la evidencia durable, el directorio suelto es sólo el estado en vuelo.
cmd_archive() {
    local id="${1:-$_SESSION}"
    mkdir -p "$_ARCHIVE_DIR"
    local jobs; jobs=$(find "$LEDGER" -name '*.job' 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$jobs" -eq 0 ]]; then
        echo "archive: ledger vacío, nada que empaquetar ($LEDGER)"
        return 0
    fi
    local target="$_ARCHIVE_DIR/${id}.tar.gz"
    tar -czf "$target" -C "$LEDGER" . && rm -f "$LEDGER"/*.job
    echo "archivado: $jobs trabajo(s) -> $target"
}

case "${1:-}" in
    register|registrar)  shift; cmd_register "$@" ;;
    wait|esperar)        shift; cmd_wait "$@" ;;
    pending|pendientes)  shift; cmd_pending "$@" ;;
    status|estado)       shift; cmd_status "$@" ;;
    continue|continuar)  shift; cmd_continue "$@" ;;
    kill|matar)          shift; cmd_kill "$@" ;;
    forget|olvidar)      shift; cmd_forget "$@" ;;
    adopt|adoptar)       shift; cmd_adopt "$@" ;;
    archive|archivar)    shift; cmd_archive "$@" ;;
    *) sed -n '/^# Uso/,/^# ===/p' "$0" | sed 's/^# \?//'; exit 64 ;;
esac
