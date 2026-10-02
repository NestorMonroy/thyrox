#!/usr/bin/env bash
# Verificación del contexto del grant en la residencia: GREEN de las suites
# tocadas y de sus consumidores, typecheck de los dos paquetes y las dos
# anulaciones (clave sin contexto, entorno sin grant). Cada paso con su código.
# Uso: verify_grant_context.sh <worktree> <salida>
set -uo pipefail
W="$1" O="$2"
RL=/home/user/thyrox/bin/replace_literal
mkdir -p "$O"
status=0
step() { local name="$1" log="$2"; shift 2; "$@" > "$log" 2>&1; local rc=$?; (( rc == 0 )) || status=1
         printf '%s rc=%s %s\n' "$name" "$rc" "$(grep -E '^ *[0-9]+ (pass|fail)$' "$log" | tr '\n' ' ')"; }

step green-scheduling "$O/grant-context-green-scheduling.log" bash -c \
    "cd '$W/src/packages/model-scheduling' && bun test __tests__/hostCoordinator.test.ts __tests__/podmanModelUnitMaterializer.test.ts"
step green-composition "$O/grant-context-green-composition.log" bash -c \
    "cd '$W/src/packages/local-models' && bun test __tests__/hostCoordinatorComposition.test.ts"
step typecheck-scheduling "$O/grant-context-typecheck-scheduling.log" bash -c "cd '$W/src/packages/model-scheduling' && bunx tsc --noEmit -p tsconfig.test.json"
step typecheck-local-models "$O/grant-context-typecheck-local-models.log" bash -c "cd '$W/src/packages/local-models' && bunx tsc --noEmit -p tsconfig.test.json"
grep -c 'error TS' "$O/grant-context-typecheck-scheduling.log" "$O/grant-context-typecheck-local-models.log"

annul() {
    local name="$1" file="$2" old="$3" new="$4" copy
    copy="$(mktemp -d)"; cp -r "$W/src" "$copy/"; ln -s /home/user/thyrox/node_modules "$copy/node_modules"
    OLD="$old" NEW="$new" bash "$RL" "$copy/$file" > /dev/null
    (cd "$copy/src/packages/model-scheduling" && bun test __tests__/hostCoordinator.test.ts __tests__/podmanModelUnitMaterializer.test.ts) > "$O/grant-context-annul-$name.log" 2>&1
    printf 'annul %s: %s\n' "$name" "$(grep -E '^\(fail\)' "$O/grant-context-annul-$name.log" | sort -u | paste -sd ';' -)"
    rm -rf "${copy:?}"
}
annul residency-key src/packages/model-scheduling/hostCoordinator.ts \
    '/${placementSegment(placement)}/ctx${contextLength}`' '/${placementSegment(placement)}`'
annul grant-environment src/packages/model-scheduling/podmanModelUnitMaterializer.ts \
    'environment: { ...spec.profile.environment, ...spec.profile.grantEnvironment?.(spec.grant) },' 'environment: spec.profile.environment,'
exit "$status"
