#!/usr/bin/env bash
# Anulaciones del resumen del error del upstream y de su cableado como causa del 429.
set -euo pipefail
cd /home/user/thyrox
B=.claude/workbench/cliproxyapi-upstream-error-summary-20260927T232018
P=src/packages/provider
T=$P/__tests__
run() { THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel "$@" || true; }
{
  echo '== upstreamErrorSummary'; run $P/src/proxy/upstreamErrorSummary.ts $T/proxyUpstreamErrorSummary.test.ts UPSTREAM_ERROR_SUMMARY_MODULE $B/probes/annul-summary.tsv
  echo '== ModelCooldownError (causa)'; run $P/src/proxy/credentialSelectors.ts $T/proxyModelCooldownCause.test.ts CREDENTIAL_SELECTORS_MODULE $B/probes/annul-cause.tsv
  echo '== credentialCooldown / proxyCredentialCooldown'; run $P/src/proxy/resilience/credentialCooldown.ts $T/proxyCredentialCooldown.test.ts CREDENTIAL_COOLDOWN_MODULE $B/probes/annul-cooldown-cause.tsv
  echo '== credentialCooldown / proxyModelCooldownCause'; run $P/src/proxy/resilience/credentialCooldown.ts $T/proxyModelCooldownCause.test.ts CREDENTIAL_COOLDOWN_MODULE $B/probes/annul-cooldown-cause.tsv
  echo '== server'; run $P/src/proxy/server.ts $T/proxyModelCooldownCause.test.ts PROXY_SERVER_MODULE $B/probes/annul-server-cause.tsv
} 2>&1 | tee "$B/outputs/annul-cause.out"
