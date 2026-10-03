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
#   item_worktree.sh link-shared REPO DIR         -> enlaza node_modules, .venv…
#
# Veredictos: `fallido` (el ítem salió con error), `sin-cambios` (diff vacío),
# `verificado` / `rechazado` (VERIFY salió 0 / con error, corrido en el
# worktree), `sin-verificar` (hubo cambios y no se declaró VERIFY),
# `con-stash` (el ítem intentó `git stash`; ver `item_git_guard/git`) y, bajo
# THYROX_POOL_LOCAL_ONLY=1, `no-local` (su `thyrox -p` no declaró servicio local).
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
# La CLI del ciclo de vida se resuelve por `bin/` del proveedor, no por este
# archivo, que el pool corre desde su copia congelada.
LIFECYCLE_BIN="${ITEM_WORKTREE_LIFECYCLE:-${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/bin/pool_lifecycle}"

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

# Directorios que el checkout no trae y el verify necesita. Un worktree es un
# checkout de git: `node_modules/`, `.venv/` y `dist/` están en `.gitignore` y
# no llegan. Como el worktree vive DENTRO del árbol principal, la resolución de
# Node asciende hasta el `node_modules` del principal y tipa contra el código
# del principal, no del ítem (H-THYROX-287: «repl: 0 -> 28»); y `bin/*` sin
# `.venv` cae al python del sistema avisando por stderr. Es el
# `worktree.symlinkDirectories` de la referencia (2.1.283), con dos
# diferencias: hay valor por defecto, porque sin él el verify mide el árbol
# equivocado en silencio, y un enlace plano no basta para `node_modules` (ver
# `shadow_dir`). Nombres relativos a la raíz del repositorio, separados por
# espacios, con globs; vacío no enlaza nada; uno ausente se salta y se dice.
DEFAULT_LINK_NAMES="node_modules .venv src/packages/*/node_modules"
LINK_NAMES="${THYROX_ITEM_WORKTREE_LINK-$DEFAULT_LINK_NAMES}"
# Palabras sin expandir: un glob de la lista se resuelve contra la raíz del
# repositorio (`expand_link_pattern`), nunca contra el cwd de quien llama.
read -r -a LINK_PATTERNS <<< "$LINK_NAMES"
for name in "${LINK_PATTERNS[@]}"; do
    if [[ "$name" == /* || "/$name/" == */../* ]]; then
        echo "item_worktree: THYROX_ITEM_WORKTREE_LINK admite nombres relativos dentro del árbol, no: $name" >&2
        exit 2
    fi
done
# El archivo de exclusión del worktree. `node_modules/` con barra en
# `.gitignore` ignora un directorio, no un enlace del mismo nombre: sin esto
# `git add -A` de `finalize` metería los enlaces en el parche del ítem.
# `info/exclude` no sirve porque es común a todos los worktrees.
LINKS_EXCLUDE_FILE="pool-links-exclude"

# ¿Es LINK un enlace que sale de ROOT hacia dentro de TOP? Es la forma del
# enlace de workspace (`node_modules/@thyrox/x -> ../../src/packages/x`):
# copiado tal cual al worktree seguiría resolviendo en el principal, porque el
# sistema de archivos lo resuelve relativo al directorio REAL.
escapes_into_repo() {
    local link="$1" root="$2" top="$3" target
    target="$(realpath -m "$link")" || return 1
    [[ "$target" == "$top"/* && "$target" != "$root" && "$target" != "$root"/* ]]
}

# ¿Hay bajo DIR un enlace que sale de ROOT hacia dentro de TOP? Se baja por los
# subdirectorios REALES: el enlace de workspace vive un nivel dentro, en el
# directorio del ámbito (`node_modules/@thyrox/x`), no como hijo directo.
has_escaping_links() {
    local dir="$1" root="$2" top="$3" child
    for child in "$dir"/* "$dir"/.[!.]*; do
        if [[ -L "$child" ]]; then
            escapes_into_repo "$child" "$root" "$top" && return 0
        elif [[ -d "$child" ]]; then
            has_escaping_links "$child" "$root" "$top" && return 0
        fi
    done
    return 1
}

# La sombra de SRC en DST: cada hijo que es un enlace de workspace se vuelve a
# enlazar a la misma ruta relativa DENTRO del worktree; un subdirectorio real
# que contiene enlaces así (`@thyrox/`) se sombrea a su vez; todo lo demás se
# enlaza a su ruta real en el principal.
shadow_dir() {
    local src="$1" dst="$2" root="$3" top="$4" worktree="$5" child name target
    mkdir -p "$dst" || return 2
    for child in "$src"/* "$src"/.[!.]*; do
        [[ -e "$child" || -L "$child" ]] || continue
        name="${child##*/}"
        if [[ -L "$child" ]] && escapes_into_repo "$child" "$root" "$top"; then
            target="$(realpath -m "$child")" || return 2
            ln -s "$worktree/${target#"$top"/}" "$dst/$name" || return 2
        elif [[ -d "$child" && ! -L "$child" ]] && has_escaping_links "$child" "$root" "$top"; then
            shadow_dir "$child" "$dst/$name" "$root" "$top" "$worktree" || return 2
        else
            ln -s "$(realpath "$child")" "$dst/$name" || return 2
        fi
    done
}

# Un nombre: sombra si hace falta, enlace plano si no.
link_shared_dir() {
    local top="$1" worktree="$2" name="$3"
    local src="$top/$name" dst="$worktree/$name"
    [[ -e "$src" ]] || { echo "item_worktree: no se enlaza $name: no existe en el árbol principal" >&2; return 0; }
    [[ -e "$dst" || -L "$dst" ]] && return 0
    mkdir -p "${dst%/*}" || return 2
    if [[ -d "$src" && ! -L "$src" ]] && has_escaping_links "$src" "$src" "$top"; then
        shadow_dir "$src" "$dst" "$src" "$top" "$worktree"
    else
        ln -s "$src" "$dst"
    fi
}

# Los enlaces quedan fuera del índice del worktree por un `core.excludesFile`
# propio (`config --worktree`; `extensions.worktreeConfig` ya lo activa el
# sparse-checkout, y aquí se activa si falta).
exclude_links() {
    local worktree="$1" gitdir file name
    gitdir="$(git -C "$worktree" rev-parse --absolute-git-dir)" || return 2
    file="$gitdir/$LINKS_EXCLUDE_FILE"
    for name in "${@:2}"; do printf '/%s\n' "${name%/}"; done > "$file" || return 2
    git -C "$worktree" config --get extensions.worktreeConfig >/dev/null \
        || git -C "$worktree" config extensions.worktreeConfig true || return 2
    git -C "$worktree" config --worktree core.excludesFile "$file"
}

# link-shared REPO DIR: enlaza en DIR los nombres de LINK_NAMES desde la raíz
# de REPO. Idempotente: lo que ya está no se rehace.
link_shared_dirs() {
    local repo="$1" worktree="$2" top pattern name linked=()
    [[ "${#LINK_PATTERNS[@]}" -gt 0 ]] || return 0
    top="$(git -C "$repo" rev-parse --show-toplevel)" || return 2
    for pattern in "${LINK_PATTERNS[@]}"; do
        # Un nombre literal se enlaza aunque falte (y se dice); un glob sin
        # coincidencias no nombra nada.
        for name in $(expand_link_pattern "$top" "$pattern"); do
            link_shared_dir "$top" "$worktree" "$name" || return 2
            linked+=("$name")
        done
    done
    [[ "${#linked[@]}" -gt 0 ]] || return 0
    exclude_links "$worktree" "${linked[@]}"
}

expand_link_pattern() {
    local top="$1" pattern="$2"
    if [[ "$pattern" == *[*?]* ]]; then
        (cd "$top" && compgen -G "$pattern")
        return 0
    fi
    printf '%s\n' "$pattern"
}

# Patrones de sparse-checkout (modo no-cone): todo, menos cada hijo que los
# prefijos excluidos tienen en HEAD. El hijo que contiene OUT —el banco del
# propio pool— nunca se excluye: el verify del ítem llama a sus sondas por
# ruta relativa dentro del worktree.
sparse_patterns() {
    local repo="$1" out="$2" top pool_bench prefix
    top="$(git -C "$repo" rev-parse --show-toplevel)" || return 2
    pool_bench="$(realpath -m "$out")/"
    pool_bench="${pool_bench#"$top"/}"
    printf '/*\n'
    for prefix in $SPARSE_EXCLUDE; do
        git -C "$repo" ls-tree HEAD -- "${prefix%/}/" \
            | gawk -F'\t' -v keep="$pool_bench" '
                { split($1, meta, " "); child = $2 "/" }
                index(keep, child) == 1 { next }
                { print "!/" $2 (meta[2] == "tree" ? "/" : "") }'
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
    local repo="$1" dir="$2" out="$3"
    if [[ -z "$SPARSE_EXCLUDE" ]]; then
        with_retries git -C "$repo" worktree add -q --detach "$dir" HEAD
        return
    fi
    with_retries git -C "$repo" worktree add -q --no-checkout --detach "$dir" HEAD || return 1
    sparse_patterns "$repo" "$out" | git -C "$dir" sparse-checkout set --no-cone --stdin || return 1
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
        add_worktree "$repo" "$dir" "$out" || exit 2
    ) 9> "$root/.admission.lock" || return $?
    link_shared_dirs "$repo" "$dir" || return 2
    printf '%s\n' "$dir"
}

# ¿El ítem N es de la ejecución cuyo runtime es LIVE_DIR? Sin runtime no hay
# ejecución en curso que proteger: un `sweep` sin LIVE_DIR es el barrido manual
# del ejecutor, y retira todo lo que quede bajo la ejecución de OUT.
run_item() {
    local live_dir="$1" item="$2"
    [[ -n "$live_dir" && -f "$live_dir/index.tsv" ]] || return 1
    cut -f1 "$live_dir/index.tsv" | grep -qx -- "$item"
}

# sweep REPO OUT [LIVE_DIR]: retira los worktrees que queden bajo la ejecución
# de OUT. Con LIVE_DIR, sólo se conserva el worktree de un ítem de ESTA
# ejecución (una fila de su `index.tsv`) que aún no publicó su `<n>.closed`;
# un worktree ajeno a la ejecución es un resto y se retira.
sweep() {
    local repo="$1" out="$2" live_dir="${3:-}" base path item
    base="$(run_dir "$repo" "$out")" || return 2
    while read -r path; do
        [[ "$path" == "$base"/* ]] || continue
        # >>> sweep-closed-guard
        # El worktree de un ítem que no publicó su `<n>.closed` no se retira: es
        # lo único que conserva su trabajo hasta que `pool_lifecycle reconcile`
        # lo recupere, y puede pertenecer a un ítem que sigue vivo.
        item="${path##*/}"
        if run_item "$live_dir" "$item" && ! bash "$LIFECYCLE_BIN" is-closed "$out" "$item"; then
            echo "item_worktree: se conserva el worktree del ítem $item, sin cerrar: $path" >&2
            continue
        fi
        # <<< sweep-closed-guard
        with_retries git -C "$repo" worktree remove --force "$path"
    done < <(git -C "$repo" worktree list --porcelain | gawk '/^worktree /{print substr($0, 10)}')
    git -C "$repo" worktree prune
    # El directorio de la ejecución y su candado sobreviven al pool sólo si
    # queda un worktree conservado dentro.
    rmdir "$base" 2>/dev/null && rm -f "$base.lock"
    return 0
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

# @description ¿El `thyrox -p` del ítem declaró servicio local? Al menos una línea
# `served-by` con `"local":true` y ninguna con `"local":false` (TASK-THYROX-0930).
# @arg $1 string el `.err` del ítem.
served_locally() {
    local err="$1"
    grep -q '^served-by .*"local":true' "$err" 2>/dev/null && ! grep -q '^served-by .*"local":false' "$err"
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
    elif [[ "${THYROX_POOL_LOCAL_ONLY:-}" == 1 ]] && ! served_locally "$out/$n.err"; then
        # TASK-THYROX-0930: bajo --local-only, una respuesta que no se declaró
        # servida en el anfitrión no es evidencia, pase o no su verify.
        verdict=no-local
    elif [[ -s "$out/$n.watchdog" ]]; then
        # TASK-THYROX-0931 (F7): el vigilante detuvo un worker que giraba; lo
        # que dejó en el worktree no es un resultado, pase o no su verify.
        { printf 'vigilante: '; cat "$out/$n.watchdog"; } >> "$out/$n.err"
        verdict=detenido
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
    link-shared) shift; link_shared_dirs "$@" ;;
    checkout-bytes) shift; checkout_bytes "$@" ;;
    *) echo "item_worktree: uso: prepare|finalize|sweep|sweep-orphans|lock-path|link-shared|checkout-bytes …" >&2; exit 2 ;;
esac
