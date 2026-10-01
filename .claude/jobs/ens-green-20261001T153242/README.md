# ens-green

## Qué se lanzó

```
bash -c for t in tests/session/test-infrastructure-ensure.sh tests/lib/test-infrastructure.sh tests/lib/test-infrastructure-desired.sh tests/session/test-podman-lock-recovery.sh; do echo "== $t"; bash $t > /dev/null 2>"$t.err.tmp"; r=$?; bash $t 2>&1 | grep -E "FALLO|casos:"; echo "EXIT $t=$r"; rm -f "$t.err.tmp"; done; echo SUITE_DONE
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
