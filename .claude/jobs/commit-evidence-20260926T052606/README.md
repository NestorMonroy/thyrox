# commit-evidence

## Qué se lanzó

```
bash -c xargs -a .claude/workbench/prompt-cache-ttl-port-20260926T032009/evidence-paths.txt git -c commit.gpgsign=false commit -q -F .claude/workbench/prompt-cache-ttl-port-20260926T032009/commit-msg-evidence.txt -- && git push -q origin HEAD; echo EXIT=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
