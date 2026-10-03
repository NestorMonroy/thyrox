#!/usr/bin/env bash
# Anulación de TASK-THYROX-0930: retira cada mitad y mide qué cae.
set -u
cd "$(git rev-parse --show-toplevel)"
D=src/packages/cli/src/entry/printDelegation.ts; W=src/session/item_worktree.sh; P=src/session/headless-pool.sh
ts() { (cd src/packages/cli && timeout 120 bun test __tests__/printDelegation.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)'); }
wt() { timeout 120 bash tests/session/test-item-worktree-local-only.sh 2>&1 | grep -E 'FALLA|falla'; }
pl() { timeout 300 bash tests/session/test-headless-pool-model-policy.sh 2>&1 | grep -E 'FALLA|falla\(s\)'; }
annul() {
  local name="$1" file="$2" suite="$3" saved; saved="$(mktemp)"; cp "$file" "$saved"
  OLD="$4" NEW="$5" bash bin/replace_literal "$file" >/dev/null || { echo "$name: no aplicó"; cp "$saved" "$file"; return; }
  echo "== $name"; "$suite"; cp "$saved" "$file"; rm -f "$saved"
}
annul route-precedence "$D" ts '  if (isLocalCatalogModel(flagValue(argv, '"'"'--model'"'"'))) return localModelRoute(env)
' ''
annul served-by-local "$D" ts "  const local = route.kind !== 'own' || route.reason === LOCAL_TUNNEL_REASON" "  const local = true"
annul finalize-no-local "$W" wt '    elif [[ "${THYROX_POOL_LOCAL_ONLY:-}" == 1 ]] && ! served_locally "$out/$n.err"; then' '    elif false; then'
annul pool-unit "$P" pl '    [[ "$EXECUTION" == unit ]] \
        || rehusa "--local-only exige --execution unit: la ejecución host hereda las credenciales del anfitrión"' '    true'
annul pool-runtime "$P" pl '[[ -z "$LOCAL_ONLY" || "$RUNTIME" == "$LOCAL_RUNTIME" ]] \' 'true || [[ -z "$LOCAL_ONLY" || "$RUNTIME" == "$LOCAL_RUNTIME" ]] \'
annul pool-ensure "$P" pl '    [[ -z "$LOCAL_ONLY" ]] \
        || rehusa "$MANAGED_OLLAMA_SERVICE no arrancó (local_control_plane_ready salió $ensure_exit) y --local-only no cae al proveedor"' '    true'
git diff --stat -- "$D" "$W" "$P" | tail -1
