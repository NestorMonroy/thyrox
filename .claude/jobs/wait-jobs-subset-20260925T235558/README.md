# wait-jobs-subset

## Qué se lanzó

```
bash -c for t in $(cat .claude/workbench/step-overlap-20260925T235228/wait-jobs-subset.txt); do echo "== $t"; timeout 300 bash $t 2>&1 | tail -2; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
