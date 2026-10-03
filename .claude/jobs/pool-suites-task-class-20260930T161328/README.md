# pool-suites-task-class

## Qué se lanzó

```
bash -c for s in test-headless-pool test-headless-pool-worktree test-headless-pool-thyrox-p test-headless-pool-credential-source test-headless-pool-lifecycle test-headless-pool-item-drain test-headless-pool-exit-live-items test-headless-pool-frozen-launcher; do echo "== $s"; bash tests/session/$s.sh 2>&1 | tail -2; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
