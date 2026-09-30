#!/usr/bin/env bash
# Verify del ítem, con cwd en el worktree: las pruebas del tablero y ninguna escritura
# fuera de los archivos del ítem (un build dejaría package.json reapuntados).
# Los rojos de task/__tests__/schema.test.ts anteriores al ítem (la base Python declara
# board_ordinal y el piso TS no) se admiten por nombre exacto, y ningún otro.
set -uo pipefail
B="$(dirname "$0")"
bun install --frozen-lockfile >/dev/null || { echo "verify: bun install falló"; exit 1; }
test -f src/packages/tools/__tests__/taskHighwater.test.ts || { echo "verify: falta taskHighwater.test.ts"; exit 1; }
bun test src/packages/tools/__tests__ \
  src/packages/agent/__tests__/resetTaskList.test.ts \
  src/packages/agent/__tests__/taskSchema.behavior.test.ts \
  src/packages/agent/__tests__/taskCitation.test.ts \
  src/packages/agent/__tests__/taskReminder.test.ts || exit 1
out="$(bun test src/packages/task/__tests__ 2>&1)"
fails="$(grep '^(fail)' <<<"$out" | sed 's/ \[[0-9.]*ms\]$//' | sort)"
if [[ "$fails" != "$(cat "$B/preexisting-fails.txt")" ]]; then
  echo "verify: rojos de task/__tests__ distintos de los previos:"; echo "$fails"; exit 1
fi
grep -q "'__global__'" src/packages/tools/src/tasks.ts && { echo "verify: tasks.ts aún usa la clave global"; exit 1; }
grep -q 'BEGIN IMMEDIATE' src/packages/tools/src/tasks.ts || { echo "verify: sin BEGIN IMMEDIATE"; exit 1; }
if ! git diff --quiet -- 'src/packages/*/package.json'; then echo "verify: package.json modificados"; exit 1; fi
exit 0
