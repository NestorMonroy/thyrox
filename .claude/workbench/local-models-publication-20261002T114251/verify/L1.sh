#!/usr/bin/env bash
# Verificación de L1 (TASK-THYROX-0907), corrida por el controlador en el worktree del ítem:
# las pruebas propias y las vecinas en verde, typecheck, alcance, y el RED de las nuevas contra la base.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
fail=0
(cd src/packages/local-models && bun test __tests__/ensureModel.test.ts __tests__/modelArtifactCache.test.ts \
  __tests__/localArtifactSource.test.ts __tests__/artifactRecoverability.test.ts __tests__/ensureModelHomes.test.ts > /dev/null 2>&1) \
  || { echo "FALLA pruebas de local-models"; fail=1; }
(cd src/packages/local-models && bunx tsc -p tsconfig.test.json --noEmit > /dev/null 2>&1) || { echo "FALLA typecheck de local-models"; fail=1; }
grep -riE "qwen|coder|nomic" src/packages/local-models/localArtifactSource.ts src/packages/local-models/artifactRecoverability.ts \
  src/packages/local-models/ensureModel.ts && { echo "FALLA rama específica de un modelo"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/L1-$log.log" ]] || { echo "FALLA falta outputs/L1-$log.log"; fail=1; }; done
owned=(src/packages/local-models/ensureModel.ts src/packages/local-models/modelArtifactCache.ts
  src/packages/local-models/localArtifactSource.ts src/packages/local-models/artifactRecoverability.ts
  src/packages/local-models/bin/ensure.ts src/packages/local-models/__tests__/ensureModel.test.ts
  src/packages/local-models/__tests__/modelArtifactCache.test.ts src/packages/local-models/__tests__/localArtifactSource.test.ts
  src/packages/local-models/__tests__/artifactRecoverability.test.ts "$bench")
bash "$gates/scope.sh" L1-0907 "${owned[@]}" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA L1 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" L1-0907 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
