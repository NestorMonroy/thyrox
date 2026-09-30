#!/usr/bin/env bash
# El worktree de un ítem de headless-pool: se prepara desde HEAD bajo el
# directorio común de git —fuera del árbol, nunca versionado—, el ítem
# implementa en él, y al terminar deja en la salida del pool su parche, sus
# archivos y su veredicto, y el worktree se retira.
#
# Uso:
#   item_worktree.sh prepare  REPO OUT N          -> imprime el directorio
#   item_worktree.sh finalize REPO DIR OUT N RC [VERIFY]
#   item_worktree.sh sweep    REPO OUT            -> retira los que queden
#
# Veredictos: `fallido` (el ítem salió con error), `sin-cambios` (diff vacío),
# `verificado` / `rechazado` (VERIFY salió 0 / con error, corrido en el
# worktree) y `sin-verificar` (hubo cambios y no se declaró VERIFY).
set -uo pipefail

run_dir() {
    local repo="$1" out="$2" common
    common="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)" || return 2
    printf '%s/pool-worktrees/%s\n' "$common" "$(printf '%s' "$out" | sha1sum | cut -c1-12)"
}

# Los worktrees de un mismo repositorio comparten sus metadatos: con varios
# ítems a la vez, `worktree add` y `worktree remove` pueden chocar con el
# candado de otro y fallar sin que nada esté mal. Se reintentan.
with_retries() {
    local attempt
    for attempt in 1 2 3 4 5; do
        "$@" >/dev/null 2>&1 && return 0
        sleep "0.$attempt"
    done
    return 1
}

# `worktree add` en un árbol grande retiene el candado de git durante
# segundos: con varios ítems a la vez, unos pocos reintentos cortos se agotan.
# Los ítems de una misma ejecución se turnan con un candado propio mientras
# dura el alta; los reintentos quedan para el choque con un escritor ajeno.
prepare() {
    local repo="$1" out="$2" n="$3" base dir
    base="$(run_dir "$repo" "$out")" || return 2
    dir="$base/$n"
    mkdir -p "$base" || return 2
    (
        flock 9 || exit 2
        with_retries git -C "$repo" worktree add -q --detach "$dir" HEAD
    ) 9> "$base.lock" || return 2
    printf '%s\n' "$dir"
}

# Retira los worktrees que queden bajo la ejecución de OUT, aunque un
# `finalize` no haya podido hacerlo.
sweep() {
    local repo="$1" out="$2" base path
    base="$(run_dir "$repo" "$out")" || return 2
    git -C "$repo" worktree list --porcelain | gawk '/^worktree /{print substr($0, 10)}' \
        | while read -r path; do
            [[ "$path" == "$base"/* ]] && with_retries git -C "$repo" worktree remove --force "$path"
        done
    git -C "$repo" worktree prune
}

finalize() {
    local repo="$1" dir="$2" out="$3" n="$4" rc="$5" verify="${6:-}" verdict
    git -C "$dir" add -A
    git -C "$dir" diff --cached --binary HEAD > "$out/$n.patch"
    git -C "$dir" diff --cached --name-only HEAD > "$out/$n.files"
    if [[ "$rc" -ne 0 ]]; then
        verdict=fallido
    elif [[ ! -s "$out/$n.patch" ]]; then
        verdict=sin-cambios
    elif [[ -z "$verify" ]]; then
        verdict=sin-verificar
    elif (cd "$dir" && bash -c "$verify") > "$out/$n.verify.log" 2>&1; then
        verdict=verificado
    else
        verdict=rechazado
    fi
    printf '%s\n' "$verdict" > "$out/$n.verdict"
    with_retries git -C "$repo" worktree remove --force "$dir"
}

case "${1:-}" in
    prepare) shift; prepare "$@" ;;
    finalize) shift; finalize "$@" ;;
    sweep) shift; sweep "$@" ;;
    *) echo "item_worktree: uso: prepare|finalize|sweep …" >&2; exit 2 ;;
esac
