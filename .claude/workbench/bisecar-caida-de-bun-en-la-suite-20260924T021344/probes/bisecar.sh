#!/usr/bin/env bash
# Delta debugging de la caida de Bun (segfault tras `Stream` en TDZ en
# tests/unit/utils/stream.test.ts). Conserva siempre las suites NUEVAS del
# pase (NUEVAS) y el objetivo (stream.test.ts); parte el resto del prefijo por
# mitades y se queda con la mitad que todavia reproduce.
set -u
BENCH="$(cd "$(dirname "$0")/.." && pwd)"; cd "$BENCH/../../.."
OBJ=tests/unit/utils/stream.test.ts
NUEVAS=(src/packages/agent/__tests__/internalUtils.test.ts
        src/packages/config/__tests__/permissionPromptOptIn.test.ts
        src/packages/provider/__tests__/classifyAPIError.test.ts)
mapfile -t todas < <(find src tests -name '*.test.ts' -not -path '*/node_modules/*' | sort)
resto=()
for f in "${todas[@]}"; do
  [[ "$f" == "$OBJ" ]] && break
  keep=1; for n in "${NUEVAS[@]}"; do [[ "$f" == "$n" ]] && keep=0; done
  (( keep )) && resto+=("$f")
done
reproduce() {  # $@ = candidatos; 0 si se cae o hay TDZ en Stream
  local lista; mapfile -t lista < <(printf '%s\n' "$@" "${NUEVAS[@]}" | sort -u)
  timeout 300 bun --smol test "${lista[@]}" "$OBJ" > "$BENCH/outputs/ultima.txt" 2>&1
  gawk '/Bun has crashed|Cannot access .Stream. before initialization/{f=1} END{exit !f}' "$BENCH/outputs/ultima.txt"
}
echo "prefijo: ${#resto[@]} archivos" | tee "$BENCH/outputs/traza.txt"
reproduce "${resto[@]}" || { echo "el prefijo NO reproduce" | tee -a "$BENCH/outputs/traza.txt"; echo EXIT=3; exit 3; }
while (( ${#resto[@]} > 1 )); do
  mitad=$(( ${#resto[@]} / 2 ))
  a=("${resto[@]:0:$mitad}"); b=("${resto[@]:$mitad}")
  if reproduce "${a[@]}"; then resto=("${a[@]}"); echo "A reproduce: ${#resto[@]}" | tee -a "$BENCH/outputs/traza.txt"
  elif reproduce "${b[@]}"; then resto=("${b[@]}"); echo "B reproduce: ${#resto[@]}" | tee -a "$BENCH/outputs/traza.txt"
  else echo "ninguna mitad sola reproduce con ${#resto[@]}: interaccion entre mitades" | tee -a "$BENCH/outputs/traza.txt"; break; fi
done
printf '%s\n' "${resto[@]}" > "$BENCH/outputs/minimo.txt"
( reproduce ) && echo "SIN RESTO: bastan las nuevas + el objetivo" | tee -a "$BENCH/outputs/traza.txt"
echo EXIT=0
