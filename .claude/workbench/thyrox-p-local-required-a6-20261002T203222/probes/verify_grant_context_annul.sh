#!/usr/bin/env bash
# Segunda pasada de la verificación del contexto del grant: la línea base del
# typecheck en el árbol principal (HEAD), y las anulaciones EN el worktree,
# restaurando cada archivo desde su copia. La primera pasada las corrió en una
# copia de /tmp sin el preload de bun y no midió nada.
# Uso: verify_grant_context_annul.sh <worktree> <salida>
set -uo pipefail
W="$1" O="$2"
MAIN=/home/user/thyrox
RL="$MAIN/bin/replace_literal"
mkdir -p "$O"

for package in model-scheduling local-models; do
    (cd "$MAIN/src/packages/$package" && bunx tsc --noEmit -p tsconfig.test.json) > "$O/grant-context-typecheck-base-$package.log" 2>&1
    printf 'base typecheck %s: %s errores\n' "$package" "$(grep -c 'error TS' "$O/grant-context-typecheck-base-$package.log")"
done

annul() {
    local name="$1" file="$2" old="$3" new="$4"
    cp "$W/$file" "$W/$file.orig"
    OLD="$old" NEW="$new" bash "$RL" "$W/$file" > /dev/null
    (cd "$W/src/packages/model-scheduling" && bun test __tests__/hostCoordinator.test.ts __tests__/podmanModelUnitMaterializer.test.ts) > "$O/grant-context-annul-$name.log" 2>&1
    mv "$W/$file.orig" "$W/$file"
    printf 'annul %s: %s\n' "$name" "$(grep -E '^\(fail\)' "$O/grant-context-annul-$name.log" | sort -u | paste -sd ';' -)"
}
annul residency-key src/packages/model-scheduling/hostCoordinator.ts \
    '/${placementSegment(placement)}/ctx${contextLength}`' '/${placementSegment(placement)}`'
annul grant-environment src/packages/model-scheduling/podmanModelUnitMaterializer.ts \
    'environment: { ...spec.profile.environment, ...spec.profile.grantEnvironment?.(spec.grant) },' 'environment: spec.profile.environment,'
