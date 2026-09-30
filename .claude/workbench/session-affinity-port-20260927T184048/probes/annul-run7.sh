#!/usr/bin/env bash
# Corre en serie las anulaciones de probes/annul-cases7 (varias tocan el mismo
# archivo) y resume cuántas pruebas cae cada una.
set -uo pipefail
bench=$(cd "$(dirname "$0")/.." && pwd)
source_dir=/home/user/thyrox/src/packages/provider/src/proxy
cd /home/user/thyrox/src/packages/provider
while read -r name file; do
  ANNUL_OUT=$bench/outputs/annul7 bash "$bench/probes/annul.sh" "$name" "$source_dir/$file" \
    "$bench/probes/annul-cases7/$name.old" "$bench/probes/annul-cases7/$name.new" \
    __tests__/proxySessionAffinityLcp.test.ts __tests__/proxySessionAffinity.test.ts __tests__/proxyServer.test.ts >/dev/null 2>&1
  printf '%s\t%s\n' "$name" "$(grep -E ' fail$' "$bench/outputs/annul7/$name.log" | tr -d ' ')"
done < "$bench/probes/annul-cases7/${ANNUL_INDEX:-index.txt}"
