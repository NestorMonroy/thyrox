# Anulación del gancho del inspector (F3b)

`agentBridgeHook`, `processAttribution` y `diagnostics` en
`src/packages/mitm/src/inspector/`. Salida literal en `results.txt`; cada
anulación tumba exactamente su caso.

| Anulación | Caso que cae |
|---|---|
| A1 — sin consultar si el host es personalizado | el host personalizado activo |
| A2 — cabeceras de respuesta sin sanear | el de la respuesta enmascarada |
| A3 — error sin pasar por `sanitizeErrorMessage` | el del error saneado |
| A4 — la atribución no reconoce `socket:[inodo]` | la conexión viva que resuelve al PID propio |
| A5 — `installAgentBridgeHook` sin registrar el gancho | el recorrido de un handler que llega al búfer |

El caso A4 no viene de la referencia: sus pruebas sólo cubren el análisis de
`/proc/net/tcp` con datos fijos y el camino fuera de Linux, así que ninguna
decía si la atribución funciona sobre un socket real.
