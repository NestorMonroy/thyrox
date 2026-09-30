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
#   item_worktree.sh sweep-orphans REPO           -> retira los de pools muertos
#   item_worktree.sh lock-path REPO OUT           -> candado de la ejecución
#
# Veredictos: `fallido` (el ítem salió con error), `sin-cambios` (diff vacío),
# `verificado` / `rechazado` (VERIFY salió 0 / con error, corrido en el
# worktree), `sin-verificar` (hubo cambios y no se declaró VERIFY) y
# `con-stash` (el ítem intentó `git stash`; ver `item_git_guard/git`).
#
# Un stash ajeno que aparece en refs/stash durante el intervalo del ítem —sin
# que el ítem lo haya intentado por el envoltorio— es una ANOMALÍA COMPARTIDA,
# no una atribución: se deja en `<out>/unexpected-stashes/` y el ítem que la
# observó deja `<n>.shared-stash-anomaly`, sin cambiar su veredicto. Lo que
# este mecanismo NO ve: un stash creado y retirado dentro del intervalo del
# ítem —ya no está en la pila al comparar en `finalize`— ni un
# `git stash create` sin `store`, que crea el commit sin tocar `refs/stash`.
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

# Checkout disperso. THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE nombra, separados por
# espacios, prefijos relativos a la raíz del repositorio cuyo contenido
# EXISTENTE en HEAD no se escribe en el worktree del ítem: en thyrox los bancos,
# los trabajos y el corpus del ejecutable son el 95 % del checkout y un ítem de
# implementación no los edita. Se excluyen los hijos que el prefijo tiene en
# HEAD, no el prefijo entero, para que lo que el ítem cree debajo (un banco
# nuevo) entre al parche. Lo que el ítem necesite leer de lo excluido lo lee
# del árbol principal. `git sparse-checkout` activa `extensions.worktreeConfig`
# en la configuración del repositorio; el árbol principal no queda disperso.
SPARSE_EXCLUDE="${THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE:-}"
for prefix in $SPARSE_EXCLUDE; do
    if [[ "$prefix" == /* || "/$prefix/" == */../* ]]; then
        echo "item_worktree: THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE admite prefijos relativos dentro del árbol, no: $prefix" >&2
        exit 2
    fi
done

# Patrones de sparse-checkout (modo no-cone): todo, menos cada hijo que los
# prefijos excluidos tienen en HEAD.
sparse_patterns() {
    local repo="$1" prefix
    printf '/*\n'
    for prefix in $SPARSE_EXCLUDE; do
        git -C "$repo" ls-tree HEAD -- "${prefix%/}/" \
            | gawk -F'\t' '{split($1, meta, " "); print "!/" $2 (meta[2] == "tree" ? "/" : "")}'
    done
}

checkout_bytes() {
    local repo="$1" total excluded=0 prefix
    total="$(git -C "$repo" ls-tree -r -l HEAD | gawk '$4 ~ /^[0-9]+$/ {s += $4} END {printf "%d\n", s}')" || return 2
    for prefix in $SPARSE_EXCLUDE; do
        excluded=$(( excluded + $(git -C "$repo" ls-tree -r -l HEAD -- "${prefix%/}/" \
            | gawk '$4 ~ /^[0-9]+$/ {s += $4} END {printf "%d\n", s}') ))
    done
    printf '%d\n' $(( total - excluded ))
}

# El alta del worktree: completo, o sin checkout y luego disperso.
add_worktree() {
    local repo="$1" dir="$2"
    if [[ -z "$SPARSE_EXCLUDE" ]]; then
        with_retries git -C "$repo" worktree add -q --detach "$dir" HEAD
        return
    fi
    with_retries git -C "$repo" worktree add -q --no-checkout --detach "$dir" HEAD || return 1
    sparse_patterns "$repo" | git -C "$dir" sparse-checkout set --no-cone --stdin || return 1
    git -C "$dir" checkout -q
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
# OUT identifica la ejecución —de él salen el directorio de sus worktrees y su
# candado—; los artefactos del ítem van a ARTIFACTS, que por defecto es OUT.
# `headless-pool` pasa como ARTIFACTS el runtime del ítem, que sólo llega a OUT
# al publicarse.
prepare() {
    local repo="$1" out="$2" n="$3" artifacts="${4:-$2}" base root dir
    base="$(run_dir "$repo" "$out")" || return 2
    root="${base%/*}"
    exclude_default_root "$repo" || return 2
    dir="$base/$n"
    mkdir -p "$base" "$artifacts" || return 2
    # La pila de stash y el instante de arranque, para que `finalize` pueda
    # distinguir una entrada nueva de una que ya estaba: `refs/stash` es
    # compartido entre todos los worktrees del repositorio.
    git -C "$repo" stash list --format=%H > "$artifacts/$n.stash-baseline" 2>/dev/null
    date -u +%Y-%m-%dT%H:%M:%SZ > "$artifacts/$n.stash-started"
    # El candado es de la raíz, no de la ejecución: la admisión por disco sólo
    # vale si ningún otro pool crea un worktree entre la medida y el alta.
    (
        flock 9 || exit 2
        admit_disk "$repo" "$root" || exit $?
        add_worktree "$repo" "$dir" || exit 2
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
    # Ni el directorio de la ejecución ni su candado sobreviven al pool.
    rmdir "$base" 2>/dev/null
    rm -f "$base.lock"
}

# El candado de la ejecución de OUT. El pool lo retiene toda su vida; mientras
# lo tenga, ningún barrido de huérfanos toca sus worktrees.
lock_path() {
    local base
    base="$(run_dir "$1" "$2")" || return 2
    printf '%s.lock\n' "$base"
}

# Un directorio de ejecución sigue en uso si algún proceso vivo tiene su
# directorio de trabajo dentro. Cubre al pool lanzado antes de que existiera
# el candado, cuyo ítem en curso trabaja con su cwd en el worktree.
run_dir_in_use() {
    local base="$1" cwd link
    for cwd in /proc/[0-9]*/cwd; do
        link="$(readlink "$cwd" 2>/dev/null)" || continue
        [[ "$link" == "$base" || "$link" == "$base"/* ]] && return 0
    done
    return 1
}

# Guarda como parche lo que el ítem dejó en su worktree sin entregar, porque
# el pool murió antes de su `finalize`. Imprime la ruta del parche.
salvage() {
    local dir="$1" target="$2"
    git -C "$dir" add -A || return 2
    git -C "$dir" diff --cached --quiet HEAD && return 0
    mkdir -p "${target%/*}" || return 2
    git -C "$dir" diff --cached --binary HEAD > "$target" || return 2
    printf 'salvado: %s\n' "$target"
}

# Retira los directorios de ejecución cuyo pool ya no vive: su candado está
# libre y ningún proceso trabaja dentro. Es lo que corre al arrancar una
# sesión, porque un pool que muere no llega a su `sweep`.
sweep_orphans() {
    local repo="$1" root base name path
    root="$(worktrees_root "$repo")" || return 2
    [[ -d "$root" ]] || return 0
    for base in "$root"/*/; do
        base="${base%/}"; name="${base##*/}"
        [[ "$name" =~ ^[0-9a-f]{12}$ ]] || continue
        (
            flock -n 9 || exit 0
            run_dir_in_use "$base" && exit 0
            git -C "$repo" worktree list --porcelain | gawk '/^worktree /{print substr($0, 10)}' \
                | while read -r path; do
                    [[ "$path" == "$base"/* ]] || continue
                    salvage "$path" "$root/salvaged/$name-${path##*/}.patch" || exit 2
                    with_retries git -C "$repo" worktree remove --force "$path" || exit 2
                done || exit 2
            git -C "$repo" worktree prune
            rm -rf "${base:?}" && rm -f "$base.lock"
        ) 9> "$base.lock" || return 2
    done
}

# Registra en `<out>/unexpected-stashes/` una entrada de refs/stash que
# apareció durante el intervalo de un ítem sin que ése la haya intentado por
# el envoltorio. Idempotente bajo un candado propio: si el parche ya existe
# sólo añade al ítem como observador, nunca vuelve a crearlo ni lo aplica.
record_unexpected_stash() {
    local repo="$1" out="$2" n="$3" hash="$4" message="$5"
    local dir="$out/unexpected-stashes" patch meta started ended
    mkdir -p "$dir" || return 2
    patch="$dir/$hash.patch"
    meta="$dir/$hash.meta"
    started="$(cat "$out/$n.stash-started" 2>/dev/null || echo desconocido)"
    ended="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    (
        flock 9
        if [[ ! -f "$patch" ]]; then
            git -C "$repo" stash show -p --binary "$hash" > "$patch" 2>/dev/null
            {
                printf 'hash: %s\n' "$hash"
                printf 'mensaje: %s\n' "$message"
                printf 'primer-item: %s\n' "$n"
            } > "$meta"
        fi
        grep -q "^item: $n intervalo:" "$meta" 2>/dev/null \
            || printf 'item: %s intervalo: %s-%s\n' "$n" "$started" "$ended" >> "$meta"
    ) 9> "$dir/.lock"
}

# Compara la pila de stash actual contra la observada al preparar el ítem
# (`<n>.stash-baseline`). Una entrada nueva es una ANOMALÍA COMPARTIDA del
# repositorio, no una atribución al ítem: se registra y se deja
# `<n>.shared-stash-anomaly`, sin tocar el veredicto.
check_shared_stash_anomaly() {
    local repo="$1" out="$2" n="$3"
    local baseline="$out/$n.stash-baseline" hash rest anomalies=()
    [[ -f "$baseline" ]] || return 0
    while IFS=' ' read -r hash rest; do
        [[ -n "$hash" ]] || continue
        gawk -v h="$hash" '$0 == h {found = 1} END {exit !found}' "$baseline" && continue
        anomalies+=("$hash")
        record_unexpected_stash "$repo" "$out" "$n" "$hash" "$rest"
    done < <(git -C "$repo" stash list --format='%H %gs' 2>/dev/null)
    [[ "${#anomalies[@]}" -gt 0 ]] && printf '%s\n' "${anomalies[@]}" > "$out/$n.shared-stash-anomaly"
    return 0
}

finalize() {
    local repo="$1" dir="$2" out="$3" n="$4" rc="$5" verify="${6:-}" verdict
    git -C "$dir" add -A
    git -C "$dir" diff --cached --binary HEAD > "$out/$n.patch"
    git -C "$dir" diff --cached --name-only HEAD > "$out/$n.files"
    check_shared_stash_anomaly "$repo" "$out" "$n"
    if [[ -s "$out/$n.stash-attempts" ]]; then
        # Precedencia sobre cualquier otro veredicto: el ítem intentó stashear
        # su trabajo, y eso es lo primero que hay que saber de él, gane o
        # pierda el resto de la evaluación.
        verdict=con-stash
    elif [[ "$rc" -ne 0 ]]; then
        verdict=fallido
    elif [[ ! -s "$out/$n.patch" ]]; then
        verdict=sin-cambios
    elif [[ -z "$verify" ]]; then
        verdict=sin-verificar
    # El verify corre en el worktree, y con SU codigo: THYROX_ROOT y
    # PYTHONPATH se reemplazan por los del worktree, no se conservan los del
    # arbol principal que el pool exporta. Sin este reemplazo, un modulo que
    # resuelve su codigo por THYROX_ROOT (p. ej. `paths/reach.py`) carga la
    # copia del arbol principal y el verify mide una mezcla de los dos
    # arboles en vez del worktree solo.
    #
    # Lo mismo con los cuatro hogares que el proveedor declara por variable de
    # entorno: THYROX_CACHE_DIR, THYROX_JOBS_DIR, THYROX_WORKBENCH_DIR y
    # THYROX_BACKGROUND_LOG_DIR. Medido (TASK-THYROX-0549): con un item en
    # marcha, el pool los exporta con la ruta del arbol PRINCIPAL a su propio
    # proceso, y sin reemplazo un verify que los use —bin/parallel_map,
    # bin/wait-jobs, un hallazgo— escribe ahi en vez de en el worktree. Se
    # reemplazan siempre por hogares dentro del worktree, aunque el verify no
    # los use: es mas barato que distinguir cual los necesita.
    elif (cd "$dir" && THYROX_ROOT="$dir" PYTHONPATH="$dir/src" \
              THYROX_CACHE_DIR="$dir/.claude/cache" \
              THYROX_JOBS_DIR="$dir/.claude/jobs" \
              THYROX_WORKBENCH_DIR="$dir/.claude/workbench" \
              THYROX_BACKGROUND_LOG_DIR="$dir/.claude/background-logs" \
              bash -c "$verify") > "$out/$n.verify.log" 2>&1; then
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
    sweep-orphans) shift; sweep_orphans "$@" ;;
    lock-path) shift; lock_path "$@" ;;
    checkout-bytes) shift; checkout_bytes "$@" ;;
    *) echo "item_worktree: uso: prepare|finalize|sweep|sweep-orphans|lock-path|checkout-bytes …" >&2; exit 2 ;;
esac
