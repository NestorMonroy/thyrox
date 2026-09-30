# d1-suite-pg

## Qué se lanzó

```
bash -c export THYROX_TEST_POSTGRES_URL="$(sed -n "s/^THYROX_TEST_POSTGRES_URL=//p" .env)"; test -n "$THYROX_TEST_POSTGRES_URL" && echo "pg-url=set"; cd src/packages/store && timeout 300 bun test 2>&1 | grep -E "pass|fail|skip|todo|Ran|\(skip\)|\(todo\)"; cd ../local-observability && timeout 300 bun test __tests__/errorStore* 2>&1 | grep -E "pass|fail|skip|todo|Ran|\(skip\)|\(todo\)"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
