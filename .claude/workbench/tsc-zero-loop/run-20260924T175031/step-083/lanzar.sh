#!/usr/bin/env bash
# Paso 083: base fresca (non-null-in-tests ahora cubre TS2345/TS2769),
# candidatos de todos los proponentes y el paso verificado.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
S=.claude/workbench/tsc-zero-loop/run-20260924T175031/step-083
{ bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts; } > $S/base.log 2>&1
echo "base: $(grep -c 'error TS' $S/base.log)"
bin/tsc_proposers > $S/candidates.jsonl 2> $S/proposers.stderr || exit 2
tail -1 $S/proposers.stderr
PYTHONPATH=src python3 src/verify/tsc_zero_step.py --root . --candidates $S/candidates.jsonl \
  --ledger .claude/workbench/tsc-zero-loop/run-20260924T175031/ledger.jsonl --bench $S --before-log $S/base.log --seed 83 \
  -- bash -c 'bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts' > $S/report.json
python3 -c "import json;r=json.load(open('$S/report.json'));print({k:r[k] for k in r if k in ('total_before','total_final','tsc_runs','accepted','outcome')})"
# Conducta: cada prueba editada debe transpilar idéntica a HEAD.
git diff --name-only -- src tests > $S/transpiled-files.txt
bun $S/compare_transpiled.ts $S/transpiled-files.txt > $S/transpiled.log 2>&1; cat $S/transpiled.log | tail -3
