# verify-local-models

## Qué se lanzó

```
bash -c cd src/packages/local-models && bun install >/dev/null 2>&1; bun test 2>&1 | tail -4; cd /home/user/thyrox && bash bin/check_package_typecheck --strict local-models 2>&1 | tail -1; bash bin/generate_bin --check 2>&1 | tail -1; bash bin/local-models-catalog --help 2>&1 | head -5; bash bin/local-models-qualify --help 2>&1 | head -5
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
