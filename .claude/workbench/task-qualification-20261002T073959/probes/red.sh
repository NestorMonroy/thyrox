#!/usr/bin/env bash
# Rojo de TASK-THYROX-0780: copia las pruebas nuevas a su sitio y las corre.
set -u
cd /home/user/thyrox/src/packages/local-models
B=/home/user/thyrox/.claude/workbench/task-qualification-20261002T073959
cp "$B/probes/taskSuite.test.ts" __tests__/taskSuite.test.ts
cat "$B/probes/runTask.test.ts" >> __tests__/qualifyModel.test.ts
cat "$B/probes/qualifyCommand.test.ts" >> __tests__/qualifyCommand.test.ts
python3 - <<'PY'
from pathlib import Path
p = Path("__tests__/qualifyModel.test.ts"); t = p.read_text()
t = t.replace("import { afterEach, describe, expect, test } from 'bun:test'\n",
              "import { afterEach, beforeEach, describe, expect, test } from 'bun:test'\nimport { mkdtempSync, rmSync, writeFileSync } from 'node:fs'\nimport { tmpdir } from 'node:os'\nimport { join } from 'node:path'\n", 1)
t = t.replace("import { ContextBeyondGrantError, runQualification } from '../qualifyModel.js'\n",
              "import { ContextBeyondGrantError, runQualification, runTaskQualification } from '../qualifyModel.js'\nimport { loadTaskSuite, type TaskSuite } from '../taskSuite.js'\n", 1)
p.write_text(t)
q = Path("__tests__/qualifyCommand.test.ts"); u = q.read_text()
u = u.replace("import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'", "import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'", 1)
q.write_text(u)
PY
for t in taskSuite qualifyModel qualifyCommand; do
  bun test "__tests__/$t.test.ts" > "$B/outputs/red-$t.txt" 2>&1
  echo "$t: $(grep -cE '^\(fail\)' "$B/outputs/red-$t.txt") fail · $(grep -E '^ *[0-9]+ (pass|fail)|error:' "$B/outputs/red-$t.txt" | head -3 | tr '\n' ' ')"
done
