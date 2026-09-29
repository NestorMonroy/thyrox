#!/usr/bin/env bash
# Suite de item_worktree.sh prepare bajo concurrencia: varios ítems de un pool
# preparan su worktree a la vez sobre el mismo repositorio. En un árbol grande
# `git worktree add` retiene el candado de git durante segundos, y unos pocos
# reintentos cortos se agotan: medido en
# .claude/workbench/fast-mode-pool-20260928T231138/outputs-claude, donde dos
# de tres ítems salieron con «no se pudo preparar el worktree del item».
#
# El `git` falso delega en el real salvo `worktree add`: ése toma un candado
# propio durante 2 s y falla si otro ya lo tiene, como el candado de git.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
fallos=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; fallos=$((fallos + 1)); fi
}

F="$RAIZ/.claude/cache/test-item-worktree-lock/$$"
mkdir -p "$F/bin"
# Los worktrees no pueden colgar de `.claude/`: el runner trataría la ruta
# como sensible. La suite les da una raíz propia en la caché del usuario.
mkdir -p "$HOME/.cache"
THYROX_POOL_WORKTREES_DIR="$(mktemp -d "$HOME/.cache/thyrox-worktrees-test.XXXXXX")"
export THYROX_POOL_WORKTREES_DIR
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}" "${THYROX_POOL_WORKTREES_DIR:?}"; rmdir "$RAIZ/.claude/cache/test-item-worktree-lock" 2>/dev/null || true' EXIT
REAL_GIT="$(command -v git)"
cat > "$F/bin/git" <<SH
#!/usr/bin/env bash
if [[ " \$* " == *" worktree add "* ]]; then
    if ! mkdir "$F/git-lock" 2>/dev/null; then
        echo "fatal: Unable to create '.git/worktrees.lock': File exists." >&2; exit 128
    fi
    sleep 2
    "$REAL_GIT" "\$@"; rc=\$?
    rmdir "$F/git-lock"; exit \$rc
fi
exec "$REAL_GIT" "\$@"
SH
chmod +x "$F/bin/git"
git init -q "$F/repo" && git -C "$F/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
mkdir -p "$F/out"

echo "caso 1 — tres prepares a la vez sobre el mismo repositorio terminan los tres"
for n in 1 2 3; do
    (PATH="$F/bin:$PATH" bash "$MODULE" prepare "$F/repo" "$F/out" "$n" > "$F/dir-$n" 2> "$F/err-$n"; echo $? > "$F/rc-$n") &
done
wait
check "los tres salen 0" "$(cat "$F/rc-1" "$F/rc-2" "$F/rc-3" | tr -d '\n')" "000"
check "tres worktrees de ítem más el principal" "$(git -C "$F/repo" worktree list | wc -l)" "4"
check "cada uno nombra su directorio" "$(for n in 1 2 3; do test -d "$(cat "$F/dir-$n")" && printf si; done)" "sisisi"

echo "caso 2 — un escritor ajeno retiene el candado 4 s y el alta espera en vez de rendirse"
mkdir "$F/git-lock"
(sleep 4; rmdir "$F/git-lock") &
holder=$!
PATH="$F/bin:$PATH" bash "$MODULE" prepare "$F/repo" "$F/out2" 1 > /dev/null 2> "$F/err-alien"; rc_alien=$?
wait "$holder"
check "el alta sale 0 tras el escritor ajeno" "$rc_alien" "0"

echo "caso 3 — agotado el plazo, el alta rehúsa y dice por qué"
mkdir "$F/git-lock"
THYROX_ITEM_WORKTREE_RETRY_SECONDS=1 PATH="$F/bin:$PATH" bash "$MODULE" prepare "$F/repo" "$F/out3" 1 > /dev/null 2> "$F/err-deadline"; rc_deadline=$?
rmdir "$F/git-lock"
check "sale distinto de 0" "$([[ $rc_deadline -ne 0 ]] && echo si || echo no)" "si"
check "el stderr trae el motivo de git" "$(gawk '/Unable to create/{n++} END{print n+0}' "$F/err-deadline")" "1"
check "THYROX_ITEM_WORKTREE_RETRY_SECONDS inválida se rechaza" \
    "$(THYROX_ITEM_WORKTREE_RETRY_SECONDS=x bash "$MODULE" prepare "$F/repo" "$F/out4" 1 >/dev/null 2>&1; echo $?)" "2"

echo "item_worktree lock: $((total - fallos))/$total"
[[ "$fallos" -eq 0 ]]
