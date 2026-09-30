#!/usr/bin/env bash
# Anulaciones de #106e-5d-1: token LLM de Zed y catálogo de modelos.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
Z="src/accounts/zed/zedLlm.ts"
run() { timeout 120 bun test ./__tests__/accounts/zed/zedLlm.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 6: id en arreglo"; annul "$Z" "    if (typeof record[0] === 'string') return record[0]" ""
echo "== 34: forzado comparte"; annul "$Z" "    if (existing && !options.forceRefresh) return existing" "    if (existing) return existing"
echo "== restaurado"; run
bunx tsc -p tsconfig.test.json --noEmit | gawk "/error TS/"; echo TEST_DONE
