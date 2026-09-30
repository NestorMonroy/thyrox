# mitm-f7d-suite

## Qué se lanzó

```
bash -c cd src/packages/mitm && bun test 2>&1 | tail -5; cd /home/user/thyrox && bash bin/emit_declarations mitm 2>&1 | tail -1; echo tsc_errors=$(bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep -c 'error TS')
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
