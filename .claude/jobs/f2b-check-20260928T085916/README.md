# f2b-check

## Qué se lanzó

```
bash -c bash .claude/workbench/mitm-f2b-antigravity-20260928T090500/annul-f2b.sh > .claude/workbench/mitm-f2b-antigravity-20260928T090500/results-f2b.txt 2>&1; cat .claude/workbench/mitm-f2b-antigravity-20260928T090500/results-f2b.txt; cd src/packages/mitm && bun test 2>&1 | tail -3; bunx tsc -p tsconfig.build.json --noEmit; echo BUILD_TSC=$?; bunx tsc -p tsconfig.test.json --noEmit; echo TEST_TSC=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
