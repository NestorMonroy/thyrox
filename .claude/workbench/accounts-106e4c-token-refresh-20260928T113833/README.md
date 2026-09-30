# #106e-4c — serializador por familia y orquestador del refresco

Tercera parte del orquestador de `omniroute: open-sse/services/tokenRefresh.ts`
(`getAccessToken`, la comprobación de frescura, `getAllAccessTokens`,
`getConnectionRefreshMutexStatus`) y el porte de
`open-sse/services/refreshSerializer.ts`, que el orquestador usa en cada
refresco.

| Módulo | Qué |
|---|---|
| `refresh/refreshSerializer.ts` | un refresco de red a la vez por familia de tokens que rotan, con pausa sólo si otro espera |
| `refresh/tokenRefresh.ts` | mutex por conexión, refresco compartido por token sin conexión, rotación recordada, fila guardada más nueva, guardado dentro de la ventana con CAS |

| Archivo | Qué |
|---|---|
| `red-106e4c.txt` | la mitad roja |
| `annul-106e4c.sh` | 32 anulaciones |
| `rerun-106e4c.sh` | la re-medida tras afinar |
| `results-106e4c.txt` | veredicto |

## Veredicto de las anulaciones

29 de 32 discriminaron a la primera.

- **8** (esperar la cola sin `.catch`) era código muerto, en la referencia
  también: la cola es `anterior.then(() => turno)` y cada turno se libera en
  `finally`, falle o no el refresco, así que nunca rechaza. Se retiró el
  `.catch`; la prueba de que un fallo libera el carril sigue pasando.
- **10** (dormir con pausa cero): la prueba con pausa cero no registraba las
  esperas. Ahora dos refrescos de la misma familia con pausa cero no duermen.
- **18** (recordar como rotación cualquier resultado): el propio mapa ya
  descarta lo que no trae refresh token nuevo. Faltaba el caso que sólo la
  guarda del orquestador ve: un resultado con refresh token y sin access
  token. Ahora está en la prueba.

## Divergencias declaradas

- **Estado por instancia, no global de módulo.** El mutex, la caché en curso,
  el mapa de rotaciones y las colas del serializador viven en la instancia que
  crea `createTokenRefresher`/`createRefreshSerializer`; la referencia los
  tiene en el módulo y necesita `__resetRefreshSerializerForTest`.
- **La pausa entre refrescos se lee de `THYROX_REFRESH_SPACING_MS`**, no de
  `CODEX_REFRESH_SPACING_MS`.
- **El refresco por proveedor y la lectura de la fila son dependencias**
  (`refresh`, `readConnection`): el orquestador no conoce el almacén ni el
  despacho. `refresh` es `createProviderRefreshDispatch().refresh`.
- **El guardado se pasa como `persist`**, o viaja con `runWithPersist`; un
  fallo de guardado se registra con su mensaje y se propaga, sin el
  saneamiento de mensaje de la referencia (`sanitizeErrorMessage`).
- **Sin contexto de proxy saliente**: el punto de inyección es `fetch` del despacho.
- `getAllAccessTokens` recibe la lista de conexiones, no un `userInfo`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 429 tests, 0 fail (tsc-106e4c).
