#!/usr/bin/env bash
# ¿Fallan los casos de local-models-qualify de commands.test.ts sin el cambio? Compara HEAD (worktree) contra el árbol.
set -u
B=/home/user/thyrox/.claude/workbench/task-qualification-20261002T073959
cd /home/user/thyrox
(cd src/packages/local-models && bun test __tests__/commands.test.ts > "$B/outputs/commands-with-change.txt" 2>&1)
echo "con el cambio: $(grep -E '^ *[0-9]+ (pass|fail)' "$B/outputs/commands-with-change.txt" | tr '\n' ' ')"
W=/home/user/thyrox/.thyrox/runtime/baseline-commands-$$
git worktree add --detach "$W" HEAD >/dev/null 2>&1
ln -s /home/user/thyrox/node_modules "$W/node_modules"
for d in /home/user/thyrox/src/packages/*/node_modules; do p=${d#/home/user/thyrox/}; [ -e "$W/$p" ] || ln -s "$d" "$W/$p"; done
(cd "$W/src/packages/local-models" && bun test __tests__/commands.test.ts > "$B/outputs/commands-at-head.txt" 2>&1)
echo "en HEAD:       $(grep -E '^ *[0-9]+ (pass|fail)' "$B/outputs/commands-at-head.txt" | tr '\n' ' ')"
git worktree remove --force "$W"
