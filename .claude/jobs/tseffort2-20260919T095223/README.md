# tseffort2

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

El **costo** del porte de `effortLevel`, aislado del intento fallido. Se revirtió
el `import` estático (vuelve el envoltorio `require`) y se dejó la clave nueva en
el esquema. ¿Cuánto cuesta la clave por sí sola?

## Qué se recogió

**5683 / 5681** — **idéntico al estado de partida** (`dfb0cb6d`). El `comm` sobre
las ubicaciones ordenadas da **0 dentro y 0 fuera**: el porte de `effortLevel`
cuesta **cero** en el typecheck del árbol entero.

Esto separa las dos mitades del pase, que de otro modo se habrían confundido: el
desenlace A de `TASK-THYROX-0229` está descartado (tres intentos, `tsapphost`/
`tsgen`/`tsgen2`), y el porte de la clave es una mejora independiente que se
queda.

*Metrica:* ídem `tsapphost`.
*Ciega a:* el costo en la suite — se midió aparte con el subconjunto derivado
(`bun test src/packages/config/__tests__/`: 523 pass / 15 fail / 1 error,
idéntico en HEAD y con el cambio; los 15 son una cascada pre-existente de
`tryParseShellCommand`).
