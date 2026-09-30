#!/usr/bin/env bash
# Verify del ítem, con cwd en el worktree. Lo invoca launch.sh desde el árbol
# principal (ruta absoluta), así que el ítem no puede editarlo.
set -uo pipefail
B="$(cd "$(dirname "$0")" && pwd)"
git diff --quiet HEAD -- .claude || { echo "verify: el ítem tocó .claude"; exit 1; }
git diff --quiet -- 'src/packages/*/package.json' || { echo "verify: package.json modificados"; exit 1; }
bun install --frozen-lockfile >/dev/null || { echo "verify: bun install falló"; exit 1; }
test -f src/packages/tools/__tests__/taskSessionHighwater.test.ts || { echo "verify: falta taskSessionHighwater.test.ts"; exit 1; }
bun test src/packages/tools/__tests__ \
  src/packages/agent/__tests__/resetTaskList.test.ts \
  src/packages/agent/__tests__/taskSchema.behavior.test.ts \
  src/packages/agent/__tests__/taskCitation.test.ts \
  src/packages/agent/__tests__/taskReminder.test.ts || exit 1
fails="$(bun test src/packages/task/__tests__ 2>&1 | grep '^(fail)' | sed 's/ \[[0-9.]*ms\]$//' | sort)"
[[ "$fails" == "$(cat "$B/preexisting-fails.txt")" ]] || { echo "verify: rojos de task/__tests__ distintos:"; echo "$fails"; exit 1; }
grep -q 'task_session_highwater' src/packages/task/schema.ts || { echo "verify: sin task_session_highwater"; exit 1; }
grep -q 'BEGIN IMMEDIATE' src/packages/tools/src/tasks.ts || { echo "verify: sin BEGIN IMMEDIATE"; exit 1; }
if grep -nE "(DROP|ALTER)[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?task_highwater\b|FROM[[:space:]]+task_highwater\b|INTO[[:space:]]+task_highwater\b" src/packages/tools/src/tasks.ts src/packages/task/schema.ts; then
  echo "verify: el código aún toca task_highwater"; exit 1; fi
exit 0
