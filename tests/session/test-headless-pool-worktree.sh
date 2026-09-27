#!/usr/bin/env bash
# Suite de headless-pool --isolation worktree y de pool_integrate: cada ítem
# implementa en su propio worktree, se verifica ahí, deja su parche y su
# veredicto, y la integración aplica al árbol principal sólo lo verificado y
# disjunto, declarando cada conflicto.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POOL="${HEADLESS_POOL_MODULE:-$RAIZ/src/session/headless-pool.sh}"
INTEGRATE="${POOL_INTEGRATE_MODULE:-$RAIZ/src/session/pool_integrate.sh}"
export HEADLESS_POOL_ITEM_WORKTREE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
fallos=0; total=0
check() {
    local label="$1" obtained="$2" expected="$3"
    total=$((total + 1))
    if [[ "$obtained" == "$expected" ]]; then echo "  ok    $label"
    else echo "  FALLA $label: esperado «$expected», obtenido «$obtained»"; fallos=$((fallos + 1)); fi
}

F="$RAIZ/.claude/cache/test-headless-pool-worktree/$$"
mkdir -p "$F"
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}"; rmdir "$RAIZ/.claude/cache/test-headless-pool-worktree" 2>/dev/null || true' EXIT

# El doble: la última línea es «Item: <verbo> <archivo> [texto]». `escribe`
# crea el archivo en su directorio de trabajo, `nada` no toca nada y `falla`
# sale 1. Registra las herramientas recibidas.
cat > "$F/runner" <<'SH'
#!/usr/bin/env bash
entrada="$(cat)"; tools=""
while [[ $# -gt 0 ]]; do case "$1" in --tools) tools="$2"; shift 2 ;; *) shift ;; esac; done
printf '%s\n' "$tools" > "$TOOLS_LOG"
read -r _ verbo archivo texto <<< "$(printf '%s\n' "$entrada" | tail -1)"
case "$verbo" in
  escribe) printf '%s\n' "${texto:-hola}" > "$archivo" ;;
  falla) exit 1 ;;
esac
jq -cn '{type:"result",result:"hecho"}'
SH
chmod +x "$F/runner"
export HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/sin-time" TOOLS_LOG="$F/tools.log"
export HEADLESS_POOL_HISTORY_DIR="$F/hist"
printf 'Implementa.\n' > "$F/prompt.md"

git init -q "$F/repo" && git -C "$F/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
pool() { (cd "$F/repo" && bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 --isolation worktree "$@" 2>&1); }

echo "caso 1 — cada ítem escribe en su worktree; el árbol principal no cambia"
salida="$(printf '%s\n' 'escribe a.txt' 'escribe b.txt' 'nada x' 'escribe bad.txt' 'falla y' 'escribe a.txt otro' \
  | pool --out "$F/out" --verify 'test ! -e bad.txt')"
check "el árbol principal sigue limpio" "$(git -C "$F/repo" status --porcelain | wc -l)" "0"
check "sin worktrees de ítem al terminar" "$(git -C "$F/repo" worktree list | wc -l)" "1"
check "veredictos en orden" "$(for n in 1 2 3 4 5 6; do tr -d '\n' < "$F/out/$n.verdict"; printf ' '; done)" \
  "verificado verificado sin-cambios rechazado fallido verificado "
check "el parche nombra su archivo" "$(cat "$F/out/1.files")" "a.txt"
check "la línea de resumen cuenta los veredictos" \
  "$(printf '%s\n' "$salida" | grep -c '^verificados=3 rechazados=1 sin-cambios=1 fallidos=1$')" "1"
check "las herramientas por defecto escriben" "$(tr ',' '\n' < "$F/tools.log" | grep -cxE 'Edit|Write|Bash')" "3"

echo "caso 2 — la integración aplica lo verificado y disjunto, y declara el conflicto"
integracion="$(bash "$INTEGRATE" "$F/out" --repo "$F/repo" 2>&1)"; rc=$?
check "aplica a.txt con el texto del primero" "$(cat "$F/repo/a.txt")" "hola"
check "aplica b.txt" "$(test -f "$F/repo/b.txt" && echo si)" "si"
check "no aplica lo rechazado" "$(test -e "$F/repo/bad.txt" && echo si || echo no)" "no"
check "el sexto es conflicto con el primero" "$(gawk -F'\t' '$1 == 6 {print $2}' "$F/out/integration.tsv")" "conflicto: a.txt"
check "sale 1 si algo con cambios no se integró" "$rc" "1"
check "resume la integración" "$(printf '%s\n' "$integracion" | grep -c '^aplicados=2 conflictos=1 no-aplicables=0$')" "1"

echo "caso 3 — sin --verify el cambio queda sin verificar y no se aplica por defecto"
git -C "$F/repo" checkout -q -- . 2>/dev/null; git -C "$F/repo" clean -qfd
printf '%s\n' 'escribe c.txt' | pool --out "$F/out3" >/dev/null
check "veredicto sin-verificar" "$(cat "$F/out3/1.verdict")" "sin-verificar"
bash "$INTEGRATE" "$F/out3" --repo "$F/repo" >/dev/null 2>&1
check "no se aplica sin --unverified" "$(test -e "$F/repo/c.txt" && echo si || echo no)" "no"
bash "$INTEGRATE" "$F/out3" --repo "$F/repo" --unverified >/dev/null 2>&1
check "con --unverified se aplica" "$(test -e "$F/repo/c.txt" && echo si || echo no)" "si"

echo "caso 4 — rehúsa fuera de un árbol de git"
mkdir -p "$F/plain"
(cd "$F/plain" && export GIT_CEILING_DIRECTORIES="$F" && printf 'nada x\n' | bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 \
  --isolation worktree --out "$F/out4" >/dev/null 2>&1); check "sale 2" "$?" "2"
printf 'nada x\n' | (cd "$F/repo" && bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 \
  --isolation otra --out "$F/out5" >/dev/null 2>&1); check "un modo desconocido sale 2" "$?" "2"

echo "caso 5 — un worktree que quedó de la ejecución se retira al terminar el pool"
bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out6" 99 >/dev/null
printf '%s\n' 'nada x' | pool --out "$F/out6" --verify true >/dev/null
check "el pool deja sólo el árbol principal" "$(git -C "$F/repo" worktree list | wc -l)" "1"

echo "caso 6 — finalize retira el worktree del ítem en cuanto termina"
dir="$(bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out7" 1)"
mkdir -p "$F/out7"; printf 'x\n' > "$dir/nuevo.txt"
bash "$HEADLESS_POOL_ITEM_WORKTREE" finalize "$F/repo" "$dir" "$F/out7" 1 0 true
check "sin barrido, el worktree ya no está" \
  "$(git -C "$F/repo" worktree list | grep -c "pool-worktrees/$(printf '%s' "$F/out7" | sha1sum | cut -c1-12)/")" "0"
check "su parche nombra el archivo" "$(cat "$F/out7/1.files")" "nuevo.txt"

echo "test-headless-pool-worktree: $total aserciones — $((total - fallos)) ok, $fallos falla(s)"
[[ $fallos -eq 0 ]]
