# tsc-sweep-subset

## Qué se lanzó

```
bash -c while read -r t; do echo "== $t"; PYTHONPATH=src timeout 300 python3 "$t" 2>&1 | tail -1; done < .claude/workbench/step-overlap-20260925T235228/tsc-sweep-subset.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
