# d1-suite-pg2

## Qué se lanzó

```
bash -c export THYROX_TEST_POSTGRES_URL="$(sed -n "s/^THYROX_TEST_POSTGRES_URL=//p" .env)"; cd src/packages/store && timeout 300 bun test 2>&1 | grep -E "^ *[0-9]+ (pass|fail|skip|todo)|Ran|\(fail\)|\(skip\)|\(todo\)"; cd ../local-observability && timeout 300 bun test __tests__/errorStore* 2>&1 | grep -E "^ *[0-9]+ (pass|fail|skip|todo)|Ran|\(fail\)|\(skip\)|\(todo\)"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
