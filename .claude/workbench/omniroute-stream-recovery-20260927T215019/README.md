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
