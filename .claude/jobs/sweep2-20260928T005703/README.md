# sweep2

## Qué se lanzó

```
bash -c bun test tests/reference/home.test.ts src/packages/finding/__tests__/finding.test.ts src/packages/task/__tests__/extraction.test.ts tests/conformance/harnessChecklist.test.ts src/packages/agent/__tests__/compactionFidelity.test.ts 2>&1 | tail -6; (cd src/packages/ide && bunx tsc --noEmit -p . 2>&1 | tail -3); echo TSC_DONE
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
