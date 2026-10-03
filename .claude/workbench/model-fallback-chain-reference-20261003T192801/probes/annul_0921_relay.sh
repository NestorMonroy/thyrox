#!/usr/bin/env bash
# Anulación de TASK-THYROX-0921 (relé): retira cada mitad de juicio y restaura.
set -u
cd "$(git rev-parse --show-toplevel)"
R=src/packages/provider/src/proxy/openaiCompat/admittedUpstream.ts
annul() {
  local name="$1" saved; saved="$(mktemp)"; cp "$R" "$saved"
  OLD="$2" NEW="$3" bash bin/replace_literal "$R" >/dev/null || { echo "$name: anulación no aplicó"; cp "$saved" "$R"; return; }
  echo "== $name"
  (cd src/packages/provider && timeout 120 bun test src/proxy/__tests__/admittedUpstream.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)')
  cp "$saved" "$R"; rm -f "$saved"
}
annul no-advance '  for (let chainIndex = 1; attempt.kind' '  for (let chainIndex = Infinity; attempt.kind'
annul resolve-trigger "  return refusal.stage === 'resolve' ? 'model_not_found' : 'overloaded'" "  return 'overloaded'"
annul server-status '  return status >= SERVER_ERROR_STATUS' '  return false'
annul dedupe-primary '  return [model, ...new Set(fallbackModels.filter(candidate => candidate !== '"''"' && candidate !== model))]' '  return [model, ...fallbackModels]'
annul cancel-on-advance '    await attempt.response.body?.cancel()' '    void 0'
git diff --stat -- "$R"
