#!/usr/bin/env bash
# Anulaciones del idioma de los identificadores en TypeScript: el gate y su recorrido.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/typescript-identifier-language-20260927T235313
T=tests/verify/test_identifier_language_typescript.py
{
  echo '== check_identifier_language.py'; THYROX_ANNUL_TEST_TIMEOUT=180 bash bin/annul_parallel src/verify/check_identifier_language.py $T IDENTIFIER_GATE_MODULE $W/probes/annul-gate.tsv || true
  echo '== ts_declared_identifiers.ts'; THYROX_ANNUL_TEST_TIMEOUT=180 bash bin/annul_parallel src/verify/ts_declared_identifiers.ts $T THYROX_TS_IDENTIFIER_EXTRACTOR $W/probes/annul-extractor.tsv || true
} 2>&1 | tee "$W/outputs/annul.out"
