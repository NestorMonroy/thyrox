# d1-suite

## Qué se lanzó

```
bash -c set -a; . ./.env; set +a; cd src/packages/store && timeout 300 bun test 2>&1 | tail -15; cd ../local-observability && timeout 300 bun test __tests__/errorStore* 2>&1 | tail -6
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
