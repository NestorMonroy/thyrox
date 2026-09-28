#!/usr/bin/env bash
# Anulaciones de la clasificación del rechazo y del reenvío por SDK.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/cloud-sdk-forward-20260927T235948
P=src/packages/provider
{
  echo '== rejectionKind'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/sdk/rejectionKind.ts $P/__tests__/proxySdkRejectionKind.test.ts REJECTION_KIND_MODULE $W/probes/annul-rejection.tsv || true
  echo '== sdkForward'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/sdk/sdkForward.ts $P/__tests__/proxySdkForward.test.ts SDK_FORWARD_MODULE $W/probes/annul-forward.tsv || true
} 2>&1 | tee "$W/outputs/annul.out"
