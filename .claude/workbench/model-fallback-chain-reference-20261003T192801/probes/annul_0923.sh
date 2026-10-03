#!/usr/bin/env bash
# Anulación de TASK-THYROX-0923: la cadena derivada por defecto.
set -u
cd "$(git rev-parse --show-toplevel)"
P=src/packages/provider/src/cost/executionPolicy.ts
Q=src/packages/provider/src/cost/policy.ts
J=src/session/execution_policy.json
annul() {
  local name="$1" file="$2" saved; saved="$(mktemp)"; cp "$file" "$saved"
  OLD="$3" NEW="$4" bash bin/replace_literal "$file" >/dev/null || { echo "$name: anulación no aplicó"; cp "$saved" "$file"; return; }
  echo "== $name"
  (cd src/packages/provider && timeout 120 bun test __tests__/recommendExecution.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)')
  cp "$saved" "$file"; rm -f "$saved"
}
annul invented-default "$P" '  if (value === undefined) return undefined
  if (!Array.isArray(value))' '  if (value === undefined) return [{ runtime: PROVIDER_RUNTIME }]
  if (!Array.isArray(value))'
annul derived-order "$Q" '    ? qualified.map(candidate => candidate.entry.name)' '    ? []'
annul derived-blocked "$Q" '  if (chain === undefined) {' '  if (false) {'
annul kill-switch "$Q" '  if (policy === undefined || !policy.fallback.enabled) return []' '  if (policy === undefined) return []'
annul repo-closed "$J" '  "fallback": { "enabled": true },' '  "fallback": { "enabled": false },'
git diff --stat -- "$P" "$Q" "$J"
