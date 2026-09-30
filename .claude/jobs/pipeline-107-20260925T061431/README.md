# pipeline-107

## Qué se lanzó

```
bash -c PYTHONPATH=src python3 src/verify/pool_pipeline.py --main . --worktree /home/user/thyrox-medicion --items .claude/workbench/tsc-zero-loop/run-20260924T175031/step-107/items.txt --outputs .claude/workbench/tsc-zero-loop/run-20260924T175031/step-107/outputs --bench .claude/workbench/tsc-zero-loop/run-20260924T175031/step-107/pipeline --ledger .claude/workbench/tsc-zero-loop/run-20260924T175031/ledger.jsonl --seed 107 --batch 1000 --poll 5 -- bash -c 'bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts'
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
