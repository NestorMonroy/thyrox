# Recuperación de stream de OmniRoute en el proxy local

Porte de `open-sse/services/streamRecovery.ts` y
`open-sse/services/throughputWatchdog.ts` (OmniRoute a58000c7, MIT) a
`src/packages/provider/src/proxy/resilience/`, y su cableado en el reenvío del
proxy (`server.ts`, `startServer.ts`).

## El oráculo

Seis suites de la referencia, portadas a `bun:test` por `probes/port-tests.sh`
(cabecera nueva, cuerpo copiado):

| Referencia | Aquí | Fuera, y por qué |
|---|---|---|
| `stream-recovery.test.ts` | `proxyStreamRecovery.test.ts` | — |
| `stream-continuation.test.ts` | `proxyStreamContinuation.test.ts` | — |
| `stream-recovery-toolcall.test.ts` | `proxyStreamRecoveryToolCall.test.ts` | — |
| `stream-continuation-responses.test.ts` | `proxyStreamContinuationResponses.test.ts` | los 3 últimos: prueban el traductor Responses→chat de la referencia, que thyrox no tiene |
| `stream-throughput-watchdog.test.ts` | `proxyThroughputWatchdog.test.ts` | el último: prueba los ajustes de resiliencia de la referencia |
| `stream-throughput-watchdog-recovery.test.ts` | `proxyThroughputWatchdogRecovery.test.ts` | — |

Rojo antes del porte: `outputs/red.txt` (6 de 6 fallan, módulo ausente). Tras
el porte, 74 de 74. El módulo se reescribió después en el estilo del árbol, con
los comentarios en español y sin historia, y las 74 siguieron en verde.

## Divergencias

- Las constantes de `open-sse/config/constants.ts` viven en el módulo
  (`STREAM_RECOVERY`), con los mismos valores.
- El flag `STREAM_RECOVERY_TOOLCALL_ORDER_FIX` sólo se lee del entorno, como
  `THYROX_STREAM_RECOVERY_TOOLCALL_ORDER_FIX`; la referencia también lo lee de
  su base de datos.
- En el servidor sólo se cablea la reapertura temprana. La continuación exige
  un stream compatible con OpenAI, y el proxy reenvía SSE de Anthropic, que el
  escáner no reconoce.

## Anulaciones

Con `bin/annul_parallel`, cada suite contra las mismas variantes
(`probes/annul-stream-recovery.tsv`, `probes/annul-throughput-watchdog.tsv`):

- Las suites de la referencia discriminan 12 de 17 variantes del módulo y 3 de
  5 del vigilante (`outputs/annul-sr-*.tsv`, `outputs/annul-tw-*.tsv`).
- `proxyStreamRecoveryGuards.test.ts` añade un caso por cada mitad alcanzable
  que ninguna cubría (`outputs/annul-guards-*.tsv`):
  - `abort-not-retryable`;
  - `restart-reject`;
  - `empty-stop-needs-reasoning`;
  - `measurable`;
  - `window-cutoff`.
- Dos no discriminan: `cancel-no-reopen` y `finalize-once`. Son guardas
  defensivas que ningún camino alcanza, porque `pull` comprueba `cancelled`
  antes de reabrir o de finalizar.
- Cableado del servidor (`outputs/annul-server-stream.tsv`): discriminan las
  4 de 4.

## Límites de tasa: las dos partes puras

Primera etapa del gestor de límites (`open-sse/services/rateLimitManager/`):
`headers.ts` → `rateLimitHeaders.ts` y `requestCap.ts` → `requestCap.ts`.
Oráculo en `proxyRateLimitHeaders.test.ts`:
- de `ratelimitmanager-headers-split.test.ts`, las secciones 1 y 3; la 2
  prueba la API del gestor completo, que aún no existe aquí;
- de `rate-limit-learned-cap-13594.test.ts`, sus casos puros.

Anulaciones (`outputs/annul-rate-limit-headers*.tsv`,
`outputs/annul-request-cap.tsv`):
- **Discriminan:** 8 de 9. `lowercase-names` lo hace desde el caso del
  `Map`, que se añadió porque ninguna prueba de la referencia lo cubría.
- **No discrimina:** `minutes-not-ms`. Con la expresión anclada, el retroceso
  lleva siempre `500ms` al grupo de milisegundos, así que el `(?!s)` de la
  referencia es redundante.

El resto del gestor tiene estado: un limitador por proveedor y credencial,
con concurrencia, intervalo mínimo y cupo que se repone. La referencia lo
construye sobre `bottleneck`, así que aquí se reimplementa en nativo.

## Límites de tasa: el limitador y el gestor

- `requestLimiter.ts`: el subconjunto de `bottleneck` que el gestor usa, en
  nativo: concurrencia máxima, intervalo mínimo entre arranques, cupo con
  reposición, orden de llegada, cancelación por señal y `drop` para lo
  encolado. Sus 11 casos fijan cada regla (`proxyRequestLimiter.test.ts`).
- `rateLimitManager.ts` y `retryHints.ts`: el gestor, sin base de datos (el
  estado vive en la instancia). Casos de `rate-limit-manager.test.ts`,
  `rate-limit-learned-cap-13594.test.ts`,
  `rateLimitManager-mintime-floor-9763.test.ts` y `rate-limit-enhanced.test.ts`
  (`proxyRateLimitManager.test.ts`). Divergencias en la cabecera del módulo:
  sin persistencia, ajustes de cola por constructor, sin claves por familia de
  `codex`/`antigravity`, y sin vigilancia de colas atascadas, tope de espera
  ni expulsión por inactividad.
- Cableado: `server.ts` pasa cada reenvío de una credencial protegida por su
  limitador y le enseña las cabeceras y el cuerpo de un 4xx (un 5xx no se lee);
  `startServer.ts` construye el gestor con `rateLimit` y protege las
  credenciales de clave de API, no las OAuth, como la referencia.

Anulaciones, con `THYROX_ANNUL_TEST_TIMEOUT=20`:
- el limitador, 9 de 9;
- el gestor, 17 de 17, `anthropic-names` desde su caso propio;
- `retryHints`, 4 de 5. `seconds-unit` es redundante: «33s» cae al número
  suelto y da lo mismo;
- el cableado, 4 de 4 en el servidor y 2 de 2 en `startServer`.

Dos variantes (`drop-queue` y `retire-on-429`) dejan una promesa sin
resolver. `bun test` no las cortaba con su propio plazo, así que el corredor
giraba hasta el límite de 300 s de `annul_parallel`. De ahí el plazo
configurable del mecanismo, en su propio commit.

## Enfriamiento por credencial: `checkFallbackError`

- `accountCooldown.ts`: el núcleo de `checkFallbackError` de la referencia
  (`accountFallback.ts` con sus módulos de reglas, pistas de reintento y
  acceso al modelo). La categoría del proveedor la da `traitsOf`, y sin
  rasgos cuenta como clave de API. No se portan los módulos propios de un
  proveedor: sus textos caen en las reglas generales (cabecera del módulo).
- Casos de `account-fallback-service.test.ts`, `rate-limit-enhanced.test.ts`,
  `gemini-deprecated-model-lockout.test.ts` y
  `account-fallback-route-restriction-403.test.ts`
  (`proxyAccountCooldown.test.ts`), más dos propios.

Anulaciones: 13 de 13 (`probes/annul-account-cooldown.tsv`). En la primera
pasada cinco no discriminaban:
- `route-403`, `model-retired` y `backoff-increment`: sus casos estaban en
  otros archivos de la referencia, y se portaron.
- `apikey-403`: ningún caso de la referencia separa el 403 de clave de API
  del 403 por estado.
- `bad-credential-guard`: el texto del caso de la referencia («Invalid API
  key provided for model gpt-4o») no casa con ningún patrón de acceso al
  modelo, así que la guarda nunca decide ahí.

Para estas dos últimas se añadieron casos propios: un 403 genérico con clave
de API, y un 400 que casa a la vez con credencial y con acceso al modelo.
