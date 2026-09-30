# f7e-verify

## Qué se lanzó

```
bash -c cd src/packages/mitm && bun test 2>&1 | tail -4; for p in mitm transparent-napi; do for c in build test; do echo "tsc $p/$c: $(cd /home/user/thyrox/src/packages/$p && bunx tsc -p tsconfig.$c.json --noEmit 2>&1 | grep -c "error TS")"; (cd /home/user/thyrox/src/packages/$p && bunx tsc -p tsconfig.$c.json --noEmit 2>&1 | grep "error TS" | head -8); done; done; cd /home/user/thyrox/src/packages/transparent-napi && bun test 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
