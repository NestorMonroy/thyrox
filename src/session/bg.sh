#!/bin/bash
# =============================================================================
# bg.sh — lanzar un comando largo en background y esperarlo con timeout
# =============================================================================
#
# Encapsula los tres patrones que `long-running-commands.md` describe como
# PROSA y que hasta ahora se copiaban a mano en cada invocación: R-1 (`nohup …
# & disown`), R-2.0 (esperar por condición con marcador `EXIT=`) y R-2.1
# (`tail -f --pid`).
#
# Por qué existe
# --------------
# `gitlink-bump-gate.md` lo deja dicho: *"La lección escrita no previene la
# reincidencia. Sólo un gate ejecutable integrado en el flujo lo hace."* Los
# tres patrones llevaban meses escritos y se seguían copiando mal — el episodio
# que lo destapó fue un `pytest … | tail -40` que corrió 18 minutos sin emitir
# una línea, porque `tail` no imprime hasta que el pipeline entero termina
# (AP-5 de esa misma regla, escrita por quien la violó).
#
# Qué replica del par nativo Task/TaskOutput, y qué no
# -----------------------------------------------------
#   (a) lanzar detached con log y un id          → SÍ
#   (b) bloquear con timeout, devolver salida    → SÍ
#   (c) despertar al agente al terminar          → NO — eso es del harness
#
# La (c) no es replicable desde un script: nada en bash puede reinvocar la
# sesión. Su sustituta honesta es el bloqueo con timeout, no una promesa de
# notificación. Documentado en
# `docs: …/evaluar-agent-sdk-orquestacion/analisis-replicar-task-y-taskoutput-en-el-proyecto.rst`.
#
# Uso
# ---
#   bg.sh start <nombre> [--dir D] -- <comando...>   lanza; imprime PID y log
#   bg.sh wait  <nombre> [segundos]        bloquea (default 1800 s)
#   bg.sh status <nombre>                  running | done:<exit> | unknown
#   bg.sh log   <nombre>                   imprime la ruta del log
#   bg.sh marker-pattern                   el regex que su marcador de salida
#                                           cumple — lo que `wait-jobs.sh
#                                           register --marker` necesita
#   bg.sh register <nombre>                registra un trabajo YA lanzado en
#                                           la barrera de `wait-jobs.sh`, con
#                                           ese `--marker` compuesto solo —
#                                           TASK-THYROX-0028: el consumidor
#                                           nunca escribe el literal a mano
#
# Dónde deja los logs — la familia `jobs`, un run por trabajo
# -----------------------------------------------------------
# Por defecto cada trabajo nace en su propio **run** de la familia `jobs`
# (`src/session/job_runs.py`), hermana de `workbench`:
#
#   <hogar>/<slug>-<AAAAMMDDThhmmss>/
#     manifest.jsonl     instrument declarado; las otras cuatro claves OMITIDAS
#     outputs/salida.log el log
#     README.md          qué se lanzó · qué se preguntaba · qué se recogió
#
# El defecto que esto cierra está medido: la forma anterior escribía
# `<BG_DIR>/<nombre>.log` **plano**, y cinco trabajos de una sesión dejaron
# cinco `.log` sueltos en un directorio —sin manifiesto, sin fecha en el nombre,
# sin nada que dijera qué preguntaba cada uno— mientras dos ejecuciones del
# mismo nombre se pisaban. Es el mismo defecto que `workbench` ya resolvió para
# la evidencia, así que la familia lo REUSA (`run_id_for`, `REQUIRED_KEYS`) en
# vez de calcarlo.
#
# `BG_DIR` sigue ganando cuando se declara, y entonces vuelve a la forma plana:
# es lo que `build-logs.md` exige para una salida que se va a citar bajo
# `docs/build-logs/<slug>/`.
#
#   BG_DIR=/home/user/kaupamex-docs/build-logs/<slug> bg.sh start suite -- …
# =============================================================================
set -euo pipefail

# La forma PLANA se pide explicitamente con `--dir`; `BG_DIR` es su grafia
# HEREDADA. El literal vacio sigue siendo el discriminador: con hogar plano se
# escribe `<hogar>/<nombre>.log`, sin el nace un run de la familia `jobs`.
#
# Por que `--dir` y no solo la variable: `BG_DIR` no es el hogar de nada — es
# un argumento POR INVOCACION (`.../build-logs/<slug>`), y un slug cambia en
# cada llamada. El HOGAR bajo el que ese slug cuelga si es del consumidor, y
# ese si tiene constante: `THYROX_BACKGROUND_LOG_<CLONE>`, con
# `THYROX_BACKGROUND_LOG_DIR` como su grafia global. Un valor relativo se
# compone bajo el, un absoluto nombra un sitio concreto — la misma semantica de
# `resolve_home` que ya rige en `jobs` y en el banco.
#
# Medido antes de tocarlo: `BG_DIR` no lleva el prefijo `THYROX_`, asi que
# `verify/check_env_contract_keys.py` —que declara `PREFIX = "THYROX_"`— no la
# ve: ni la cuenta ni exige declararla. Era la unica ruta de hogar del arbol
# invisible a su propio gate de contrato.
BG_DIR="${BG_DIR:-}"

_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# El puente a la familia. Un solo sitio invoca Python: si el módulo no está, se
# rehúsa con su motivo en vez de caer a un hogar inventado — un default derivado
# por aritmética describe dónde vivía el archivo, no dónde corre.
_family() {
    PYTHONPATH="$_SRC_DIR" python3 -c "
import sys
from session import job_runs
op = sys.argv[1]
if op == 'home':
    print(job_runs.jobs_dir())
elif op == 'scaffold':
    # El cuarto argumento es el hogar PLANO, cuando lo hay. Vacio = el run
    # guarda sus salidas dentro, que es la forma por defecto.
    plano = sys.argv[4] if len(sys.argv) > 4 else ''
    print(job_runs.scaffold_run(job_runs.jobs_dir(), sys.argv[2],
                                command=sys.argv[3], flat_home=plano or None))
elif op == 'flat-home':
    print(job_runs.flat_home(sys.argv[2]))
elif op == 'latest':
    run = job_runs.latest_run(job_runs.jobs_dir(), sys.argv[2])
    print(run if run else '')
elif op == 'settle':
    job_runs.settle(sys.argv[2], int(sys.argv[3]))
elif op == 'log-home':
    # El hogar PLANO, resuelto por la familia THYROX_BACKGROUND_LOG_<CLONE>.
    # Un valor relativo se compone bajo el hogar del clon; uno absoluto nombra
    # un sitio concreto. Rehusar imprime vacio en stdout: quien llama decide si
    # eso es un error suyo. Sin comillas invertidas: este programa viaja dentro
    # de una cadena de shell entre comillas dobles, donde una comilla invertida
    # es sustitucion de comando y parte el guion.
    from pathlib import Path
    from session import background
    dado = sys.argv[2] if len(sys.argv) > 2 else ''
    if dado and Path(dado).is_absolute():
        print(dado)
    else:
        try:
            hogar = background.log_dir()
        except background.LogHomeError as err:
            print(err, file=sys.stderr)
        else:
            print(hogar / dado if dado else hogar)
" "$@"
}

# Cola con memoria: como `tail -N`, pero conserva lineas criticas (marcador ya
# retirado, FATAL, Traceback, resumen de pytest) que una ventana ciega
# descartaria — el defecto medido en `H-DOCS-155` («el `7 failed` existia y
# nadie lo vio»). Ver `src/session/log_tail.py`: es una adaptacion NATIVA del
# principio de SmartCrusher (headroom), no un port — el sustrato aqui es texto
# plano, no JSON con estadistica de campo.
_smart_tail() {
    local window="$1"
    PYTHONPATH="$_SRC_DIR" python3 -c "
import sys
from session.log_tail import smart_tail
out = smart_tail(sys.stdin.read(), int(sys.argv[1]))
out and print(out)
" "$window"
}

# Resuelve el hogar plano UNA vez, contra la familia. Idempotente: un valor ya
# absoluto vuelve igual, asi que llamarla desde `_paths` y desde `cmd_start` no
# lo compone dos veces.
_resolve_flat_home() {
    [[ -n "$BG_DIR" ]] || return 0
    local resuelto; resuelto="$(_family log-home "$BG_DIR")"
    [[ -n "$resuelto" ]] || {
        echo "bg.sh: hogar plano relativo '$BG_DIR' sin hogar declarado." >&2
        exit 2
    }
    BG_DIR="$resuelto"
}

_paths() {
    local name="$1"
    [[ -n "$name" ]] || { echo "bg.sh: falta <nombre>" >&2; exit 2; }
    _resolve_flat_home
    if [[ -n "$BG_DIR" ]]; then
        LOG="${BG_DIR}/${name}.log"
        PIDF="${BG_DIR}/${name}.pid"
        RUN=""
        return
    fi
    # La familia: el run MÁS RECIENTE de este slug. Dos ejecuciones del mismo
    # nombre ya no se pisan — conviven, y `wait` habla de la última.
    RUN="$(_family latest "$name")"
    [[ -n "$RUN" ]] || { LOG=""; PIDF=""; return; }
    # El run puede APUNTAR a un hogar plano en vez de guardar dentro. Es lo que
    # cierra TASK-THYROX-0052: quien lee no tiene que re-declarar el `--dir` con
    # que se lanzó. La composición es la MISMA que usa `cmd_start`, y por eso
    # vive aquí sola — dos sitios componiendo `<hogar>/<nombre>.log` es la
    # segunda fuente de verdad que ya costó este defecto.
    local plano; plano="$(_family flat-home "$RUN")"
    if [[ -n "$plano" ]]; then
        LOG="${plano}/${name}.log"
        PIDF="${plano}/${name}.pid"
        return
    fi
    LOG="${RUN}/outputs/salida.log"
    PIDF="${RUN}/outputs/pid"
}

# El marcador de salida. `wait` y `status` lo buscan en vez de adivinar por el
# PID: un PID muerto no distingue "termino bien" de "lo mataron".
_MARK='__BG_EXIT__='

# La gracia: cuanto espera `start` en primer plano antes de devolver el control
# dejando el trabajo vivo. Los dos valores salen de la referencia, no de una
# preferencia: `_references/claude-code-bin/2.1.266/claude_strings.txt` declara
# `var ggo=120000,hgo=600000` como el default y el maximo de
# BASH_DEFAULT_TIMEOUT_MS / BASH_MAX_TIMEOUT_MS.
_GRACE_DEFAULT=120
_GRACE_MAX=600
# El codigo con que `start` anuncia la democion. 124 ya significa «timeout» en
# coreutils y 125 no lo usa `timeout`. CIEGO A: un trabajo cuyo propio codigo de
# salida sea 125 es indistinguible POR CODIGO de una democion — el mensaje
# impreso si los separa, y `status` da el veredicto sin ambiguedad.
_RC_DEMOTED=125

cmd_start() {
    local name="$1"; shift
    local grace="$_GRACE_DEFAULT"
    while [[ "${1:-}" == --* ]]; do
        case "$1" in
            --grace) grace="${2:-}"; shift 2 ;;
            --dir)   BG_DIR="${2:-}"; shift 2 ;;
            --)      shift; break ;;
            *)       echo "bg.sh start: bandera desconocida '$1'" >&2; exit 2 ;;
        esac
    done
    [[ "$grace" =~ ^[0-9]+$ ]] || { echo "bg.sh start: --grace pide segundos" >&2; exit 2; }
    (( grace > _GRACE_MAX )) && grace="$_GRACE_MAX"
    [[ $# -gt 0 ]] || { echo "bg.sh start: falta el comando tras --" >&2; exit 2; }
    if [[ -n "$BG_DIR" ]]; then
        _paths "$name"
        mkdir -p "$BG_DIR"
        # El run-puntero. No mueve el log —sigue plano y citable— pero deja en
        # la familia de dónde colgarlo, que es lo único que al lector le
        # faltaba. Con él, `settle` también asienta el código de la forma
        # plana: antes no disparaba nunca ahí, porque no había run que asentar.
        RUN="$(_family scaffold "$name" "$*" "$BG_DIR")"
    else
        RUN="$(_family scaffold "$name" "$*")"
        LOG="${RUN}/outputs/salida.log"
        PIDF="${RUN}/outputs/pid"
    fi

    # `disown` evita que la shell trackee el job; el marcador se escribe SIEMPRE
    # (incluso si el comando falla) porque va tras el `;`, no tras un `&&`.
    #
    # `setsid` hace al trabajo LIDER de su propia sesion y grupo, que es la
    # precondicion de matarlo POR GRUPO (`kill -- -$pid`): sin ella, un trabajo
    # que forkea hijos deja huerfanos al vencer el timeout. Medido: un trabajo
    # con dos hijos deja 2 supervivientes si la senal va solo al lider, y 0 si
    # va al grupo. Es lo que `configure_process_group` hace en `pre_exec`
    # (smolvm guest-agent/src/exec.rs:71-82) y lo que `detached: true` da del
    # lado TypeScript (`shell/src/genericProcessUtils.ts`), que lo tenia hecho
    # mientras el lado bash no.
    #
    # `$!` SIGUE SIENDO el pid del trabajo, y no es casualidad: con el control
    # de trabajos apagado —lo normal en un guion no interactivo— el proceso de
    # fondo NO es lider de grupo, asi que `setsid` no bifurca y hace `exec`
    # directamente. El contrato de pid del que cuelga el ledger se preserva; el
    # control positivo lo mide exigiendo `pgid == pid`.
    nohup setsid bash -c "$(printf '%q ' "$@"); printf '%s%s\n' '$_MARK' \"\$?\"" \
        > "$LOG" 2>&1 &
    local pid=$!
    disown "$pid" 2>/dev/null || true
    printf '%s\n' "$pid" > "$PIDF"
    printf 'PID=%s\nLOG=%s\n' "$pid" "$LOG"
    [[ -n "${RUN:-}" ]] && printf 'RUN=%s\n' "$RUN"

    # El tercer desenlace. Sin el, quien llama tiene que decidir ANTES si el
    # comando es largo — y esa es justo la decision que no puede tomar: un
    # `pytest` de un archivo tarda segundos y el de un arbol, minutos.
    #
    # `grace=0` desactiva la espera: lanza y vuelve, que es la forma vieja.
    if (( grace > 0 )) && kill -0 "$pid" 2>/dev/null; then
        timeout "$grace" tail -f --pid="$pid" /dev/null || true
    fi
    if grep -q "^${_MARK}" "$LOG" 2>/dev/null; then
        local rc; rc="$(grep "^${_MARK}" "$LOG" | tail -1 | cut -d= -f2)"
        # `|| true`: cuando el log contiene SOLO el marcador, `grep -v` no
        # empareja nada y sale 1 — bajo `set -e` eso abortaba la funcion ANTES
        # del `return "$rc"`, y un trabajo que salio 7 se reportaba como 1. El
        # codigo de salida de un filtro de presentacion no es un veredicto.
        { grep -v "^${_MARK}" "$LOG" || true; } | _smart_tail 40
        return "$rc"
    fi
    (( grace > 0 )) || return 0
    printf '\n[bg.sh] %s SIGUE EN SEGUNDO PLANO tras %s s — el control vuelve.\n' \
        "$name" "$grace" >&2
    printf '[bg.sh] recogelo con: bg.sh wait %s\n' "$name" >&2
    return "$_RC_DEMOTED"
}

cmd_wait() {
    local name="$1"; local secs="${2:-$_GRACE_DEFAULT}"
    _paths "$name"
    [[ -f "$PIDF" ]] || { echo "bg.sh wait: no hay tarea '$name'" >&2; exit 2; }
    local pid; pid="$(cat "$PIDF")"

    # `tail -f --pid` (extension GNU) hace exit cuando el PID muere: la espera
    # la pone tail, no un `sleep` nuestro. `timeout` acota el peor caso.
    if kill -0 "$pid" 2>/dev/null; then
        timeout "$secs" tail -f --pid="$pid" /dev/null || true
    fi

    if grep -q "^${_MARK}" "$LOG" 2>/dev/null; then
        local rc; rc="$(grep "^${_MARK}" "$LOG" | tail -1 | cut -d= -f2)"
        # El marcador es ruido para quien lee la salida: se omite al mostrarla.
        # `|| true`: cuando el log contiene SOLO el marcador, `grep -v` no
        # empareja nada y sale 1 — bajo `set -e` eso abortaba la funcion ANTES
        # del `return "$rc"`, y un trabajo que salio 7 se reportaba como 1. El
        # codigo de salida de un filtro de presentacion no es un veredicto.
        { grep -v "^${_MARK}" "$LOG" || true; } | _smart_tail 40
        printf '\n[bg.sh] %s termino con exit=%s\n' "$name" "$rc"
        return "$rc"
    fi

    printf '[bg.sh] %s SIGUE CORRIENDO tras %s s (timeout, no fallo)\n' "$name" "$secs" >&2
    { cat "$LOG" 2>/dev/null || true; } | _smart_tail 20
    return 124
}

cmd_status() {
    local name="$1"; _paths "$name"
    # TERCER ESTADO. Sin log resuelto no hay nada que medir: el trabajo nunca
    # se lanzo con este nombre, o su familia desaparecio. Publicar `unknown`
    # aqui colapsaba ese caso con el de un trabajo REAL muerto sin marcador, y
    # manda a buscar un log que nunca existio. `wait` ya rehusaba asi; `status`
    # emitia un veredicto sobre una medicion que no ocurrio.
    if [[ -z "$LOG" ]]; then
        echo "bg.sh status: no hay tarea '$name' — nada que medir." >&2
        exit 2
    fi
    if grep -q "^${_MARK}" "$LOG" 2>/dev/null; then
        local code; code="$(grep "^${_MARK}" "$LOG" | tail -1 | cut -d= -f2)"
        # El manifiesto asienta el codigo: un lector no deberia tener que abrir
        # el log para saber si el trabajo termino bien. El marcador sigue siendo
        # la fuente —es lo que la barrera consume—; esto es su proyeccion.
        [[ -n "${RUN:-}" ]] && _family settle "$RUN" "$code" >/dev/null 2>&1 || true
        printf 'done:%s\n' "$code"
    elif [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
        echo running
    else
        # Ni marcador ni proceso: lo mataron o el log se perdio. NO es "done".
        echo unknown
    fi
}

# El patron REGEX que una linea de marcador de `bg.sh` cumple. Un solo sitio
# lo deriva de `_MARK`: escribirlo aparte, a mano, en la prosa de una regla es
# la forma exacta que `calibration-verified-numbers.md` prohibe para una CIFRA
# — aqui se extiende a una CADENA que vive en codigo. TASK-THYROX-0028.
cmd_marker_pattern() {
    printf '^%s[0-9]+\n' "$_MARK"
}

# Registra en la barrera de `wait-jobs.sh` un trabajo YA lanzado por
# `bg.sh start`, componiendo su `--marker` en vez de que el consumidor lo
# transcriba. `WAIT_JOBS` es el escape para un clon cuyo guion hermano viva en
# otro sitio; sin el se asume la ubicacion canonica junto a este archivo, y si
# tampoco esta ahi se rehusa en vez de inventar una ruta.
cmd_register() {
    local name="${1:?uso: bg.sh register <nombre>}"
    _paths "$name"
    [[ -f "$PIDF" ]] || {
        echo "bg.sh register: no hay tarea '$name' — llama primero a 'start'" >&2
        exit 2
    }
    local pid; pid="$(cat "$PIDF")"
    local wait_jobs="${WAIT_JOBS:-${_SRC_DIR}/session/wait-jobs.sh}"
    [[ -r "$wait_jobs" ]] || {
        echo "bg.sh register: no encuentro wait-jobs.sh en '$wait_jobs' (fija WAIT_JOBS)" >&2
        exit 2
    }
    bash "$wait_jobs" register "$name" "$LOG" "$pid" --marker "$(cmd_marker_pattern)"
}

cmd_log() { _paths "$1"; printf '%s\n' "$LOG"; }

case "${1:-}" in
    start)          shift; cmd_start "$@" ;;
    wait)           shift; cmd_wait "$@" ;;
    status)         shift; cmd_status "$@" ;;
    log)            shift; cmd_log "$@" ;;
    marker-pattern) shift; cmd_marker_pattern "$@" ;;
    register)       shift; cmd_register "$@" ;;
    *)      sed -n '/^# Uso/,/^# Donde/p;/^# Dónde/,/^# ====/p' "$0" | sed 's/^# \{0,1\}//'
            exit 2 ;;
esac
