# Anulación — F7a: piezas puras del servidor MITM

Sujetos: `src/packages/mitm/src/server/{bypass,forwardTarget,ingest}.ts` y
`applyAntigravityOverride` en `src/packages/mitm/src/aliasConfig.ts`.

Método: cada mitad de juicio se retira con `bin/replace_literal`, se corren
`__tests__/server` y `__tests__/aliasConfig.test.ts`, y se restaura. Resultados
verbatim en `results.txt`.

Cada anulación tumba un caso: la exclusión antes del destino, el paso a
minúsculas, el puerto en la guarda de reentrada, los bucles locales IPv6, el
nivel negativo del registro, los patrones en minúsculas, el comodín `*` de los
alias, el agente desconocido, el `catch` del store ilegible, la suma de
latencias, el rechazo sin token, el 2xx y la copia del cuerpo.

Tres intentos del registro no aplicaron y constan en `results.txt`:
- el separador `|` partía los textos que llevan `||`, y la cuenta salía de
  otra cosa;
- el segundo intento, con `§` como separador, no aplicó porque `read` sólo
  admite separadores de un byte (dice «NO APLICA»).
Se rehicieron uno a uno («tercer intento») y los tres discriminan.

La anulación de `routerPath` (decidir por el id `claude-code`) no discriminaba
mientras sólo se probaba `claude-code`: se añadió `kiro`, que comparte la ruta
de `/v1/messages`, y ahora cae ese caso.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: el servidor que usa estas piezas, que es F7b.
