#!/usr/bin/env bash
# Anulación de TASK-THYROX-0921 (cableado): proxy y delegación, cada uno por separado.
set -u
cd "$(git rev-parse --show-toplevel)"
L=src/packages/provider/bin/localProxy.ts
D=src/packages/cli/src/entry/printDelegation.ts
annul() {  # nombre archivo viejo nuevo
  local name="$1" file="$2" saved; saved="$(mktemp)"; cp "$file" "$saved"
  OLD="$3" NEW="$4" bash bin/replace_literal "$file" >/dev/null || { echo "$name: anulación no aplicó"; cp "$saved" "$file"; return; }
  echo "== $name"
  (cd src/packages/provider && timeout 120 bun test src/proxy/__tests__/localModelProxy.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)')
  (cd src/packages/cli && timeout 120 bun test __tests__/printDelegation.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)')
  cp "$saved" "$file"; rm -f "$saved"
}
annul proxy-flag "$L" "const fallbackModels = repeatedArgument('--fallback-model')" "const fallbackModels: string[] = []"
annul delegation-env "$D" "...contextArguments(options.env), ...fallbackArguments(options.env)]" "...contextArguments(options.env)]"
git diff --stat -- "$L" "$D"
