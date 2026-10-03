#!/usr/bin/env bash
# `item_worktree.sh finalize` bajo THYROX_POOL_LOCAL_ONLY=1 (TASK-THYROX-0930):
# un ítem cuyo `thyrox -p` no declaró servicio local —sin línea `served-by`, o
# con alguna `"local":false`— recibe `no-local`, aunque su parche pase el
# verify. Una respuesta que salió del anfitrión no es evidencia de
# autoimplementación local (H-THYROX-455).
#
# Qué haría fallar a esta suite: que el veredicto ignore el `.err` del ítem,
# que acepte un ítem sin declaración, o que el modo normal cambie.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$ROOT/src/session/item_worktree.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}
mkdir -p "$HOME/.cache"
F="$(mktemp -d "$HOME/.cache/thyrox-local-only-test.XXXXXX")"
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}"' EXIT
REPO="$F/repo"
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base

LOCAL='served-by {"model":"thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e","route":"launch-proxy","local":true}'
REMOTE='served-by {"model":"claude-sonnet-5","route":"own","local":false}'

# @description Un ítem que escribe un archivo, con su `.err` y el modo pedido.
# @stdout el veredicto que deja finalize.
verdict_of() {
    local n="$1" err="$2" local_only="$3" dir="$F/wt-$1"
    git -C "$REPO" worktree add -q --detach "$dir" HEAD
    echo cambio > "$dir/a.txt"
    printf '%s\n' "$err" > "$F/$n.err"
    THYROX_POOL_LOCAL_ONLY="$local_only" bash "$MODULE" finalize "$REPO" "$dir" "$F" "$n" 0 "true" >/dev/null 2>&1
    cat "$F/$n.verdict"
}

check "local-only, servido en local: verificado" "$(verdict_of 1 "$LOCAL" 1)" "verificado"
check "local-only, servido fuera del anfitrión: no-local" "$(verdict_of 2 "$LOCAL
$REMOTE" 1)" "no-local"
check "local-only, sin declaración de servicio: no-local" "$(verdict_of 3 "otra salida" 1)" "no-local"
check "modo normal, servido fuera: el veredicto de siempre" "$(verdict_of 4 "$REMOTE" "")" "verificado"

echo; echo "$((total - failures)) ok, $failures falla(s) (alcance medido: item_worktree finalize bajo local-only)"
[[ $failures -eq 0 ]]
