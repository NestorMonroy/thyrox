# paso-105

## Qué se lanzó

```
bash -c PYTHONPATH=src python3 src/verify/tsc_zero_step.py --root . --candidates .claude/workbench/tsc-zero-loop/run-20260924T175031/step-105/candidates.jsonl --ledger .claude/workbench/tsc-zero-loop/run-20260924T175031/ledger.jsonl --bench .claude/workbench/tsc-zero-loop/run-20260924T175031/step-105 --before-log .claude/workbench/tsc-zero-loop/run-20260924T175031/step-104/final.log --seed 105 --accept-partial -- bash -c 'bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts' > .claude/workbench/tsc-zero-loop/run-20260924T175031/step-105/report.json; python3 -c "import json;r=json.load(open('.claude/workbench/tsc-zero-loop/run-20260924T175031/step-105/report.json'));print(r['status'],r['total_before'],r['total_final'],r['tsc_runs'],len(r['accepted']))"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
