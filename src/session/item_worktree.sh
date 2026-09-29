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

# El worktree de un ítem vive en `.thyrox/pool-worktrees/` de la raíz del
# repositorio, o bajo THYROX_POOL_WORKTREES_DIR. Nunca bajo un segmento `.git`,
# `.claude`, `.vscode` o `.idea`: el runner `claude -p` trata esas rutas como
# sensibles (DANGEROUS_DIRECTORIES, permission/src/filesystem.ts) y en modo -p
# rechaza cada Write y Edit del ítem sin poder pedir permiso.
DEFAULT_WORKTREES_SUBDIR=".thyrox/pool-worktrees"

worktrees_root() {
    local repo="$1" top
    if [[ -n "${THYROX_POOL_WORKTREES_DIR:-}" ]]; then
        printf '%s\n' "$THYROX_POOL_WORKTREES_DIR"
        return 0
    fi
    top="$(git -C "$repo" rev-parse --show-toplevel)" || return 2
    printf '%s/%s\n' "$top" "$DEFAULT_WORKTREES_SUBDIR"
}

# La raíz por defecto queda dentro del árbol: se excluye en `info/exclude`,
# que no se versiona, para que `git status` no la vea en ningún consumidor.
exclude_default_root() {
    local repo="$1" common pattern="/$DEFAULT_WORKTREES_SUBDIR/"
    [[ -n "${THYROX_POOL_WORKTREES_DIR:-}" ]] && return 0
    common="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)" || return 2
    mkdir -p "$common/info" || return 2
    gawk -v p="$pattern" '$0 == p {found = 1} END {exit !found}' "$common/info/exclude" 2>/dev/null \
        || printf '%s\n' "$pattern" >> "$common/info/exclude"
}

run_dir() {
    local repo="$1" out="$2" root
    root="$(worktrees_root "$repo")" || return 2
    if [[ "/$root/" =~ /(\.git|\.claude|\.vscode|\.idea)/ ]]; then
        echo "item_worktree: la raíz de worktrees tiene un segmento sensible para el runner: $root" >&2
        return 2
    fi
    printf '%s/%s\n' "$root" "$(printf '%s' "$out" | sha1sum | cut -c1-12)"
}

# Los worktrees de un mismo repositorio comparten sus metadatos: con varios
# ítems a la vez, `worktree add` y `worktree remove` pueden chocar con el
# candado de otro y fallar sin que nada esté mal. Un escritor ajeno —un commit
# con sus hooks— retiene ese candado minutos, así que se reintenta hasta un
# plazo (THYROX_ITEM_WORKTREE_RETRY_SECONDS, 300 por defecto) con espera
# creciente, y al agotarlo se entrega el último motivo de git por stderr.
RETRY_SECONDS="${THYROX_ITEM_WORKTREE_RETRY_SECONDS:-300}"
if [[ ! "$RETRY_SECONDS" =~ ^[0-9]+$ ]]; then
    echo "item_worktree: THYROX_ITEM_WORKTREE_RETRY_SECONDS va en segundos enteros, no: $RETRY_SECONDS" >&2
    exit 2
fi

# Admisión por disco. Cada worktree es una copia del árbol, y varios pools a la
# vez pueden agotar la asignación de disco de la sesión: un ítem ve entonces
# desaparecer su directorio de trabajo y el pool muere sin veredicto. Antes de
# crear el worktree se mide lo libre contra lo que ocupará el checkout (la suma
# de los blobs de HEAD, con margen para lo que el ítem escriba) más una reserva
# para el resto de escritores. Si no cabe se espera, porque otro ítem puede
# terminar y liberar el suyo, y al vencer el plazo se rehúsa con exit 3.
DISK_RESERVE_MB="${THYROX_ITEM_WORKTREE_DISK_RESERVE_MB:-1024}"
DISK_WAIT_SECONDS="${THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS:-600}"
CHECKOUT_MARGIN_PERCENT=125
DISK_POLL_SECONDS=5
EXIT_NOT_ADMITTED=3
if [[ ! "$DISK_RESERVE_MB" =~ ^[0-9]+$ ]]; then
    echo "item_worktree: THYROX_ITEM_WORKTREE_DISK_RESERVE_MB va en MiB enteros, no: $DISK_RESERVE_MB" >&2
    exit 2
fi
if [[ ! "$DISK_WAIT_SECONDS" =~ ^[0-9]+$ ]]; then
    echo "item_worktree: THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS va en segundos enteros, no: $DISK_WAIT_SECONDS" >&2
    exit 2
fi

checkout_bytes() {
    git -C "$1" ls-tree -r -l HEAD | gawk '$4 ~ /^[0-9]+$/ {s += $4} END {printf "%d\n", s}'
}

free_bytes() {
    df -B1 --output=avail "$1" | gawk 'NR == 2 {print $1}'
}

admit_disk() {
    local repo="$1" root="$2" checkout needed free deadline
    checkout="$(checkout_bytes "$repo")" || return 2
    needed=$(( checkout * CHECKOUT_MARGIN_PERCENT / 100 + DISK_RESERVE_MB * 1048576 ))
    deadline=$((SECONDS + DISK_WAIT_SECONDS))
    while true; do
        free="$(free_bytes "$root")" || return 2
        (( free >= needed )) && return 0
        if (( SECONDS >= deadline )); then
            printf 'item_worktree: no hay disco para el worktree: libres %d MiB, hacen falta %d MiB (checkout %d MiB con margen, reserva %d MiB)\n' \
                $((free / 1048576)) $((needed / 1048576)) $((checkout * CHECKOUT_MARGIN_PERCENT / 100 / 1048576)) "$DISK_RESERVE_MB" >&2
            return "$EXIT_NOT_ADMITTED"
        fi
        sleep "$DISK_POLL_SECONDS"
    done
}

with_retries() {
    local deadline=$((SECONDS + RETRY_SECONDS)) pause=1 reason
    while true; do
        reason="$("$@" 2>&1 >/dev/null)" && return 0
        if (( SECONDS >= deadline )); then
            printf '%s\n' "$reason" >&2
            return 1
        fi
        sleep "$pause"
        (( pause < 8 )) && pause=$((pause * 2))
    done
}

# `worktree add` en un árbol grande retiene el candado de git durante
# segundos: con varios ítems a la vez, unos pocos reintentos cortos se agotan.
# Los ítems de una misma ejecución se turnan con un candado propio mientras
# dura el alta; los reintentos quedan para el choque con un escritor ajeno.
prepare() {
    local repo="$1" out="$2" n="$3" base root dir
    base="$(run_dir "$repo" "$out")" || return 2
    root="${base%/*}"
    exclude_default_root "$repo" || return 2
    dir="$base/$n"
    mkdir -p "$base" || return 2
    # El candado es de la raíz, no de la ejecución: la admisión por disco sólo
    # vale si ningún otro pool crea un worktree entre la medida y el alta.
    (
        flock 9 || exit 2
        admit_disk "$repo" "$root" || exit $?
        with_retries git -C "$repo" worktree add -q --detach "$dir" HEAD || exit 2
    ) 9> "$root/.admission.lock" || return $?
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
