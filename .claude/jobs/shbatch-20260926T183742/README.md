# shbatch

## Qué se lanzó

```
bash -c parallel -j3 -k 'echo == {}; timeout 300 bash {} > .claude/workbench/all-tsconfigs-20260926T174919/sh-$(basename {}).log 2>&1; echo EXIT=$?; tail -15 .claude/workbench/all-tsconfigs-20260926T174919/sh-$(basename {}).log' :::: .claude/workbench/all-tsconfigs-20260926T174919/sh-batch.txt > .claude/workbench/all-tsconfigs-20260926T174919/sh-batch.log 2>&1; echo DONE >> .claude/workbench/all-tsconfigs-20260926T174919/sh-batch.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
