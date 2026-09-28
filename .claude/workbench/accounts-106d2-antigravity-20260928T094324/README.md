# #106d-2 — flujos OAuth de `antigravity` y `agy`

Porte (`omniroute:`, MIT) a `src/packages/provider/src/accounts/`:

| Módulo | Porte de | Responsabilidad |
|---|---|---|
| `antigravity/clientIdentity.ts` | `open-sse/services/antigravityHeaders.ts`, `open-sse/config/antigravityUpstream.ts`, `src/shared/constants/antigravityClientProfile.ts` | perfil, user agents, cabeceras, metadatos y endpoints |
| `antigravity/clientVersion.ts` | `open-sse/services/antigravityVersion.ts` | la versión publicada del IDE y del CLI, con caché |
| `antigravity/codeAssistTier.ts` | `open-sse/services/codeAssistSubscription.ts` | tier que se muestra y tier del onboarding |
| `oauth/flows/antigravityFlow.ts` | `src/lib/oauth/providers/antigravity.ts`, `agy.ts`, `ANTIGRAVITY_CONFIG`/`AGY_CONFIG` | el flujo; `agy` es el mismo con el perfil `cli` |
| `oauth/antigravityProjectGate.ts` | `src/lib/oauth/antigravityProjectGate.ts` | cuenta degradada sin proyecto |
| `oauth/browserRedirect.ts` | `resolveBrowserOAuthRedirectUri` de `src/lib/oauth/providers.ts` | redirección a una URL pública |

`oauthPersistence.ts` (#106c) aplica ahora el estado de proyecto al crear y
al actualizar, como `buildOAuthConnectionCreatePayload` y
`persistOAuthConnection`: cierra su divergencia 6.

## Divergencias

1. **Sin cliente de Google incrustado.** El id y el secreto salen sólo de
   `THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID` y `THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET`
   (la referencia: `ANTIGRAVITY_OAUTH_CLIENT_*` con respaldo en
   `EMBEDDED_DEFAULTS`). Sin ellos el flujo rehúsa nombrando la variable. Una
   consecuencia: todo cliente es del operador, así que `oauthClient` es
   siempre `custom:<id>` y nunca `builtin`.
2. **La URL pública es `THYROX_PUBLIC_BASE_URL`** (la referencia:
   `NEXT_PUBLIC_BASE_URL` u `OMNIROUTE_PUBLIC_BASE_URL`). La rama
   `ANTIGRAVITY_OAUTH_CLIENT_TYPE=web` no se porta: con cliente propio y URL
   pública, las dos ramas de la referencia hacen lo mismo con una redirección
   loopback, y ninguna toca una que no lo es.
3. **La versión del cliente vive en una instancia** (`createClientVersions`)
   en vez de en estado de módulo; el flujo recibe su vista (`cachedIde`,
   `cachedCli`). Su user agent de consulta es `thyrox-antigravity-version/1.0`.
4. **La espera, el azar y la plataforma se inyectan** (`sleep`, `random`,
   `platform`) para que el onboarding acotado y los metadatos se prueben sin
   reloj real ni depender del anfitrión.
5. **Sin `googleLoopbackHint.ts` ni `loopbackTunnel.ts`**: son el texto de
   ayuda del diálogo del tablero (túnel SSH, ayudante de login). Si la CLI de
   #106f los necesita, entran con ella.
6. **El aviso de cuenta degradada no se escribe en consola**: la referencia
   hace `console.warn`; aquí el estado se guarda en la cuenta y el aviso viaja
   en `warning` para quien conecta.

## Verificación

Rojo persistido en `red-106d2.txt`. Anulaciones: `annul-106d2.sh`,
`results-106d2.txt`.

La anulación 12 no discriminaba: ninguna prueba tenía un proyecto que sólo
apareciera en la segunda consulta. Con ese caso cae; la repetición es
`annul-106d2-12.sh`. Las 18 discriminan.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD.
`__tests__/accounts`: 90/90.
