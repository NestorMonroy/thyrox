#!/usr/bin/env bash
# Anulaciones del adaptador de Messages y de su cableado en el servidor y el arranque.
set -euo pipefail
cd /home/user/thyrox
B=.claude/workbench/omniroute-context-manager-20260927T230105
P=src/packages/provider
run() { THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel "$P/src/proxy/$1" "$P/__tests__/$2" "$3" "$B/probes/$4" || true; }
{
  echo '== compactRequest'; run context/compactRequest.ts proxyCompactRequest.test.ts COMPACT_REQUEST_MODULE annul-compact-request.tsv
  echo '== server'; run server.ts proxyServerCompaction.test.ts PROXY_SERVER_MODULE annul-server-compaction.tsv
  echo '== startServer'; run startServer.ts proxyStartServer.test.ts PROXY_START_SERVER_MODULE annul-start-compaction.tsv
} 2>&1 | tee "$B/outputs/annul-wiring.out"
