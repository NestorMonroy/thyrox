# revision-112

## Qué se lanzó

```
bash -c bun .claude/workbench/tsc-zero-loop/run-20260924T175031/step-100/removed_calls.ts .claude/workbench/tsc-zero-loop/run-20260924T175031/step-112/kept.txt | grep -v '^sin llamadas\|^idéntico'; bash bin/run-task-pool --width 4 --timeout 1500 .claude/cache/t112/commands.txt >/dev/null 2>&1; echo TESTS; gawk '$1!=0' .claude/cache/t112/verdicts.txt; wc -l < .claude/cache/t112/verdicts.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
