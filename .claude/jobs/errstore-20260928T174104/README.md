# errstore

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bash bin/emit_declarations local-observability > .claude/workbench/error-store-189-20260928T173809/emit.txt 2>&1; for p in local-observability repl app-host; do (cd src/packages/$p && echo "== $p build" && bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059; echo "== $p test" && bunx tsc -p tsconfig.test.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059); done > .claude/workbench/error-store-189-20260928T173809/typecheck.txt; (cd src/packages/local-observability && bun test </dev/null > ../../../.claude/workbench/error-store-189-20260928T173809/package-suite.txt 2>&1); .venv/bin/python src/verify/check_env_contract_keys.py --root . --strict > .claude/workbench/error-store-189-20260928T173809/env-contract.txt 2>&1; bun src/verify/checkEnvPrefix.ts --root . --strict > .claude/workbench/error-store-189-20260928T173809/env-prefix.txt 2>&1; true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
