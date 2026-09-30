#!/usr/bin/env bash
# Anulaciones de la fase C.1: la fusión por restricción de policySettings.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
THYROX_ANNUL_TEST_TIMEOUT=120 bash bin/annul_parallel $C/settings/policyMerge.ts $C/__tests__/policyMerge.test.ts POLICY_MERGE_MODULE $W/probes/annul-phase-c1.tsv > "$W/outputs/annul-phase-c1.out" 2>&1
