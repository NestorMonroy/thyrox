#!/usr/bin/env bash
# Verificación de L0 (TASK-THYROX-0908) en el worktree del ítem: pruebas nuevas y vecinas, typecheck,
# alcance, y el RED de las nuevas contra la base.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
fail=0
(cd src/packages/provider && bun test __tests__/anthropicHttpRetry.test.ts __tests__/anthropicMockServer.test.ts \
  __tests__/providerStreaming.test.ts __tests__/credentials.test.ts > /dev/null 2>&1) || { echo "FALLA pruebas del proveedor"; fail=1; }
(cd src/packages/provider && bunx tsc -p tsconfig.test.json --noEmit > /dev/null 2>&1) || { echo "FALLA typecheck del proveedor"; fail=1; }
grep -q "getDefaultMaxRetries" src/packages/provider/src/anthropicHttp.ts || { echo "FALLA no usa getDefaultMaxRetries"; fail=1; }
grep -q "getRetryDelay" src/packages/provider/src/anthropicHttp.ts || { echo "FALLA no usa getRetryDelay"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/L0-$log.log" ]] || { echo "FALLA falta outputs/L0-$log.log"; fail=1; }; done
owned=(src/packages/provider/src/anthropicHttp.ts src/packages/provider/__tests__/anthropicHttpRetry.test.ts "$bench")
bash "$gates/scope.sh" L0-0908 "${owned[@]}" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA L0 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" L0-0908 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
