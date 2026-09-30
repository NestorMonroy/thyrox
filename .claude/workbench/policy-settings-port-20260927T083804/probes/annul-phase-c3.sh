#!/usr/bin/env bash
# Anulaciones de la fase C.3: el cableado de policySettings en settings.ts.
# La prueba importa settings.ts por ruta relativa, así que cada variante corre
# sobre una copia del paquete entero con la anulación aplicada.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
export ROOT="$PWD/.claude/cache/policy-wiring-annul/$$"
trap 'rm -rf "${ROOT:?}"; rmdir "${ROOT%/*}" 2>/dev/null || true' EXIT
mkdir -p "$ROOT"
run() {
  local label="$1" file="$2" expr="$3" dir="$ROOT/$1/config"
  mkdir -p "$ROOT/$1" && cp -a src/packages/config "$dir"
  sed -i -e "$expr" "$dir/$file"
  if [[ "$label" != base ]] && cmp -s "src/packages/config/$file" "$dir/$file"; then
    printf '%s\tNO-CAMBIO\n' "$label"; return
  fi
  printf '%s\t%s\n' "$label" "$(cd "$dir" && timeout 120 bun test __tests__/policySettingsWiring.test.ts 2>&1 | gawk '/^ *[0-9]+ pass/ {p=$1} /^ *[0-9]+ fail/ {f=$1} /^\(fail\)/ {sub(/^\(fail\) /,""); sub(/ \[[0-9.]+ms\]$/,""); n = n s $0; s=" | "} END {printf "%d pass, %d fail\t%s", p, f, (n==""?"—":n)}')"
}
export -f run
parallel -j3 -k --colsep '\t' run {1} {2} {3} < $W/probes/annul-phase-c3.tsv > "$W/outputs/annul-phase-c3.out"
