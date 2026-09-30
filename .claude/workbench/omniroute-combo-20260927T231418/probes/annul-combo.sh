#!/usr/bin/env bash
# Anulaciones de las métricas por combo y del ordenador por estrategia.
set -euo pipefail
cd /home/user/thyrox
B=.claude/workbench/omniroute-combo-20260927T231418
P=src/packages/provider
{
  echo '== comboMetrics'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/combo/comboMetrics.ts $P/__tests__/proxyComboMetrics.test.ts COMBO_METRICS_MODULE $B/probes/annul-combo-metrics.tsv || true
  echo '== comboRouter'; THYROX_ANNUL_TEST_TIMEOUT=60 bash bin/annul_parallel $P/src/proxy/combo/comboRouter.ts $P/__tests__/proxyComboRouter.test.ts COMBO_ROUTER_MODULE $B/probes/annul-combo-router.tsv || true
} 2>&1 | tee "$B/outputs/annul-combo.out"
