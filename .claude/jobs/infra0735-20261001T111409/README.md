# infra0735

## Qué se lanzó

```
bash -c bash tests/lib/test-infrastructure.sh 2>&1 | tail -5; echo LIBEXIT=${PIPESTATUS[0]}; bash tests/session/test-infrastructure-ensure.sh 2>&1 | tail -5; echo ENSEXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
