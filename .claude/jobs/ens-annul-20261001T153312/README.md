# ens-annul

## Qué se lanzó

```
bash -c bash tests/session/test-infrastructure-ensure.sh 2>&1 | grep -E 'FALLO|casos:'; cp '/home/user/thyrox/.thyrox/runtime/ensure.orig' src/session/infrastructure_ensure.sh; git diff --stat -- src/session/infrastructure_ensure.sh | tail -1; echo ANNUL_DONE
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
