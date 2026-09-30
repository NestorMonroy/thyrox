# #106d-1 — flujos OAuth de `claude` y `codex`

Porte a `src/packages/provider/src/accounts/oauth/flows/`:

| Módulo | Porte de (`omniroute:`, MIT) |
|---|---|
| `clientId.ts` | la lectura de `resolvePublicCred` (sin sus valores incrustados) |
| `anthropicFlow.ts` | `src/lib/oauth/providers/claude.ts` + `CLAUDE_CONFIG` |
| `codexFlow.ts` | `src/lib/oauth/providers/codex.ts` + `CODEX_CONFIG` |

Cada flujo es una fábrica con sus dependencias (`fetch`, el user agent del
bootstrap, el generador del `cliUserID`) que se registra en
`createOAuthFlows` (#106c).

## Divergencias

1. **Sin client ids incrustados.** OmniRoute trae ofuscados en
   `open-sse/utils/publicCreds.ts` (`EMBEDDED_DEFAULTS`) los ids de cliente de
   terceros y los usa si no hay variable. Aquí no se copian: el id sale sólo de
   `THYROX_CLAUDE_OAUTH_CLIENT_ID` / `THYROX_CODEX_OAUTH_CLIENT_ID`, y sin la
   variable el flujo rehúsa nombrándola al construir la URL o al intercambiar.
2. **Las variables llevan prefijo `THYROX_`**: `CLAUDE_OAUTH_CLIENT_ID`,
   `CODEX_OAUTH_CLIENT_ID` y `CLAUDE_CODE_REDIRECT_URI` pasan a
   `THYROX_CLAUDE_OAUTH_CLIENT_ID`, `THYROX_CODEX_OAUTH_CLIENT_ID` y
   `THYROX_CODE_REDIRECT_URI`.
3. **`codex` sin `postExchange`**: la referencia lee el id_token dos veces
   (en `postExchange` y otra vez en `mapTokens`, que prefiere la primera
   lectura, idéntica). Se lee una.
4. **El user agent del bootstrap** es `claude-cli/<versión del paquete>
   (external, cli)`; la referencia toma la versión de su identidad de
   ejecutor, y aquí es la del paquete, como `http.ts::getUserAgent`.
5. **El plazo del bootstrap** va con `AbortSignal.timeout` en vez de un
   `AbortController` con `setTimeout` y `clearTimeout`: mismo plazo.
6. **Selección de workspace de `codex` sin cambio de conducta**, reescrita
   como una función (`selectWorkspace`). La rama de la referencia para un plan
   de equipo está vacía y no puede cambiar nada: el cambio a la organización
   de equipo sólo ocurre con plan `free` o vacío, y ninguno contiene `team`.
   La anulación 8 lo midió (retirada, 11/11) y la rama se borró.

## Verificación

Rojo persistido en `red-106d1.txt`. Anulaciones: `annul-106d1.sh`,
`results-106d1.txt`.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD.
`__tests__/accounts/oauth`: 27/27. Nueve anulaciones, las nueve discriminan.

El flujo de `claude` se nombra por la identidad del upstream
(`anthropicFlow.ts`, `createAnthropicFlow`); `claude` queda como id de
proveedor en el registro. Las anulaciones se midieron antes del renombre,
sobre los mismos cuerpos.
