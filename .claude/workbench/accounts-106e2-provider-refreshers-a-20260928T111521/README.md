# #106e-2 — refrescadores del lote A

Porte TDD de `omniroute: open-sse/services/tokenRefresh/providers/{claudeOAuth,
github, copilot, google, gitlabDuo, qoder, cline, codebuddyCn}.ts`, en
`src/accounts/refresh/providers/`, con un tipo de resultado común
(`refreshResult.ts`): tokens, token muerto, o `null` si el fallo es pasajero.

| Archivo | Qué |
|---|---|
| `red-106e2.txt` | la mitad roja |
| `annul-106e2.sh` | 57 anulaciones |
| `rerun-106e2.sh` | la re-medida tras afinar la prueba |
| `results-106e2.txt` | veredicto |

## Veredicto de las anulaciones

56 de 57 discriminaron a la primera. La **55** (un rechazo de CodeBuddy no
se lee) la tapaba el cuerpo no JSON de la prueba: el fallo de lectura también
devolvía `null`. El 401 lleva ahora un cuerpo válido con token, y la
re-medida discrimina.

## Divergencias declaradas

- **Sin contexto de proxy saliente.** La referencia envuelve cada `fetch` en
  `runWithProxyContext`. Aquí el punto de inyección es el propio `fetch` de
  las dependencias: quien necesite un proxy saliente pasa un `fetch` que lo
  use.
- **Configuración por variable, no incrustada.** Cada refrescador recibe la
  configuración del flujo del mismo proveedor (`anthropicOAuthConfig`,
  `githubOAuthConfig`, `gitlabDuoOAuthConfig`, `qoderOAuthConfig`). Anthropic
  rehúsa sin `THYROX_CLAUDE_OAUTH_CLIENT_ID`, nombrando la variable, en vez de
  mandar un formulario sin cliente. GitHub manda el secreto sólo si se
  declara (`clientSecret`).
- **GitLab Duo**: sin instancia en la conexión, vale la configurada
  (`THYROX_GITLAB_DUO_BASE_URL`), no gitlab.com fijo.
- **Un solo sitio para cada constante compartida**: `GITHUB_OAUTH_ENDPOINTS` y
  `CODEBUDDY_CN_USER_AGENT` se exportan desde sus flujos en vez de repetirse.
- **Cline** recibe el reloj inyectado para calcular la vida del token.
- **Se conserva la asimetría de la referencia**: el refresco de GitHub y el de
  Qoder dejan propagarse un fallo de red (lo reintenta quien llama); el resto
  lo convierte en `null`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 345 tests, 0 fail (tsc-106e2b-20260928T111839). El primer typecheck (tsc-106e2) dio 6 TS2769 en la prueba: el ayudante `dead` devolvía `error: string` en vez del literal; corregido.
