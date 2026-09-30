# F2b-2 — `/v1/antigravity` en el proxy local

El servidor MITM reenvía el sobre cloudcode del IDE Antigravity a
`/v1/antigravity` (`mitm: server/forwardTarget.ts`), y el proxy no servía esa
ruta. Ahora la sirve `provider: src/proxy/antigravity.ts`.

| Pieza | Porte de (`omniroute`, MIT) |
|---|---|
| `translators/requestAntigravityToOpenAI.ts` | `open-sse/translator/request/antigravity-to-openai.ts` |
| `translators/geminiToolCallIds.ts` | `open-sse/translator/helpers/geminiToolCallIds.ts` |
| `translators/responseOpenAIToAntigravity.ts` | `open-sse/translator/response/openai-to-antigravity.ts` y `convertOpenAINonStreamingToGeminiFamily` de `open-sse/handlers/responseTranslator.ts` |
| `antigravity.ts` + la rama de `server.ts` | `src/app/api/v1/antigravity/route.ts` |

Las pruebas son las de la referencia —`translator-antigravity-to-openai`,
`translator-resp-openai-to-antigravity` y la parte del traductor de
`mitm-antigravity-reasoning-effort-override`— más `proxyAntigravity.test.ts`,
que ejerce la ruta completa sobre el `forward` de prueba del proxy, y
`proxyTranslatorsGeminiToolCallIds.test.ts`: la referencia no trae pruebas del
emparejamiento, y la primera pasada de anulaciones lo destapó —retirar la
preferencia por la llamada generada no tumbaba nada—.

## Reutilizado, no duplicado

- `adjustMaxTokens` ya existía, privado, en `requestMessagesToOpenAI.ts`
  (porte del mismo `maxTokensHelper.ts`): se exporta.
- `fixToolPairs` es el de `context/contextManager.ts`.
- El normalizador del esfuerzo vivía en `mitm: aliasConfig.ts`; el proveedor
  no puede importar de `mitm` (mitm depende de él), así que pasó a
  `agent: effort.ts` como `normalizeReasoningEffort` y `aliasConfig` lo importa.
- El SSE de la respuesta de chat se lee con `parseSseEvents` de `provider: src/sse.ts`.

## Divergencias

| Referencia | Aquí | Por qué |
|---|---|---|
| El razonamiento sin stream sale de `getAnyReasoningValue` (`reasoningFields.ts`), que también lee `reasoning_details[]` y quita un marcador interno de reproducción | Los cinco campos de texto que esa función reconoce, en su orden | El chat del proxy produce `reasoning_content`; `reasoning_details` y el marcador son de upstreams que el proxy de thyrox no habla hoy |
| El id de llamada generado usa `Math.random` | Una secuencia del módulo | El id sólo tiene que ser único dentro del proceso |
| Un 529 del upstream | Sale 502 si ningún upstream responde | Es la conmutación del proxy, igual que en `/v1/chat/completions`; la prueba usa un 429, que se conserva |

Rojo persistido en `red-f2b2.txt`. Anulaciones: `annul-f2b2.sh`,
`results-f2b2.txt`.

## Verificación

`proxy` 2078/0; mitm 802/0; `tsc` de build 0 en provider, agent y mitm;
`check-cli-typecheck` OK. El `tsc` de pruebas de provider publica dos errores
TS6059 (`claudeAiLimits.test.ts` → `command-runtime`) que también da `HEAD`
sin este cambio, medido en un worktree del mismo commit
(`.claude/jobs/provider-tsc-baseline-20260928T091306/`): no son de esta fase.
