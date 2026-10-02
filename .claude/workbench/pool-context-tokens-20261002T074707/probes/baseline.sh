#!/usr/bin/env bash
# ¿Falla test-headless-pool.sh igual sin el cambio? La corre en un worktree de HEAD.
set -u
B=/home/user/thyrox/.claude/workbench/pool-context-tokens-20261002T074707
cd /home/user/thyrox
W=/home/user/thyrox/.thyrox/runtime/baseline-pool-$$
git worktree add --detach "$W" HEAD >/dev/null 2>&1
ln -s /home/user/thyrox/node_modules "$W/node_modules"; ln -s /home/user/thyrox/.venv "$W/.venv"
for d in /home/user/thyrox/src/packages/*/node_modules; do p=${d#/home/user/thyrox/}; [ -e "$W/$p" ] || ln -s "$d" "$W/$p"; done
for run in 1 2; do
  (cd "$W" && bash tests/session/test-headless-pool.sh > "$B/outputs/baseline-head-$run.txt" 2>&1)
  echo "HEAD corrida $run: $(tail -1 "$B/outputs/baseline-head-$run.txt") · $(grep -c '^FALLA' "$B/outputs/baseline-head-$run.txt") FALLA: $(grep '^FALLA' "$B/outputs/baseline-head-$run.txt" | cut -c1-70)"
done
git worktree remove --force "$W"
bash tests/session/test-headless-pool.sh > "$B/outputs/green-test-headless-pool-2.txt" 2>&1
echo "con el cambio, 2a corrida: $(tail -1 "$B/outputs/green-test-headless-pool-2.txt") · $(grep '^FALLA' "$B/outputs/green-test-headless-pool-2.txt" | cut -c1-70)"
