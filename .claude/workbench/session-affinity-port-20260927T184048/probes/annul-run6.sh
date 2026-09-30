#!/usr/bin/env bash
# Corre en serie las anulaciones de probes/annul-cases6 (varias tocan el mismo
# archivo) y resume cuántas pruebas cae cada una.
set -uo pipefail
bench=$(cd "$(dirname "$0")/.." && pwd)
source_dir=/home/user/thyrox/src/packages/provider/src/proxy/session
cd /home/user/thyrox/src/packages/provider
while read -r name file; do
  ANNUL_OUT=$bench/outputs/annul6 bash "$bench/probes/annul.sh" "$name" "$source_dir/$file" \
    "$bench/probes/annul-cases6/$name.old" "$bench/probes/annul-cases6/$name.new" \
    __tests__/proxyLcpDifferential.test.ts __tests__/proxySessionIdentity.test.ts >/dev/null 2>&1
  printf '%s\t%s\n' "$name" "$(grep -E ' fail$' "$bench/outputs/annul6/$name.log" | tr -d ' ')"
done < "$bench/probes/annul-cases6/${ANNUL_INDEX:-index.txt}"
