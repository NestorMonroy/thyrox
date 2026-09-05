#!/bin/bash
# =============================================================================
# logging.sh — Funciones de logging — Kaupamex-doc
# =============================================================================
# Provee: log_header, log_step, log_success, log_info, log_warn,
#         log_error, log_fatal, start_timer, show_elapsed
# =============================================================================

if [[ -t 1 ]]; then
    _R="\033[0m"; _G="\033[0;32m"; _Y="\033[0;33m"
    _RED="\033[0;31m"; _C="\033[0;36m"; _B="\033[1m"
else
    _R=""; _G=""; _Y=""; _RED=""; _C=""; _B=""
fi

_TIMER_START=""

# -----------------------------------------------------------------------------
# Salida dual: pantalla (con color) + archivo logs/{script}-{ts-UTC}.log
# -----------------------------------------------------------------------------
# D-002: el nombre del script invocante se deduce de ${BASH_SOURCE[-1]}
#        (el script mas externo de la pila de sourcing). Fallback "script".
# D-004: ruta fijada UNA sola vez por proceso (variable de guarda) para
#        que todas las lineas vayan al mismo archivo aunque avance el ts.
if [ -z "${_LOG_FILE:-}" ]; then
    _src="${BASH_SOURCE[-1]:-}"
    if [ -n "$_src" ]; then
        _LOG_NAME="$(basename "$_src")"; _LOG_NAME="${_LOG_NAME%.*}"
    else
        _LOG_NAME="script"
    fi
    _LOG_DIR="$(git rev-parse --show-toplevel 2>/dev/null)/logs"
    [ -d "$(dirname "$_LOG_DIR")" ] || _LOG_DIR="./logs"
    mkdir -p "$_LOG_DIR" 2>/dev/null || true
    _LOG_FILE="${_LOG_DIR}/${_LOG_NAME}-$(date -u +%Y%m%dT%H%M%S).log"
    unset _src
fi

# D-003: anexa al archivo SIN secuencias ANSI (un log con \033[..] es
#        ilegible). Centralizado aqui para no duplicar en cada log_*.
_log_write() {
    [ -n "${_LOG_FILE:-}" ] || return 0
    printf '%s\n' "$1" >> "$_LOG_FILE" 2>/dev/null || true
}

log_header()  { echo -e "\n${_B}${_C}==> $1${_R}"; _log_write "==> $1"; }
log_step()    { echo -e "    ${_B}[$((++_STEP))]${_R} $1"; _log_write "    [$_STEP] $1"; }
log_success() { echo -e "    ${_G}[OK]${_R}  $1"; _log_write "    [OK]  $1"; }
log_info()    { echo -e "    ${_C}[..]${_R}  $1"; _log_write "    [..]  $1"; }
log_warn()    { echo -e "    ${_Y}[!!]${_R}  $1" >&2; _log_write "    [!!]  $1"; }
log_error()   { echo -e "    ${_RED}[EE]${_R}  $1" >&2; _log_write "    [EE]  $1"; }
log_fatal()   { echo -e "    ${_RED}[XX]${_R}  $1" >&2; _log_write "    [XX]  $1"; exit 1; }

start_timer() { _TIMER_START=$(date +%s); }
show_elapsed() {
    local end; end=$(date +%s)
    echo -e "\n${_B}Tiempo total: $((end - _TIMER_START))s${_R}"
    _log_write "Tiempo total: $((end - _TIMER_START))s"
}

_STEP=0
