# data-suites

## Qué se lanzó

```
bash -c export THYROX_TEST_POSTGRES_URL="$(sed -n "s/^THYROX_TEST_POSTGRES_URL=//p" .env)"; for p in mitm provider local-observability; do (cd src/packages/$p && timeout 900 bun test 2>&1 | tail -4 | sed "s|^|$p: |"); done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
