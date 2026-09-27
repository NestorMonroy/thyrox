# ¿Un doble de prueba se fuga entre archivos de `bun test`? (bun 1.3.11)

Qué se preguntó: al retirar el sustituto de `headless-sdk`, su prueba dejó de
usar `mock.module('@thyrox/local-observability', …)` —la forma de la fuente—
y pasó a reemplazar sólo el `logger` con `installLocalObservability`. ¿Qué
diferencia hay, medida?

## Medido

- `mock.module` (`a.test.ts`, `b.test.ts`, `pkg/dep.ts`): `b` no pide ningún
  mock y ve `mock` cuando corre después de `a`. El reemplazo vive en el
  registro de módulos del proceso, no en el archivo que lo pidió.
- `installLocalObservability` (sonda `probe_read_logger.test.ts`, que corría
  junto a `sdkMemorySummary.test.ts`): también se fuga. Es estado del módulo,
  y un archivo posterior veía el capturador (`logger-leak-before.txt`).
  Con `afterAll` reinstalando el `logger` previo ve el no-op
  (`logger-leak-after.txt`).
- **Bun no ejecuta los archivos en el orden de los argumentos.** Una primera
  ejecución pareció mostrar que el `logger` no se fugaba: la sonda había corrido
  antes que el archivo que instalaba. Un control dentro del mismo archivo
  confirmó que la sonda detecta el capturador, y con tres archivos el orden
  observado fue c, b, a.

## Conclusión

Las dos formas cambian estado compartido por el proceso; la diferencia es el
alcance —el módulo entero frente a su `logger`— y que la segunda usa la API
de inyección que el paquete ofrece. En las dos, la prueba restaura al
terminar.

*Métrica:* lo que un archivo de prueba posterior lee del módulo en la misma
ejecución de `bun test`.
*Ciega a:* `bun test` con archivos en procesos separados, y a otra versión de
bun.
