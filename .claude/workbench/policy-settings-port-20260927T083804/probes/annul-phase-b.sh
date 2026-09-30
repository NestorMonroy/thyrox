#!/usr/bin/env bash
# Anulaciones de la fase B: la lectura de cada fuente de policySettings.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
THYROX_ANNUL_TEST_TIMEOUT=120 bash bin/annul_parallel $C/settings/policySources.ts $C/__tests__/policySources.test.ts POLICY_SOURCES_MODULE $W/probes/annul-phase-b.tsv > "$W/outputs/annul-phase-b.out" 2>&1
