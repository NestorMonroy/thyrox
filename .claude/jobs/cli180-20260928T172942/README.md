# cli180

## Qué se lanzó

```
bash -c cd /home/user/thyrox/src/packages/cli && bun test $(tr '\n' ' ' < ../../../.claude/workbench/cli-light-modes-180-20260928T172749/derived-tests.txt) </dev/null > ../../../.claude/workbench/cli-light-modes-180-20260928T172749/derived.txt 2>&1; bunx tsc -p tsconfig.build.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059 > ../../../.claude/workbench/cli-light-modes-180-20260928T172749/typecheck.txt; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | grep 'error TS' | grep -v TS6059 >> ../../../.claude/workbench/cli-light-modes-180-20260928T172749/typecheck.txt; true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
