#!/usr/bin/env bash
# Verifica el merge de feature/complete-orm-root: tipos, pruebas de lo unido y unicidad de citas.
set -u
cd /home/user/thyrox
out=.claude/workbench/citation-renumbering-20261002T071805/outputs
status=0
step() { local name="$1"; shift; "$@" > "$out/merge-$name.txt" 2>&1; local rc=$?; echo "$name exit=$rc $(tail -1 "$out/merge-$name.txt")"; [ $rc = 0 ] || status=1; }
step tsc-podman-execution bash -c 'cd src/packages/podman-execution && bunx tsc --noEmit -p . 2>&1 | grep -v isProcessAlive | grep -c "error TS" | grep -qx 0 && echo "0 errores propios"'
step bun-podman-execution bash -c 'cd src/packages/podman-execution && bun test 2>&1 | tail -3'
step bun-model-scheduling bash -c 'cd src/packages/model-scheduling && bun test 2>&1 | tail -3'
step bun-local-models bash -c 'cd src/packages/local-models && bun test 2>&1 | tail -3'
step sh-bg-managed-execution bash tests/session/test-bg-managed-execution.sh
step task-duplicates bash bin/task_ids duplicates
step finding-unique bash bin/check_finding_id_unique
exit $status
