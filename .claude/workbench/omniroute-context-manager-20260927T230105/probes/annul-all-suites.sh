#!/usr/bin/env bash
# Corre las mismas variantes sobre cada suite del gestor de contexto y junta,
# por variante, los fallos de todas: una variante discrimina si alguna cae.
set -euo pipefail
cd /home/user/thyrox
B=.claude/workbench/omniroute-context-manager-20260927T230105
out="$B/outputs/annul-context-manager"
mkdir -p "$out"
for t in src/packages/provider/__tests__/proxyContext*.test.ts; do
  THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel src/packages/provider/src/proxy/context/contextManager.ts "$t" \
    CONTEXT_MANAGER_MODULE "$B/probes/annul-context-manager.tsv" > "$out/$(basename "$t" .test.ts).tsv" 2>&1 || true
done
gawk -F'\t' '{ split($2, a, " "); fails[$1] += a[3]; if ($3 != "—") names[$1] = names[$1] " | " FILENAME ": " $3 }
  END { for (v in fails) printf "%s\t%d fail%s\n", v, fails[v], (fails[v] ? "" : "  <-- NO DISCRIMINA") }' "$out"/*.tsv | sort
