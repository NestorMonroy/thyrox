# a2b-suites

## Qué se lanzó

```
bash -c bash bin/parallel_map "cd src/packages/{} && bun test 2>&1 | tail -4 | sed s/^/{}:\ /" ::: task tools agent cli; python3 tests/agents/test_agent_store_migrations.py | tail -1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
