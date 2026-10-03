# iw-suites

## Qué se lanzó

```
bash -c for t in tests/session/test-item-worktree-*.sh tests/session/test-headless-pool-worktree.sh; do echo "== $t"; bash "$t" 2>&1 | tail -2; done; shellcheck -x src/session/item_worktree.sh tests/session/test-item-worktree-sparse.sh && echo SHELLCHECK_OK
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
