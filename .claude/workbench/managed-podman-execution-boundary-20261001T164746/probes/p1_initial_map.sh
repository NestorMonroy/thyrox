#!/usr/bin/env bash
# p1 — mide el vocabulario de ejecución sobre el árbol versionado: referencias
# por nombre exacto, definiciones y quién importa cada concepto.
# Métrica: líneas de `git grep -w` sobre src, tests y bin.
# Ciega a: un concepto nombrado con otra palabra, y a la evidencia de bancos.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "# HEAD $(git rev-parse --short HEAD)"
printf '%-30s %8s %6s\n' concept lines files
for word in ExecutionGrant ExecutionAuthorization ExecutionUnit MaterializedContainer \
            ModelExecutionPrimitive PodmanModelExecutionPrimitive PodmanExecutionPrimitive \
            materializeExecution runExecution materializeContainer podman-execution-execute; do
  printf '%-30s %8s %6s\n' "$word" "$(git grep -wn "$word" -- src tests bin </dev/null | wc -l)" \
    "$(git grep -wl "$word" -- src tests bin </dev/null | wc -l)"
done
echo; echo "## definiciones"
git grep -nE "^export (type|interface|class|async function|function) (ExecutionGrant|ExecutionAuthorization|ExecutionUnit|MaterializedContainer|ModelExecutionPrimitive|PodmanModelExecutionPrimitive|materializeExecution|runExecution|materializeContainer)\b" -- src </dev/null
echo; echo "## quién materializa (importadores de las funciones de la primitiva)"
git grep -lE "\b(materializeExecution|runExecution|materializeContainer|runJobWithOutput)\b" -- src </dev/null | grep -v "/__tests__/"
echo; echo "## entradas públicas que alcanzan la primitiva"
ls bin | grep -E "podman|execution" || true
git grep -n "podman-execution/bin/execute.ts" -- bin src </dev/null
echo; echo "## quién invoca el CLI"
git grep -ln "podman-execution-execute\|podman-execution/bin/execute" -- src tests bin </dev/null
