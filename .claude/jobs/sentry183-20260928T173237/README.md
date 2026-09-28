# sentry183

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bash bin/emit_declarations local-observability > .claude/workbench/lazy-sentry-183-20260928T173037/emit.txt 2>&1; for p in local-observability app-host; do (cd src/packages/$p && bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059); done > .claude/workbench/lazy-sentry-183-20260928T173037/typecheck.txt; true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
