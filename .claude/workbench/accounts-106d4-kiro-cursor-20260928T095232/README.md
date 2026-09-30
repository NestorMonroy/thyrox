# #106d-4 — flujos de Kiro y de Cursor

Porte (`omniroute:`, MIT) a `src/packages/provider/src/accounts/`:

| Módulo | Porte de |
|---|---|
| `kiro/kiroRegion.ts` | `open-sse/services/kiroRegion.ts` + `assertValidAwsRegion` |
| `kiro/kiroSocialPoll.ts` | `src/lib/oauth/kiroSocialPoll.ts` |
| `kiro/kiroConnectionIdentity.ts` | `src/lib/oauth/kiroConnectionIdentity.ts` |
| `oauth/flows/kiroFlow.ts` | `src/lib/oauth/providers/kiro.ts` + `KIRO_CONFIG` (parte de dispositivo) |
| `oauth/flows/kiroSocialLogin.ts` | `buildSocialLoginUrl`/`exchangeSocialCode` de `services/kiro.ts` |
| `oauth/flows/cursorFlow.ts` | `src/lib/oauth/providers/cursor.ts` |
| `oauth/flows/cursorLogin.ts` | `src/lib/oauth/services/cursorLogin.ts` (login y sondeo) |
| `oauth/cursorPersistence.ts` | `src/lib/oauth/services/persistCursorConnection.ts` |

## Divergencias

1. **El sondeo de Kiro lee el cuerpo una vez**; la referencia repite el
   defecto de GHE (`json()` y después `text()` sobre un cuerpo consumido).
2. **El pendiente de Kiro llega como `ok: false`**, como en la referencia: el
   despachador lo devuelve como error `authorization_pending` sin la marca
   `pending`. Se conserva; quien sondea mira el código de error.
3. **Las sesiones de Cursor viven en la instancia** (`createCursorLogin`),
   no en un `Map` de módulo, y el reloj se inyecta.
4. **Un fallo de red del sondeo de Cursor devuelve su mensaje tal cual**: la
   referencia lo pasa por `sanitizeErrorMessage` de su capa `open-sse`, que
   este árbol no tiene todavía.
5. **Fuera de esta fase**: el refresco de tokens de Kiro y de Cursor
   (`KiroService.refreshToken`, `refreshCursorAccessToken`) es #106e; la
   validación de tokens importados y de claves de API
   (`validateImportToken`, `validateApiKey`, `CursorService`) es #106d-6.
   `socialClientId` y el device flow social de Kiro no tienen consumidor en
   este árbol todavía.
6. **`cursorFlow` declara su texto de importación** (`importTokenHint`), que
   la referencia no tiene: su despachador cae al texto genérico.

## Verificación

Rojo persistido en `red-106d4.txt`. Anulaciones: `annul-106d4.sh`,
`results-106d4.txt`.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD.
`__tests__/accounts`: 123/123. Dieciséis anulaciones, las dieciséis discriminan.
