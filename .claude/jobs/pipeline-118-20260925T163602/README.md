# pipeline-118

## Qué se lanzó

```
bash -c PYTHONPATH=src python3 src/verify/pool_pipeline.py --main . --worktree /home/user/thyrox-medicion --items .claude/workbench/tsc-zero-loop/run-20260924T175031/step-118/items.txt --outputs .claude/workbench/tsc-zero-loop/run-20260924T175031/step-118/outputs --bench .claude/workbench/tsc-zero-loop/run-20260924T175031/step-118/pipeline --ledger .claude/workbench/tsc-zero-loop/run-20260924T175031/ledger.jsonl --seed 118 --batch 15 --poll 10 -- bash -c 'bunx tsc --noEmit -p tsconfig.json; bun src/verify/message_shape_audit.ts'
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
