#!/usr/bin/env bash
# Anulaciones de la construcción del cliente de nube por upstream.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/cloud-sdk-forward-20260927T235948
P=src/packages/provider
env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY THYROX_ANNUL_TEST_TIMEOUT=90 bash bin/annul_parallel $P/src/proxy/sdk/cloudClients.ts $P/__tests__/proxySdkCloudClients.test.ts CLOUD_CLIENTS_MODULE $W/probes/annul-cloud.tsv 2>&1 | tee "$W/outputs/annul-cloud.out"
