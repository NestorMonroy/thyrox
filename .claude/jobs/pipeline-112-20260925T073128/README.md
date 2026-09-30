# pipeline-112

## Qué se lanzó

```
bash -c PYTHONPATH=src python3 src/verify/pool_pipeline.py --main . --worktree /home/user/thyrox-medicion --items .claude/workbench/tsc-zero-loop/run-20260924T175031/step-112/items.txt --outputs .claude/workbench/tsc-zero-loop/run-20260924T175031/step-112/outputs --bench .claude/workbench/tsc-zero-loop/run-20260924T175031/step-112/pipeline --ledger .claude/workbench/tsc-zero-loop/run-20260924T175031/ledger.jsonl --seed 112 --batch 15 --poll 10 -- bash -c 'bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts'
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
