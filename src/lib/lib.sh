#!/usr/bin/env bash
# lib.sh — utilidades compartidas de bash para .claude/scripts/**.
#
# Se hace `source`, no se ejecuta:
#
#     source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"
#
# Por qué existe, medido antes de escribirla sobre los 32 `.sh` de
# .claude/scripts: 12 resuelven la raíz del repositorio a mano, 8 lo hacen con
# `git rev-parse --show-toplevel`, 9 con una cadena de `../..` que depende de
# la profundidad del archivo, y 4 declaran su propia paleta de color. Cada
# copia es una oportunidad de divergir, y la cadena de `../..` divergió de
# verdad: la reorganización por subsistema de 2026-08-27 movió 80 guiones un
# nivel y rompió las 44 rutas relativas que había.
#
# Y es la forma que las referencias ejercen: `lib` aparece en 3 de los 5
# repositorios de agentes medidos, y en los tres dentro de `scripts/` —
# `agency-agents/scripts/lib.sh` lo dice en su cabecera: *"shared pure-bash
# helpers … Sourced, not executed"*.
#
# NO absorbe `deprecated.sh`: aquél es un mecanismo con nombre propio, su gate
# y sus pruebas. Ésta es la caja de herramientas.

# Rehúsa la ejecución directa. Sin este guard, `bash lib.sh` daría exit 0 sin
# hacer nada — un verde que no distingue «cargó» de «no hizo nada».
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    printf 'lib.sh es una librería: se hace `source`, no se ejecuta.\n' >&2
    printf '  uso: source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"\n' >&2
    exit 2
fi

# lib_repo_root — la raíz del repositorio, desde cualquier directorio.
#
# NO delega en `git rev-parse`: un clon con el .git ausente, un tarball o un
# worktree de agente siguen siendo el árbol y deben resolver igual. El
# marcador es `.claude/scripts/lib.sh` —esta misma librería—, que existe por
# construcción en todo árbol donde alguien la pueda cargar.
lib_repo_root() {
    local aqui
    aqui="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../.claude/scripts
    (cd "$aqui/../.." && pwd)
}

# lib_die <mensaje...> — a stderr y sale 1.
#
# stderr, no stdout: quien la llama suele emitir un artefacto por stdout y el
# mensaje lo corrompería.
lib_die() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

# lib_require <comando> [pista] — rehúsa si el comando no está.
#
# Emite el motivo y NO una cifra: un gate que muere por dependencia ausente y
# publica un 0 se lee como «sin defectos». Es la convención de guard que
# `redaccion-tecnica-es.md` fija para los guiones con librería externa.
lib_require() {
    local cmd="${1:?lib_require necesita un comando}" pista="${2:-}"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        printf 'ERROR: falta `%s`.%s\n' "$cmd" "${pista:+ $pista}" >&2
        printf '  NO se emite un conteo: un 0 aquí sería un verde falso.\n' >&2
        return 1
    fi
    return 0
}

# Paleta — vacía cuando la salida no es un terminal, para que un log o un
# archivo no se llene de escapes ANSI.
if [[ -t 1 ]]; then
    LIB_ROJO=$'\033[31m'; LIB_VERDE=$'\033[32m'
    LIB_AMBAR=$'\033[33m'; LIB_NEUTRO=$'\033[0m'
else
    LIB_ROJO=''; LIB_VERDE=''; LIB_AMBAR=''; LIB_NEUTRO=''
fi
readonly LIB_ROJO LIB_VERDE LIB_AMBAR LIB_NEUTRO

lib_ok()   { printf '%sOK%s   %s\n'   "$LIB_VERDE" "$LIB_NEUTRO" "$*"; }
lib_warn() { printf '%sWARN%s %s\n'   "$LIB_AMBAR" "$LIB_NEUTRO" "$*"; }
lib_fail() { printf '%sFALLA%s %s\n'  "$LIB_ROJO"  "$LIB_NEUTRO" "$*"; }
