# nosentry

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun install > .claude/workbench/remove-sentry-20260928T173436/install.txt 2>&1; grep -c '@sentry' bun.lock > .claude/workbench/remove-sentry-20260928T173436/lock-sentry-count.txt; bun test ./tests/package/no_external_error_sink.test.ts </dev/null > .claude/workbench/remove-sentry-20260928T173436/green.txt 2>&1; for p in local-observability app-host repl; do (cd src/packages/$p && echo "== $p" && bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059); done > .claude/workbench/remove-sentry-20260928T173436/typecheck.txt; true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
