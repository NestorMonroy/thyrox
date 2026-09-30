#!/usr/bin/env bash
# Suites derivadas de los símbolos tocados y typecheck de los dos paquetes;
# cada una con su propio código de salida (TASK-THYROX-0649: nada por `| tail`).
set -u
cd "$(git rev-parse --show-toplevel)"
fails=0
run() { echo "== $*"; "$@"; local c=$?; echo "exit=$c"; [ $c -eq 0 ] || fails=$((fails+1)); }
run bash -c 'cd src/packages/daemon && bun test src/__tests__/podmanWorkerManager.test.ts src/__tests__/workerContainerLifecycle.test.ts src/__tests__/workerResourceProfile.test.ts src/__tests__/repositoryJobProfile.test.ts src/__tests__/specializedWorkerProfile.test.ts'
run bash -c 'cd src/packages/config && bun test __tests__/gpuAdmission.test.ts'
run bash bin/check_package_typecheck --strict daemon config
echo "suites-fallidas=$fails"
exit $((fails > 0))
