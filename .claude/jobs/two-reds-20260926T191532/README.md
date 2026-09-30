# two-reds

## Qué se lanzó

```
bash -c cd /home/user/thyrox; for t in test-coordinator-sin-worktree test-suite-discrimina; do THYROX_ROOT=/home/user/thyrox PYTHONPATH=/home/user/thyrox/src timeout 600 bash tests/verify/$t.sh > /home/user/thyrox/.claude/workbench/all-tsconfigs-20260926T174919/red-$t.log 2>&1; echo "$t EXIT=$?"; done > /home/user/thyrox/.claude/workbench/all-tsconfigs-20260926T174919/two-reds.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
