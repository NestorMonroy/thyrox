#!/usr/bin/env bash
# Verde de TASK-THYROX-0780: aplica la implementación y corre las pruebas tocadas y las hermanas.
set -u
B=/home/user/thyrox/.claude/workbench/task-qualification-20261002T073959
cd /home/user/thyrox/src/packages/local-models
cp "$B/probes/src/taskSuite.ts" taskSuite.ts
cp "$B/probes/src/qualifyModel.ts" qualifyModel.ts
python3 "$B/probes/apply_command.py" || exit 1
status=0
for t in taskSuite qualifyModel qualifyCommand qualificationStore; do
  bun test "__tests__/$t.test.ts" > "$B/outputs/green-$t.txt" 2>&1 || status=1
  echo "$t: $(grep -E '^ *[0-9]+ (pass|fail)' "$B/outputs/green-$t.txt" | tr '\n' ' ')"
done
bun test > "$B/outputs/green-local-models.txt" 2>&1 || status=1
echo "local-models: $(grep -E '^ *[0-9]+ (pass|fail)' "$B/outputs/green-local-models.txt" | tr '\n' ' ')"
exit $status
