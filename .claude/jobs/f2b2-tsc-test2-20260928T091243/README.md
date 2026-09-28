# f2b2-tsc-test2

## Qué se lanzó

```
bash -c bunx tsc -p tsconfig.test.json --noEmit 2>&1 | tail -5; echo TEST=${PIPESTATUS[0]}; bun test __tests__/proxyTranslatorsRequestAntigravityToOpenAI.test.ts 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
