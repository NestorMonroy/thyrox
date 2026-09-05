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
#   bg.sh start <nombre> -- <comando...>   lanza; imprime PID y ruta del log
#   bg.sh wait  <nombre> [segundos]        bloquea (default 1800 s)
#   bg.sh status <nombre>                  running | done:<exit> | unknown
#   bg.sh log   <nombre>                   imprime la ruta del log
#
# Dónde deja los logs
# --------------------
# `${BG_DIR:-${TMPDIR:-/tmp}/kaupamex-bg}`. **Si la salida se va a citar en un
# artefacto**, `build-logs.md` exige que el log exista como archivo bajo
# `docs/build-logs/<slug>/` — pasarlo explícito:
#
#   BG_DIR=/home/user/kaupamex-docs/build-logs/<slug> bg.sh start suite -- …
# =============================================================================
set -euo pipefail

BG_DIR="${BG_DIR:-${TMPDIR:-/tmp}/kaupamex-bg}"

_paths() {
    local name="$1"
    [[ -n "$name" ]] || { echo "bg.sh: falta <nombre>" >&2; exit 2; }
    LOG="${BG_DIR}/${name}.log"
    PIDF="${BG_DIR}/${name}.pid"
}

# El marcador de salida. `wait` y `status` lo buscan en vez de adivinar por el
# PID: un PID muerto no distingue "termino bien" de "lo mataron".
_MARK='__BG_EXIT__='

cmd_start() {
    local name="$1"; shift
    [[ "${1:-}" == "--" ]] && shift
    [[ $# -gt 0 ]] || { echo "bg.sh start: falta el comando tras --" >&2; exit 2; }
    _paths "$name"
    mkdir -p "$BG_DIR"

    # `disown` evita que la shell trackee el job; el marcador se escribe SIEMPRE
    # (incluso si el comando falla) porque va tras el `;`, no tras un `&&`.
    nohup bash -c "$(printf '%q ' "$@"); printf '%s%s\n' '$_MARK' \"\$?\"" \
        > "$LOG" 2>&1 &
    local pid=$!
    disown "$pid" 2>/dev/null || true
    printf '%s\n' "$pid" > "$PIDF"
    printf 'PID=%s\nLOG=%s\n' "$pid" "$LOG"
}

cmd_wait() {
    local name="$1"; local secs="${2:-1800}"
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
        grep -v "^${_MARK}" "$LOG" | tail -40
        printf '\n[bg.sh] %s termino con exit=%s\n' "$name" "$rc"
        return "$rc"
    fi

    printf '[bg.sh] %s SIGUE CORRIENDO tras %s s (timeout, no fallo)\n' "$name" "$secs" >&2
    tail -20 "$LOG" 2>/dev/null || true
    return 124
}

cmd_status() {
    local name="$1"; _paths "$name"
    if grep -q "^${_MARK}" "$LOG" 2>/dev/null; then
        printf 'done:%s\n' "$(grep "^${_MARK}" "$LOG" | tail -1 | cut -d= -f2)"
    elif [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
        echo running
    else
        # Ni marcador ni proceso: lo mataron o el log se perdio. NO es "done".
        echo unknown
    fi
}

cmd_log() { _paths "$1"; printf '%s\n' "$LOG"; }

case "${1:-}" in
    start)  shift; cmd_start "$@" ;;
    wait)   shift; cmd_wait "$@" ;;
    status) shift; cmd_status "$@" ;;
    log)    shift; cmd_log "$@" ;;
    *)      sed -n '/^# Uso/,/^# Donde/p;/^# Dónde/,/^# ====/p' "$0" | sed 's/^# \{0,1\}//'
            exit 2 ;;
esac
