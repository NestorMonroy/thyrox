# pybatch

## Qué se lanzó

```
bash -c parallel -j3 -k 'echo == {}; timeout 300 python3 {} 2>&1 | tail -12; echo EXIT=$?' :::: .claude/workbench/all-tsconfigs-20260926T174919/py-batch.txt > .claude/workbench/all-tsconfigs-20260926T174919/py-batch.log 2>&1; echo DONE >> .claude/workbench/all-tsconfigs-20260926T174919/py-batch.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
