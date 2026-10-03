# boot-red

## Qué se lanzó

```
bash -c cd src/packages/infrastructure && bun test 2>&1 | grep -E "^\(fail\)| pass$| fail$|error:" | head -20; echo TEST_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
