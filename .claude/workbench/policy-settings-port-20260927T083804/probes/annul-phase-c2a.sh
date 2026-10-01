#!/usr/bin/env bash
# Anulaciones de la fase C.2a: la porción del padre y la supresión de pares AWS.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/policy-settings-port-20260927T083804
C=src/packages/config
export THYROX_ANNUL_TEST_TIMEOUT=120
bash bin/annul_parallel $C/settings/policyParent.ts $C/__tests__/policyParent.test.ts POLICY_PARENT_MODULE $W/probes/annul-phase-c2a.tsv > "$W/outputs/annul-phase-c2a.out" 2>&1
bash bin/annul_parallel $C/settings/policyMerge.ts $C/__tests__/policyMerge.test.ts POLICY_MERGE_MODULE $W/probes/annul-phase-c2a-merge.tsv > "$W/outputs/annul-phase-c2a-merge.out" 2>&1
bash bin/annul_parallel $C/settings/policyComposition.ts $C/__tests__/policyComposition.test.ts POLICY_COMPOSITION_MODULE $W/probes/annul-phase-c2a-pairs.tsv > "$W/outputs/annul-phase-c2a-pairs.out" 2>&1
