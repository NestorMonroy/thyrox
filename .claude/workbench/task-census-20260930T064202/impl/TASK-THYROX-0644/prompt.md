# TASK-THYROX-0644

## La tarea

Make the nested SDK error test independent of install layout.

`src/packages/provider/__tests__/proxySdkForward.test.ts:176` («el error de la copia del SDK que trae un cliente de nube se reconoce igual») exige que `@anthropic-ai/vertex-sdk` resuelva su PROPIA copia de `@anthropic-ai/sdk` (`expect(NestedApiError).not.toBe(APIError)`). En esta instalación bun la deduplica —`node_modules/@anthropic-ai/vertex-sdk/node_modules/@anthropic-ai/sdk` no existe—, así que la precondición falla y la prueba está roja en `HEAD` (medido: 2132 de 2133 pruebas del proxy, ésta la única roja), no por el reconocimiento que protege (H-THYROX-222, `src/packages/provider/src/proxy/sdk/sdkForward.ts`).

Qué hace falta: que la prueba construya ella misma una clase de error AJENA —una segunda instancia del módulo del SDK (por ejemplo, importándolo con una consulta distinta en la URL para forzar otra evaluación) o una clase estructuralmente igual— de modo que el control siga discriminando sin depender de cómo se instaló `node_modules`. Control de anulación: retirar el reconocimiento estructural de `sdkForward.ts` en una copia temporal hace caer exactamente este caso; restaurar y confirmar `git diff --stat` vacío sobre `sdkForward.ts`.

## Archivos que te pertenecen

- `src/packages/provider/__tests__/proxySdkForward.test.ts`

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
