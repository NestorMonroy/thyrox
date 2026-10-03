# Preparación común de las sondas: un pool de HEAD^{pre-fix} (la revisión que
# se pasa como POOL_REV) sobre un repositorio sintético, con el runner falso que
# escribe en su worktree y se detiene en una FIFO.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
POOL_REV="${POOL_REV:-HEAD}"
W="${PROBE_WORKDIR:?PROBE_WORKDIR: dónde vive la sonda}"
mkdir -p "$W/src"
ln -sfn "$ROOT/src/lib" "$W/src/lib"
mkdir -p "$W/src/session"
for f in headless-pool.sh item_worktree.sh; do
  git -C "$ROOT" show "$POOL_REV:src/session/$f" > "$W/src/session/$f"
done
cp -r "$ROOT/src/session/item_git_guard" "$W/src/session/" 2>/dev/null || true
cat > "$W/runner" <<'RUNNER'
#!/usr/bin/env bash
cat > /dev/null
jq -cn '{type:"system",subtype:"init"}'
echo "trabajo a mitad" > work-in-progress.txt
[[ -z "${PROBE_FILL_MB:-}" ]] || dd if=/dev/zero of=fill.bin bs=1M count="$PROBE_FILL_MB" status=none 2>/dev/null
[[ -z "${PROBE_FILL_MB:-}" ]] || { while :; do jq -cn "{type:\"assistant\",text:\"$(head -c 200 /dev/zero | tr "\\0" x)\"}" || break; sleep 0.05; done & }
echo started > "$PROBE_STARTED"
read -r _ < "$PROBE_RELEASE"
jq -cn '{type:"result",subtype:"success",result:"done"}'
RUNNER
chmod +x "$W/runner"
printf 'Implementa.\n' > "$W/prompt.md"
REPO="$W/repo"
git init -q "$REPO"
mkdir -p "$REPO/.claude/workbench/b"
printf 'banco\n' > "$REPO/.claude/workbench/b/README.md"
printf '/.thyrox/runtime/\n' > "$REPO/.gitignore"
git -C "$REPO" add -A && git -C "$REPO" -c user.name=t -c user.email=t@t commit -qm seed
export THYROX_POOL_WORKTREES_DIR="$W/worktrees"
start_pool() {
  mkfifo "$W/started" "$W/release"
  printf 'one\n' | THYROX_ROOT="$ROOT" THYROX_RUNTIME_DIR="$W/runtime" \
      PROBE_STARTED="$W/started" PROBE_RELEASE="$W/release" \
      HEADLESS_POOL_RUNNER="$W/runner" HEADLESS_POOL_TIME="$W/no-time" \
      HEADLESS_POOL_HISTORY_DIR="$W/history" HEADLESS_POOL_ITEM_DRAIN_SECONDS=1 \
      HEADLESS_POOL_ITEM_WORKTREE="$W/src/session/item_worktree.sh" \
      setsid bash "$W/src/session/headless-pool.sh" --prompt "$W/prompt.md" \
          --out "$REPO/.claude/workbench/b/out" --model claude-sonnet-5 --width 1 \
          --isolation worktree --cwd "$REPO" "$@" > "$W/pool.log" 2>&1 &
  POOL_PID=$!
  exec {fd}<> "$W/started"; read -r -t 60 _ <&"$fd" || echo "el ítem nunca arrancó"; exec {fd}<&-
}
trace() {
  echo "pool exit: $1"
  echo "joblog lines (out): $(wc -l < "$REPO/.claude/workbench/b/out/joblog.tsv" 2>/dev/null || echo ausente)"
  echo "joblog lines (runtime): $(cat "$W"/runtime/pool/*/joblog.tsv 2>/dev/null | wc -l)"
  echo "worktrees del ítem: $(git -C "$REPO" worktree list --porcelain | grep -c "^worktree $W/worktrees/")"
  echo "runners vivos: $(pgrep -f "$W/[r]unner" | wc -l)"
  echo "items cerrados: $(bash "$ROOT/bin/pool_lifecycle" closed-items "$REPO/.claude/workbench/b/out" | wc -l)"
  echo "runtime conservado: $(compgen -G "$W/runtime/pool/*/1.stream.jsonl" | wc -l)"
  echo "--- pool.log"; cat "$W/pool.log"
}
