# P0 — soporte de modelos locales ya existente en src/packages

Procedencia: informe de un subagente de exploración (solo lectura) despachado
el 2026-09-30 en esta sesión. **Fue un error de proceso**: la directiva manda
el trabajo con juicio por `headless-pool`, no por subagentes; queda aquí como
evidencia porque sus citas se verificaron por muestreo (`netGuards.ts:157`,
`printDelegation.ts:61`, `providersWriteVerbs.test.ts:145`). Nivel de
retención 3 hasta que cada fila se re-mida al construir sobre ella.

| # | Pieza | Estado | Evidencia | Falta |
|---|---|---|---|---|
| 1a | almacén `providers add` (SQLite, porte de OmniRoute) | PARTIAL_EXTEND | `provider/src/accounts/connectionStoreHome.ts:29-30`; `accounts/connectionSchema.ts:17,44,48` (`provider_connections`, `provider_specific_data`, `default_model`); `cli/__tests__/providersWriteVerbs.test.ts:145` `providers add ollama --no-credential` | `baseUrl` sólo como JSON libre y un único `default_model`; nada lee `baseUrl` al atender: el proxy usa las filas sólo como credenciales (`proxy/startServer.ts:200-203`); `LOCAL_PROVIDERS` (`accounts/connectionIdentity.ts:17-18`) sólo deduplica |
| 1b | `connections[]` legado de la config global | EXISTS (camino REPL) | `provider/src/connections.ts:49-56`; `providers.ts:94` `resolveConnectionForModel` | `-p` sólo lo lee con `--connection` (`cli/src/entry/runLoop.ts:167-168`) y habla protocolo Anthropic |
| 1c | `storeCredentialProxy.ts` | no aplica | `bin/storeCredentialProxy.ts:8-9` (sólo Anthropic) | — |
| 2 | `gatewayModelDiscovery.ts` | PARTIAL_EXTEND | `:247` `/v1/models?limit=1000`; atado a `ANTHROPIC_BASE_URL` y `THYROX_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` (`:17-21`) | una variante por endpoint `(baseUrl, auth)`; el esquema `{data:[{id}]}` ya coincide con Ollama |
| 3 | cliente OpenAI directo (`THYROX_CODE_USE_OPENAI`) | EXISTS, fuera de `-p` | `providers.ts:70`; `openai/client.ts:57-62`; herramientas en `openai/indexImpl.ts:125-126` | `thyrox -p` no lo usa (`runLoop.ts:24-25`: `AnthropicHttpProvider`) |
| 4 | upstream openai-compat del proxy local | EXISTS, un solo modelo | `bin/localProxy.ts:22-25,70`; `openaiCompat/declaration.ts:8-10`; traduce tool calls (`openaiCompat/forwarder.ts:5-6`); `-p` lanza el proxy sin credencial propia (`cli/src/entry/printDelegation.ts:63,136`) | N modelos y N upstreams; con credencial Anthropic propia `-p` se salta el proxy (`printDelegation.ts:61`) |
| 5 | validación y capacidades del modelo | PARTIAL_EXTEND | `-p` no valida (`cli/src/entry/print.ts:118`); ventana por defecto 200 000 (`agent/context.ts:49,105-110`), salida 32K (`:127`) | un override por modelo de conexión (`contextWindow`, `maxOutput`, `supportsTools`) |
| 6 | recomendador | MISSING para modelos locales | `provider/src/cost/policy.ts` (`TASK_REQUIREMENTS` `:170`, excluye sin `advisor_rank` `:263-266`); catálogo derivado `agent/models.jsonl` | una segunda fuente declarada de candidatos locales |
| 7 | cliente de embeddings | MISSING | `semantic-search/spaces.ts:32`, `store.ts:89` sólo guardan; 0 hits de `/v1/embeddings` | un cliente `/v1/embeddings` en `@thyrox/provider` |
| 8 | registro de modelos locales | MISSING | sólo `src/lib/infrastructure.sh` (contenedor) | — |
