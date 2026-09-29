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
export ITEM_WORKTREE_REAL="$HEADLESS_POOL_ITEM_WORKTREE"
failures=0; total=0
check() {
    local label="$1" obtained="$2" expected="$3"
    total=$((total + 1))
    if [[ "$obtained" == "$expected" ]]; then echo "  ok    $label"
    else echo "  FALLA $label: esperado «$expected», obtenido «$obtained»"; failures=$((failures + 1)); fi
}

F="$RAIZ/.claude/cache/test-headless-pool-worktree/$$"
mkdir -p "$F"
# Los worktrees no pueden colgar de `.claude/`: el runner trataría la ruta
# como sensible. La suite les da una raíz propia en la caché del usuario.
mkdir -p "$HOME/.cache"
THYROX_POOL_WORKTREES_DIR="$(mktemp -d "$HOME/.cache/thyrox-worktrees-test.XXXXXX")"
export THYROX_POOL_WORKTREES_DIR
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}" "${THYROX_POOL_WORKTREES_DIR:?}"; rmdir "$RAIZ/.claude/cache/test-headless-pool-worktree" 2>/dev/null || true' EXIT

# El doble: la última línea es «Item: <verb> <path> [text]». `write`
# crea el archivo en su directorio de trabajo, `noop` no toca nada y `fail`
# sale 1. Registra las herramientas recibidas.
cat > "$F/runner" <<'SH'
#!/usr/bin/env bash
input="$(cat)"; tools=""
while [[ $# -gt 0 ]]; do case "$1" in --tools) tools="$2"; shift 2 ;; *) shift ;; esac; done
printf '%s\n' "$tools" > "$TOOLS_LOG"
read -r _ verb path text <<< "$(printf '%s\n' "$input" | tail -1)"
case "$verb" in
  write) printf '%s\n' "${text:-hola}" > "$path" ;;
  fail) exit 1 ;;
  # Como un ítem real bajo `bin/cli`: hereda THYROX_ROOT del árbol principal y
  # lanza un trabajo con thyrox-bg.
  launch) THYROX_ROOT="$MAIN_ROOT" bash "$MAIN_ROOT/bin/thyrox-bg" start "$path" --grace 0 -- true >/dev/null ;;
  # Sale 1 si el candado de la ejecución está tomado, que es lo que protege
  # los worktrees del pool de un barrido de huérfanos.
  probe-lock) lock="$(bash "$HEADLESS_POOL_ITEM_WORKTREE" lock-path "$HP_WORKDIR" "$HP_OUT")"
              flock -n "$lock" true; printf '%s\n' "$?" > "$PROBE_LOG" ;;
esac
jq -cn '{type:"result",result:"hecho"}'
SH
chmod +x "$F/runner"
export HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" TOOLS_LOG="$F/tools.log"
export HEADLESS_POOL_HISTORY_DIR="$F/hist" MAIN_ROOT="$RAIZ" THYROX_RUNTIME_DIR="$F/runtime"
printf 'Implementa.\n' > "$F/prompt.md"

git init -q "$F/repo" && git -C "$F/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
pool() { (cd "$F/repo" && bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 --isolation worktree "$@" 2>&1); }

echo "caso 1 — cada ítem escribe en su worktree; el árbol principal no cambia"
output="$(printf '%s\n' 'write a.txt' 'write b.txt' 'noop x' 'write bad.txt' 'fail y' 'write a.txt otro' \
  | pool --out "$F/out" --verify 'test ! -e bad.txt')"
check "el árbol principal sigue limpio" "$(git -C "$F/repo" status --porcelain | wc -l)" "0"
check "sin worktrees de ítem al terminar" "$(git -C "$F/repo" worktree list | wc -l)" "1"
check "veredictos en orden" "$(for n in 1 2 3 4 5 6; do tr -d '\n' < "$F/out/$n.verdict"; printf ' '; done)" \
  "verificado verificado sin-cambios rechazado fallido verificado "
check "el parche nombra su archivo" "$(cat "$F/out/1.files")" "a.txt"
check "la línea de resumen cuenta los veredictos" \
  "$(printf '%s\n' "$output" | grep -c '^verificados=3 rechazados=1 sin-cambios=1 fallidos=1$')" "1"
# Las operaciones de archivo van por Bash (operaciones-de-archivo-con-bash.md):
# si el pool ofrece Edit/Write, el ítem los usa en vez de sed, gawk o
# bin/replace_literal.
check "el ítem escribe por Bash" "$(tr ',' '\n' < "$F/tools.log" | grep -cx 'Bash')" "1"
check "sin herramientas dedicadas de escritura" "$(tr ',' '\n' < "$F/tools.log" | grep -cxE 'Edit|Write')" "0"

echo "caso 2 — la integración aplica lo verificado y disjunto, y declara el conflicto"
integration="$(bash "$INTEGRATE" "$F/out" --repo "$F/repo" 2>&1)"; rc=$?
check "aplica a.txt con el texto del primero" "$(cat "$F/repo/a.txt")" "hola"
check "aplica b.txt" "$(test -f "$F/repo/b.txt" && echo si)" "si"
check "no aplica lo rechazado" "$(test -e "$F/repo/bad.txt" && echo si || echo no)" "no"
check "el sexto es conflicto con el primero" "$(gawk -F'\t' '$1 == 6 {print $2}' "$F/out/integration.tsv")" "conflicto: a.txt"
check "sale 1 si algo con cambios no se integró" "$rc" "1"
check "resume la integración" "$(printf '%s\n' "$integration" | grep -c '^aplicados=2 conflictos=1 no-aplicables=0$')" "1"

echo "caso 3 — sin --verify el cambio queda sin verificar y no se aplica por defecto"
git -C "$F/repo" checkout -q -- . 2>/dev/null; git -C "$F/repo" clean -qfd
printf '%s\n' 'write c.txt' | pool --out "$F/out3" >/dev/null
check "veredicto sin-verificar" "$(cat "$F/out3/1.verdict")" "sin-verificar"
bash "$INTEGRATE" "$F/out3" --repo "$F/repo" >/dev/null 2>&1
check "no se aplica sin --unverified" "$(test -e "$F/repo/c.txt" && echo si || echo no)" "no"
bash "$INTEGRATE" "$F/out3" --repo "$F/repo" --unverified >/dev/null 2>&1
check "con --unverified se aplica" "$(test -e "$F/repo/c.txt" && echo si || echo no)" "si"

echo "caso 4 — rehúsa fuera de un árbol de git"
mkdir -p "$F/plain"
(cd "$F/plain" && export GIT_CEILING_DIRECTORIES="$F" && printf 'noop x\n' | bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 \
  --isolation worktree --out "$F/out4" >/dev/null 2>&1); check "sale 2" "$?" "2"
printf 'noop x\n' | (cd "$F/repo" && bash "$POOL" --prompt "$F/prompt.md" --model claude-sonnet-5 \
  --isolation otra --out "$F/out5" >/dev/null 2>&1); check "un modo desconocido sale 2" "$?" "2"

echo "caso 5 — un worktree que quedó de la ejecución se retira al terminar el pool"
bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out6" 99 >/dev/null
printf '%s\n' 'noop x' | pool --out "$F/out6" --verify true >/dev/null
check "el pool deja sólo el árbol principal" "$(git -C "$F/repo" worktree list | wc -l)" "1"

echo "caso 6 — finalize retira el worktree del ítem en cuanto termina"
dir="$(bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out7" 1)"
mkdir -p "$F/out7"; printf 'x\n' > "$dir/nuevo.txt"
bash "$HEADLESS_POOL_ITEM_WORKTREE" finalize "$F/repo" "$dir" "$F/out7" 1 0 true
check "sin barrido, el worktree ya no está" \
  "$(git -C "$F/repo" worktree list | grep -c "$THYROX_POOL_WORKTREES_DIR/$(printf '%s' "$F/out7" | sha1sum | cut -c1-12)/")" "0"
check "su parche nombra el archivo" "$(cat "$F/out7/1.files")" "nuevo.txt"

echo "caso 7 — si el worktree no se prepara, el .err del ítem trae el motivo"
cat > "$F/failing-worktree" <<'SH'
#!/usr/bin/env bash
[[ "$1" == prepare ]] || exec bash "$ITEM_WORKTREE_REAL" "$@"
echo "fatal: Unable to create worktrees.lock: File exists." >&2
exit 2
SH
chmod +x "$F/failing-worktree"
printf '%s\n' 'write a.txt hola' \
    | HEADLESS_POOL_ITEM_WORKTREE="$F/failing-worktree" pool --out "$F/out8" --verify true >/dev/null
check "el ítem sale sin json de resultado" "$(wc -c < "$F/out8/1.json")" "0"
check "el .err nombra el motivo de git" "$(gawk '/Unable to create worktrees.lock/{n++} END{print n+0}' "$F/out8/1.err")" "1"

echo "caso 8 — los trabajos que lanza un ítem aislado quedan en su salida, no en el árbol principal"
probe="leakprobe-$$"
# El pool hereda el hogar de trabajos del árbol principal, como lo hereda de
# su `.env` en una sesión real: sin aislar, el ítem escribiría ahí.
main_jobs="$F/main-jobs"
mkdir -p "$main_jobs"
printf '%s\n' "launch $probe" | THYROX_JOBS_DIR="$main_jobs" pool --out "$F/out9" --verify true >/dev/null
check "el trabajo aparece bajo la salida del ítem" \
    "$(find "$F/out9/1.jobs" -maxdepth 1 -name "$probe-*" 2>/dev/null | wc -l)" "1"
check "el árbol principal no recibe el trabajo" \
    "$(find "$main_jobs" -maxdepth 1 -name "$probe-*" | wc -l)" "0"

echo "caso 9 — el pool retiene el candado de su ejecución y no deja rastro al salir"
printf '%s\n' 'probe-lock x' | PROBE_LOG="$F/probe.log" pool --out "$F/out10" --verify true >/dev/null
check "el ítem ve el candado tomado" "$(cat "$F/probe.log")" "1"
run="$THYROX_POOL_WORKTREES_DIR/$(printf '%s' "$F/out10" | sha1sum | cut -c1-12)"
check "sin directorio de la ejecución al terminar" "$(test -e "$run" && echo si || echo no)" "no"
check "sin candado de la ejecución al terminar" "$(test -e "$run.lock" && echo si || echo no)" "no"

echo "caso 10 — durante el verify: cwd, THYROX_ROOT y PYTHONPATH son los del worktree"
dir10="$(bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out11" 1)"
mkdir -p "$F/out11"
printf 'x\n' > "$dir10/nuevo10.txt"
dir10_real="$(cd "$dir10" && pwd -P)"
ctrl10="$F/out11/ctrl.env"
# El propio verify vuelca lo que observa a un archivo FUERA del worktree,
# porque el worktree se retira al terminar `finalize` y no queda nada que leer.
verify10='{ pwd -P; printf "%s\n" "$THYROX_ROOT"; printf "%s\n" "$PYTHONPATH"; } > "'"$ctrl10"'"'
# Simula lo que el pool exporta antes de correr un item aislado: THYROX_ROOT y
# PYTHONPATH resueltos contra el arbol PRINCIPAL, tal como los hereda `finalize`.
THYROX_ROOT="$F/repo" PYTHONPATH="$F/repo/src:/una/ruta/ajena" \
    bash "$HEADLESS_POOL_ITEM_WORKTREE" finalize "$F/repo" "$dir10" "$F/out11" 1 0 "$verify10"
cwd_visto="$(sed -n '1p' "$ctrl10")"
root_visto="$(sed -n '2p' "$ctrl10")"
pythonpath_visto="$(sed -n '3p' "$ctrl10")"
check "el verify corre con el cwd en el worktree del item" "$cwd_visto" "$dir10_real"
check "THYROX_ROOT durante el verify es el worktree, no el arbol principal" "$root_visto" "$dir10_real"
check "PYTHONPATH durante el verify es solo el src del worktree" "$pythonpath_visto" "$dir10_real/src"

echo "caso 11 — modificar solo el árbol principal no cambia el veredicto del verify"
printf 'original\n' > "$F/repo/observado.txt"
git -C "$F/repo" add observado.txt
git -C "$F/repo" -c user.email=t@t -c user.name=t commit -q -m observado
dir11="$(bash "$HEADLESS_POOL_ITEM_WORKTREE" prepare "$F/repo" "$F/out12" 1)"
mkdir -p "$F/out12"
printf 'y\n' > "$dir11/nuevo11.txt"
# Se toca SOLO el árbol principal, sin comprometer el cambio: el worktree ya
# tiene su propia copia de `observado.txt`, independiente desde que se preparó.
printf 'modificado\n' > "$F/repo/observado.txt"
verify11='test "$(cat "$THYROX_ROOT/observado.txt")" = original'
THYROX_ROOT="$F/repo" PYTHONPATH="$F/repo/src" \
    bash "$HEADLESS_POOL_ITEM_WORKTREE" finalize "$F/repo" "$dir11" "$F/out12" 1 0 "$verify11"
check "el veredicto lee el worktree, no lo que cambió el árbol principal" "$(cat "$F/out12/1.verdict")" "verificado"
git -C "$F/repo" checkout -q -- observado.txt

echo "test-headless-pool-worktree: $total aserciones — $((total - failures)) ok, $failures falla(s)"
[[ $failures -eq 0 ]]
