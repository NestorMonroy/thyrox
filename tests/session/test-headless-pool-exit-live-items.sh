#!/usr/bin/env bash
# Suite de la salida del pool con ítems vivos (TASK-THYROX-0639, H-THYROX-283):
# los grupos 7 y 8 salieron con ítems en curso, retiraron sus worktrees debajo
# de ellos y dejaron a los `thyrox -p` escribiendo huérfanos. Dos guardas, cada
# una con su control de anulación:
#
#   A. el pool recibe TERM (todo su grupo) con un ítem vivo: el pool drena la
#      sesión del ítem antes de salir —nadie sobrevive al pool— y conserva el
#      worktree del ítem no cerrado para `pool_lifecycle reconcile`.
#   B. GNU Parallel muere solo (SIGKILL) con un ítem vivo —el rastro de
#      H-THYROX-283: joblog sólo con cabecera—: el pool drena el ítem, espera
#      a que su shell lo publique y sólo entonces barre su worktree.
#   Ac. sin el drenaje de salida, el ítem sobrevive al pool.
#   Bc. sin la guarda del barrido, el worktree del ítem no cerrado se retira.
#
# El runner falso escribe en su worktree y se detiene en una FIFO: la prueba
# observa el pool EN CURSO sin sleep, y el runner muere con el TERM del drenaje.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
failures=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FAIL $1 — expected '$3', got '$2'"; failures=$((failures+1)); fi; }

F="$(mktemp -d)"
cleanup() { pkill -TERM -f "$F/[r]unner" 2>/dev/null; rm -rf "${F:?}"; }
trap cleanup EXIT
cat > "$F/runner" <<'RUNNER'
#!/usr/bin/env bash
cat > /dev/null
jq -cn '{type:"system",subtype:"init"}'
echo "trabajo a mitad" > work-in-progress.txt
echo started > "$EXIT_TEST_STARTED"
read -r _ < "$EXIT_TEST_RELEASE"
jq -cn '{type:"result",subtype:"success",result:"done"}'
RUNNER
chmod +x "$F/runner"
printf 'Implementa.\n' > "$F/prompt.md"

REPO="$F/repo"
BENCH=".claude/workbench/b"
git init -q "$REPO"
mkdir -p "$REPO/$BENCH"
printf 'banco\n' > "$REPO/$BENCH/README.md"
printf '/.thyrox/runtime/\n' > "$REPO/.gitignore"
git -C "$REPO" add -A && git -C "$REPO" -c user.name=t -c user.email=t@t commit -qm seed
# Los worktrees no cuelgan de `.claude/`: el runner trataría la ruta como sensible.
export THYROX_POOL_WORKTREES_DIR="$F/worktrees"

# Una copia del pool con un bloque de guarda retirado, para los controles.
# `memory.sh` y `toolchain.sh` se resuelven por `../lib` desde el módulo.
POOL_COPY="$F/src/session/headless-pool.sh"
mkdir -p "$F/src"
ln -s "$ROOT/src/lib" "$F/src/lib"
cp -r "$ROOT/src/session" "$F/src/session"
strip_block() { gawk -i inplace -v mark="$2" '$0 ~ "# >>> " mark {skip=1} !skip {print} $0 ~ "# <<< " mark {skip=0}' "$1"; }

# start_pool <label> <módulo del pool> [opciones]: lanza el pool en una sesión
# propia, con aislamiento por worktree, y espera a que el ítem arranque.
start_pool() {
  local label="$1" module="$2"
  shift 2
  mkfifo "$F/$label.started" "$F/$label.release"
  printf 'one\n' | THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$F/$label.runtime" \
      EXIT_TEST_STARTED="$F/$label.started" EXIT_TEST_RELEASE="$F/$label.release" \
      HEADLESS_POOL_RUNNER="$F/runner" HEADLESS_POOL_TIME="$F/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$F/$label.history" HEADLESS_POOL_ITEM_DRAIN_SECONDS=1 \
      HEADLESS_POOL_EXIT_SETTLE_SECONDS=20 \
      setsid bash "$module" --prompt "$F/prompt.md" --out "$REPO/$BENCH/$label" \
          --model claude-sonnet-5 --width 1 --isolation worktree --cwd "$REPO" "$@" > "$F/$label.log" 2>&1 &
  POOL_PID=$!
  exec {started_fd}<> "$F/$label.started"
  read -r -t 60 _ <&"$started_fd" || { echo "el ítem nunca arrancó:"; cat "$F/$label.log"; }
  exec {started_fd}<&-
}
release() { exec {release_fd}<> "$F/$1.release"; echo go >&"$release_fd"; exec {release_fd}>&-; }
live_runners() { pgrep -fc "^bash $F/[r]unner" || true; }
# GNU Parallel es el miembro de la sesión del pool cuya línea de comando lo
# nombra; el pool corre desde su copia congelada, así que no es hijo directo.
parallel_pid() {
  local p
  for p in $(bash "$ROOT/bin/process_ownership" members "$POOL_PID"); do
    tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q '[p]arallel' && { echo "$p"; return 0; }
  done
  return 1
}
item_worktrees() { git -C "$REPO" worktree list --porcelain | grep -c "^worktree $F/worktrees/"; }
live_dir() {
  local match
  match="$(compgen -G "$F/$1.runtime/pool/*/1.stream.jsonl")" || { echo "sin runtime del ítem en $1" >&2; return 1; }
  dirname "$match"
}

# --- caso A: TERM al grupo del pool con un ítem vivo ---------------------------
start_pool runA "$ROOT/src/session/headless-pool.sh"
liveA="$(live_dir runA)" || exit 1
check "A: en curso, el ítem tiene su worktree" "$(item_worktrees)" 1
check "A: en curso, el runner vive" "$(live_runners)" 1
kill -TERM -- "-$POOL_PID"
wait "$POOL_PID"; codeA=$?
check "A: el pool no termina bien" "$([[ "$codeA" -ne 0 ]] && echo yes)" yes
check "A: ningún runner sobrevive al pool" "$(live_runners)" 0
check "A: la salida no tiene el ítem" "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/runA" | wc -l)" 0
check "A: el worktree del ítem no cerrado se conserva" "$(item_worktrees)" 1
check "A: el trabajo a mitad sigue en el worktree" \
  "$(cat "$(git -C "$REPO" worktree list --porcelain | gawk -v r="$F/worktrees/" 'index($0, "worktree " r) == 1 {print substr($0, 10)}')/work-in-progress.txt")" "trabajo a mitad"
check "A: el runtime se conserva" "$([[ -f "$liveA/1.stream.jsonl" ]] && echo yes)" yes
check "A: el pool declara el runtime conservado" "$(grep -c 'runtime conservado para pool_lifecycle reconcile' "$F/runA.log")" 1
check "A: reconcile declara el ítem recuperable" \
  "$(THYROX_RUNTIME_DIR="$F/runA.runtime" bash "$ROOT/bin/pool_lifecycle" reconcile | grep -c "	1	ABANDONED_RECOVERABLE")" 1
git -C "$REPO" worktree remove --force "$(git -C "$REPO" worktree list --porcelain | gawk -v r="$F/worktrees/" 'index($0, "worktree " r) == 1 {print substr($0, 10)}')"

# --- caso B: GNU Parallel muere solo con un ítem vivo (rastro de H-THYROX-283)
start_pool runB "$ROOT/src/session/headless-pool.sh"
liveB="$(live_dir runB)" || exit 1
ppid="$(parallel_pid)"
check "B: GNU Parallel corre bajo el pool" "$([[ -n "$ppid" ]] && echo yes)" yes
kill -KILL "$ppid"
wait "$POOL_PID"; codeB=$?
check "B: el pool no termina bien" "$([[ "$codeB" -ne 0 ]] && echo yes)" yes
check "B: el joblog quedó sólo con cabecera" "$(wc -l < "$REPO/$BENCH/runB/joblog.tsv")" 1
check "B: ningún runner sobrevive al pool" "$(live_runners)" 0
check "B: el ítem quedó cerrado por su propio shell" "$(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/$BENCH/runB")" 1
check "B: su manifiesto coincide con la salida" "$(bash "$ROOT/bin/pool_lifecycle" verify "$REPO/$BENCH/runB" 1)" coherente
check "B: el veredicto es fallido (el runner murió)" "$(cat "$REPO/$BENCH/runB/1.verdict")" fallido
check "B: la foto conserva el trabajo a mitad" \
  "$(git -C "$REPO" show "refs/thyrox/snapshots/${liveB##*/}/1/1:work-in-progress.txt" 2>/dev/null)" "trabajo a mitad"
check "B: el worktree se barrió sólo después de cerrar" "$(item_worktrees)" 0
check "B: el pool nombra el ítem sin veredicto de Parallel" "$(grep -c 'SIN VEREDICTO' "$F/runB.log")" 1

# --- control Ac: sin el drenaje de salida, el ítem sobrevive al pool ----------
cp "$ROOT/src/session/headless-pool.sh" "$POOL_COPY"
strip_block "$POOL_COPY" exit-drain
check "control Ac: el bloque se retiró" "$(grep -c 'exit-drain' "$POOL_COPY")" 0
start_pool runAc "$POOL_COPY"
kill -TERM -- "-$POOL_PID"
wait "$POOL_PID"
check "control Ac: sin drenaje, el runner sobrevive al pool" "$(live_runners)" 1
release runAc
for pid in $(pgrep -f "$F/[r]unner"); do timeout 10 tail --pid="$pid" -f /dev/null; done
git -C "$REPO" worktree list --porcelain | gawk -v r="$F/worktrees/" 'index($0, "worktree " r) == 1 {print substr($0, 10)}' \
  | while read -r w; do git -C "$REPO" worktree remove --force "$w"; done

# --- control Bc: sin la guarda del barrido, el worktree no cerrado se retira --
WT_COPY="$F/src/session/item_worktree.sh"
strip_block "$WT_COPY" sweep-closed-guard
check "control Bc: la guarda se retiró" "$(grep -c 'sweep-closed-guard' "$WT_COPY")" 0
HEADLESS_POOL_ITEM_WORKTREE="$WT_COPY" start_pool runBc "$ROOT/src/session/headless-pool.sh"
kill -TERM -- "-$POOL_PID"
wait "$POOL_PID"
check "control Bc: sin la guarda, el worktree del ítem no cerrado se barrió" "$(item_worktrees)" 0

echo "$((total-failures))/$total aserciones"
[[ "$failures" -eq 0 ]]
