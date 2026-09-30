# appbatch

## Qué se lanzó

```
bash -c for t in $(cat .claude/workbench/all-tsconfigs-20260926T174919/app-batch.txt); do echo == $t; timeout 600 bash $t > .claude/workbench/all-tsconfigs-20260926T174919/app-$(basename $t).log 2>&1; echo EXIT=$?; tail -4 .claude/workbench/all-tsconfigs-20260926T174919/app-$(basename $t).log; done > .claude/workbench/all-tsconfigs-20260926T174919/app-batch.log 2>&1; echo == censo; timeout 600 python3 tests/corpus/test_censo_contraparte.py > .claude/workbench/all-tsconfigs-20260926T174919/app-censo.log 2>&1; echo EXIT=$? >> .claude/workbench/all-tsconfigs-20260926T174919/app-batch.log; tail -4 .claude/workbench/all-tsconfigs-20260926T174919/app-censo.log >> .claude/workbench/all-tsconfigs-20260926T174919/app-batch.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
