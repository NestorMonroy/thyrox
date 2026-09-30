# layer-cit-baseline

## Qué se lanzó

```
bash -c cd /home/user/thyrox-baseline-wt && ln -s /home/user/thyrox/.venv .venv 2>/dev/null; for t in tests/hooks/test_task_lifecycle.py tests/verify/test_pre_commit_hook.py; do echo "== $t"; uv run --quiet python $t 2>&1 | tail -4; done; echo '== commit-msg'; bash tests/verify/test-commit-msg-citation.sh 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
