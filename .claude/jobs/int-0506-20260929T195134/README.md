# int-0506

## Qué se lanzó

```
bash -c for t in tests/session/test-headless-pool-frozen-launcher.sh tests/session/test-headless-pool.sh tests/session/test-headless-pool-worktree.sh; do bash "$t" 2>&1 | tail -1 | sed "s|^|$t :: |"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
