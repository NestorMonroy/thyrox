#!/usr/bin/env bash
# Con el conjunto minimo (116) y el objetivo, revierte a HEAD UN modulo cambiado
# cada vez (git stash push -- <modulo>) y mira si la caida desaparece.
set -u
BENCH="$(cd "$(dirname "$0")/.." && pwd)"; cd "$BENCH/../../.."
OBJ=tests/unit/utils/stream.test.ts
mapfile -t base < "$BENCH/outputs/minimo.txt"
for mod in src/packages/provider/src/errors.ts src/packages/config/settings/settings.ts src/packages/agent/internalUtils.ts; do
  git stash push -q -m "sin-$(basename "$mod")" -- "$mod" || { echo "no se pudo apartar $mod"; continue; }
  timeout 300 bun --smol test "${base[@]}" "$OBJ" > "$BENCH/outputs/sin-$(basename "$mod").txt" 2>&1
  if gawk '/Bun has crashed|Cannot access .Stream. before initialization/{f=1} END{exit !f}' "$BENCH/outputs/sin-$(basename "$mod").txt"
  then echo "SIGUE cayendo sin $mod"; else echo "DESAPARECE sin $mod"; fi
  git stash pop -q
done | tee "$BENCH/outputs/cual-modulo.txt"
git status --short -- src/packages/provider/src/errors.ts src/packages/config/settings/settings.ts src/packages/agent/internalUtils.ts
echo EXIT=0
