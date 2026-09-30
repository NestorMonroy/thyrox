# tsc184

## Qué se lanzó

```
bash -c cd /home/user/thyrox && for p in shell tool-registry; do (cd src/packages/$p && bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep -v TS6059 | grep 'error TS' | head -5; echo "$p done"); done > .claude/workbench/lodash-per-function-184-20260928T171936/typecheck.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
