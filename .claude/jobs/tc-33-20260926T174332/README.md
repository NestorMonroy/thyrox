# tc-33

## Qué se lanzó

```
bash -c node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false > .claude/workbench/prompt-cache-ttl-port-20260926T032009/root-tsc-33.log 2>&1; bash bin/check-cli-typecheck > .claude/workbench/prompt-cache-ttl-port-20260926T032009/cli-tc-4.log 2>&1; echo CLI_EXIT=$? >> .claude/workbench/prompt-cache-ttl-port-20260926T032009/cli-tc-4.log; bun test $(tr '\n' ' ' < .claude/workbench/prompt-cache-ttl-port-20260926T032009/subset-33.txt) > .claude/workbench/prompt-cache-ttl-port-20260926T032009/subset-33.log 2>&1; echo EXIT=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
