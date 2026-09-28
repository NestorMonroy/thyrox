# mitm-f7c-suite

## Qué se lanzó

```
bash -c cd src/packages/mitm && bun test 2>&1 | tail -6; cd /home/user/thyrox && bash bin/emit_declarations mitm 2>&1 | tail -2; cd src/packages/mitm && echo "tsc_errors=$(timeout 300 bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep -c "error TS")"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
