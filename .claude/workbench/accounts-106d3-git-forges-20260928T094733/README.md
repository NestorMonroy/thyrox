# #106d-3 — flujos OAuth de GitHub Copilot, GitHub Enterprise y GitLab Duo

Porte (`omniroute:`, MIT) a `src/packages/provider/src/accounts/oauth/flows/`:

| Módulo | Porte de |
|---|---|
| `copilotIdentity.ts` | la versión y el user agent de Copilot de `open-sse/config/providerHeaderProfiles.ts` |
| `githubDeviceFlow.ts` | la parte común de `src/lib/oauth/providers/github.ts` y `ghe-copilot.ts` |
| `githubFlow.ts` | `providers/github.ts` + `GITHUB_CONFIG` |
| `gheCopilotFlow.ts` | `providers/ghe-copilot.ts` + `GHE_COPILOT_CONFIG` |
| `gitlabDuoFlow.ts` | `providers/gitlab-duo.ts`, `GITLAB_DUO_CONFIG` y la parte OAuth de `src/lib/oauth/gitlab.ts` |

## Divergencias

1. **Un flujo de dispositivo para las dos variantes de GitHub.** En la
   referencia `github.ts` y `ghe-copilot.ts` repiten el mismo cuerpo con
   otras URLs; aquí la variante sólo declara sus endpoints y lo que añade a
   los datos del proveedor.
2. **El sondeo de GHE lee el cuerpo una vez.** La referencia de GHE hace
   `response.json()` y, si falla, `response.text()`, que lanza «Body is
   unusable» porque el cuerpo ya se consumió; `github.ts` ya lo había
   corregido. Las dos variantes usan aquí la forma corregida.
3. **Sin client ids incrustados; variables con prefijo `THYROX_`.**
   `GITHUB_OAUTH_CLIENT_ID`, `GHE_COPILOT_OAUTH_CLIENT_ID`,
   `GITLAB_DUO_OAUTH_CLIENT_ID`/`GITLAB_OAUTH_CLIENT_ID` (y sus secretos),
   `GITLAB_DUO_BASE_URL`/`GITLAB_BASE_URL` y `GITHUB_COPILOT_CLI_VERSION`
   pasan a su forma `THYROX_`. El id de GitHub no tiene respaldo incrustado.
4. **GitLab Duo sin client id rehúsa nombrando la variable**, como el resto
   de flujos, en vez de devolver `null` desde `buildAuthUrl` para que la ruta
   del tablero muestre el aviso.
5. **La URL base de GitLab se lee al construir la configuración**, no al
   cargar el módulo (`GITLAB_DUO_DEFAULT_BASE_URL`).
6. **El resto de `src/lib/oauth/gitlab.ts` no es de OAuth**: el gateway
   directo, la caché del acceso directo, el sondeo de Code Suggestions y la
   decisión de recurrir al endpoint público son del ejecutor de GitLab, y
   entran con él (#106e).

## Verificación

Rojo persistido en `red-106d3.txt`. Anulaciones: `annul-106d3.sh`,
`results-106d3.txt`.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD.
`__tests__/accounts`: 104/104. Doce anulaciones, las doce discriminan.
