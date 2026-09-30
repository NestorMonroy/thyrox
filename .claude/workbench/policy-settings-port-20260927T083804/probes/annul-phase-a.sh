#!/usr/bin/env bash
# Anulaciones de la fase A: las piezas puras de la composición de policySettings.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
THYROX_ANNUL_TEST_TIMEOUT=120 bash bin/annul_parallel $C/settings/policyComposition.ts $C/__tests__/policyComposition.test.ts POLICY_COMPOSITION_MODULE $W/probes/annul-phase-a.tsv > "$W/outputs/annul-phase-a.out" 2>&1
