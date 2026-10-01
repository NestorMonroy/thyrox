#!/usr/bin/env bash
# Suites derivadas de lo integrado del pool B, cada una con su exit.
set -u
cd "$(git rev-parse --show-toplevel)"
fails=0
run() { echo "== $*"; "$@"; local c=$?; echo "exit=$c"; [ $c -eq 0 ] || fails=$((fails+1)); }
run bash -c 'cd src/packages/daemon && bun test src/__tests__/podmanWorkerManager.test.ts src/__tests__/podmanWorkerSupervision.test.ts src/__tests__/bgDaemonWorkerSupervision.test.ts src/__tests__/workerContainerLifecycle.test.ts'
run bash -c 'cd src/packages/provider && bun test src/proxy/__tests__/claudeCliUpstream.test.ts'
run bash tests/daemon/test-podman-worker-manager-real.sh
run bash bin/check_package_typecheck --strict daemon provider
echo "suites-fallidas=$fails"
exit $((fails > 0))
