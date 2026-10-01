#!/usr/bin/env bash
# Anulaciones de la fase C.2b: la composición de policySettings (UP y consumidores).
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
THYROX_ANNUL_TEST_TIMEOUT=120 bash bin/annul_parallel $C/settings/policySettings.ts $C/__tests__/policySettings.test.ts POLICY_SETTINGS_MODULE $W/probes/annul-phase-c2b.tsv > "$W/outputs/annul-phase-c2b.out" 2>&1
