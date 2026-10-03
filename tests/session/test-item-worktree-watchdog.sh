#!/usr/bin/env bash
# `item_worktree.sh finalize` con un `<n>.watchdog` (TASK-THYROX-0931, F7): un
# ítem que el vigilante detuvo —llamada idéntica repetida, la misma llamada
# reintentada, sin progreso— recibe `detenido`, aunque su parche pasara el
# verify: lo que dejó en el worktree es el estado de un worker que giraba, no
# un resultado. El motivo queda en el `.err` del ítem.
#
# Qué haría fallar a esta suite: que finalize ignore el informe, o que un
# informe vacío o ausente cambie el veredicto de siempre.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$ROOT/src/session/item_worktree.sh}"
failures=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; failures=$((failures + 1)); fi
}
mkdir -p "$HOME/.cache"
F="$(mktemp -d "$HOME/.cache/thyrox-watchdog-test.XXXXXX")"
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}"' EXIT
REPO="$F/repo"
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base

# @description Un ítem que escribe un archivo, con el informe del vigilante dado.
# @stdout el veredicto que deja finalize.
verdict_of() {
    local n="$1" report="$2" dir="$F/wt-$1"
    git -C "$REPO" worktree add -q --detach "$dir" HEAD
    echo cambio > "$dir/a.txt"
    : > "$F/$n.err"
    [[ "$report" == absent ]] || printf '%s' "$report" > "$F/$n.watchdog"
    bash "$MODULE" finalize "$REPO" "$dir" "$F" "$n" 0 "true" >/dev/null 2>&1
    cat "$F/$n.verdict"
}

check "detenido por llamada idéntica: detenido aunque el verify pase" "$(verdict_of 1 $'identical-tool-call\t3 consecutivas: Bash\n')" "detenido"
check "el motivo queda en el .err del ítem" "$(grep -c 'identical-tool-call' "$F/1.err")" "1"
check "sin informe: el veredicto de siempre" "$(verdict_of 2 absent)" "verificado"
check "informe vacío: no cuenta como detención" "$(verdict_of 3 '')" "verificado"

echo; echo "$((total - failures)) ok, $failures falla(s) (alcance medido: item_worktree finalize con vigilante)"
[[ $failures -eq 0 ]]
