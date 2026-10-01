#!/usr/bin/env bash
# Suites derivadas de lo integrado del pool (ítems 3 y 4), cada una con su exit.
set -u
cd "$(git rev-parse --show-toplevel)"
fails=0
run() { echo "== $*"; "$@"; local c=$?; echo "exit=$c"; [ $c -eq 0 ] || fails=$((fails+1)); }
run bash -c 'cd src/packages/cli && bun test __tests__/providersWriteVerbs.test.ts __tests__/providersCommands.test.ts __tests__/providersAnthropicCredential.test.ts'
run bash -c 'cd src/packages/provider && bun test __tests__/credentialProxyProcess.test.ts __tests__/storeCredentialProxyProcess.test.ts'
run bash bin/check_package_typecheck --strict cli provider
echo "suites-fallidas=$fails"
exit $((fails > 0))
