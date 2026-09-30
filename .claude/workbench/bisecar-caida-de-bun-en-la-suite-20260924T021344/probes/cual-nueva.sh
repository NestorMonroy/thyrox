#!/usr/bin/env bash
# Con el conjunto de outputs/minimo.txt (116) y el objetivo, prueba cada suite
# nueva POR SEPARADO: la que reproduce sola es la que interactua.
set -u
BENCH="$(cd "$(dirname "$0")/.." && pwd)"; cd "$BENCH/../../.."
OBJ=tests/unit/utils/stream.test.ts
mapfile -t base < "$BENCH/outputs/minimo.txt"
for nueva in src/packages/agent/__tests__/internalUtils.test.ts \
             src/packages/config/__tests__/permissionPromptOptIn.test.ts \
             src/packages/provider/__tests__/classifyAPIError.test.ts \
             NINGUNA; do
  extra=(); [[ "$nueva" != NINGUNA ]] && extra=("$nueva")
  mapfile -t lista < <(printf '%s\n' "${base[@]}" "${extra[@]}" | sort -u)
  timeout 300 bun --smol test "${lista[@]}" "$OBJ" > "$BENCH/outputs/con-$(basename "$nueva").txt" 2>&1
  if gawk '/Bun has crashed|Cannot access .Stream. before initialization/{f=1} END{exit !f}' "$BENCH/outputs/con-$(basename "$nueva").txt"
  then echo "REPRODUCE con $nueva"; else echo "no reproduce con $nueva"; fi
done | tee "$BENCH/outputs/cual-nueva.txt"
echo EXIT=0
