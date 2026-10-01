#!/usr/bin/env bash
# Anulaciones del cableado de los combos en el servidor y en el arranque.
set -euo pipefail
cd /home/user/thyrox
B=.claude/workbench/omniroute-combo-20260927T231418
P=src/packages/provider
{
  echo '== server'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/server.ts $P/__tests__/proxyServerCombo.test.ts PROXY_SERVER_MODULE $B/probes/annul-server-combo.tsv || true
  echo '== startServer'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/startServer.ts $P/__tests__/proxyStartServer.test.ts PROXY_START_SERVER_MODULE $B/probes/annul-start-combo.tsv || true
} 2>&1 | tee "$B/outputs/annul-combo-wiring.out"
