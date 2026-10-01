# orm-tests

## Qué se lanzó

```
bash -c for p in agent cli command-runtime config ink local-observability paths provider repl shell swarm tool-registry updater workbench; do echo "== $p"; (cd src/packages/$p && bun test 2>&1 | grep -E '^ *[0-9]+ (pass|fail)|^Ran ' ); done; echo '== test_write_env'; uv run python tests/session/test_write_env.py 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
