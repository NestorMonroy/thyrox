#!/usr/bin/env bash
# Anulación de TASK-THYROX-0920: retira cada mitad de juicio, corre la suite y
# restaura. Debe caer exactamente lo que depende de esa mitad.
set -u
cd "$(git rev-parse --show-toplevel)"
P=src/packages/provider/src/cost/executionPolicy.ts
Q=src/packages/provider/src/cost/policy.ts
annul() {  # nombre archivo texto-viejo texto-nuevo
  local name="$1" file="$2" saved
  saved="$(mktemp)"; cp "$file" "$saved"
  OLD="$3" NEW="$4" bash bin/replace_literal "$file" >/dev/null || { echo "$name: anulación no aplicó"; cp "$saved" "$file"; return; }
  echo "== $name"
  (cd src/packages/provider && timeout 120 bun test __tests__/recommendExecution.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)')
  cp "$saved" "$file"; rm -f "$saved"
}
annul allowed-check "$P" '  if (!allowed.some(candidate => sameSelector(candidate, selector))) {' '  if (false && !allowed.some(candidate => sameSelector(candidate, selector))) {'
annul default-chain "$P" '  if (value === undefined) return [{ runtime: PROVIDER_RUNTIME }]' '  if (value === undefined) return []'
annul exhausted-chain "$Q" '  if (chainIndex < 0) {' '  if (false) {'
annul local-fallbacks "$Q" '  return [...new Set(ordered)].filter(name => name !== chosen)' '  return []'
annul typed-trigger "$Q" "  return { trigger: 'insufficient_context'," "  return { trigger: 'unqualified',"
git diff --stat -- "$P" "$Q"
