# a2-suites

## Qué se lanzó

```
bash -c for p in tools agent cli task; do (cd src/packages/$p && timeout 900 bun test 2>&1 | grep -E "^ *[0-9]+ (pass|fail)|^Ran" | sed "s|^|$p: |"); done; for t in tests/agents/test-agent-store-*.sh; do r=$(timeout 300 bash "$t" 2>&1 | tail -1); echo "$t :: $r"; done; uv run --quiet python tests/agents/test_agent_store_migrations.py 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
