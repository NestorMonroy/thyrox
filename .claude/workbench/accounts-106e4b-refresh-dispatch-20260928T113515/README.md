# #106e-4b — despacho del refresco por proveedor

Segunda parte del orquestador de `omniroute: open-sse/services/tokenRefresh.ts`:
`_getAccessTokenInternal` y `supportsTokenRefresh`, más la recuperación del
proyecto de Cloud Code al refrescar una cuenta de Antigravity.

| Módulo | Qué |
|---|---|
| `refresh/providerRefreshDispatch.ts` | cada proveedor a su ruta, con la configuración de sus variables |
| `refresh/googleClients.ts` | los clientes de Google configurado y de origen, desde sus variables |
| `antigravity/projectDiscovery.ts` | la consulta de proyecto de Code Assist, extraída del flujo de inicio de sesión para compartirla |

| Archivo | Qué |
|---|---|
| `red-106e4b.txt` | la mitad roja |
| `annul-106e4b.sh` | 30 anulaciones |
| `rerun-106e4b.sh` | la re-medida tras afinar la prueba |
| `results-106e4b.txt` | veredicto |

## Veredicto de las anulaciones

28 de 30 discriminaron a la primera. Las otras dos las tapaba la prueba:

- **14** (Kimi sin la descripción de host inyectada): la prueba sólo miraba
  el id de dispositivo, que sale de la conexión. Ahora mira también el nombre
  del dispositivo, que sale del host.
- **27** (perfil de cliente fijo): la prueba sólo miraba la autorización,
  igual en los dos perfiles. Ahora comprueba que el perfil `cli` no manda la
  cabecera `X-Goog-Api-Client` del perfil IDE.

## Divergencias declaradas

- **Clientes de Google por variable, nunca incrustados.** La referencia
  refresca los tokens importados con el cliente de la aplicación oficial,
  escrito en su código. Aquí es `THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_ID`
  y `_SECRET` (y los de `GEMINI`); sin ellos el refresco lanza un error que
  nombra las dos variables. El cliente configurado es
  `THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID`/`_SECRET` y `THYROX_GEMINI_OAUTH_CLIENT_ID`/`_SECRET`.
- **El secreto de GitHub** sale de `THYROX_GITHUB_OAUTH_CLIENT_SECRET`, sólo
  si se declara.
- **Descubrir el proyecto al refrescar** usa la misma consulta de Code Assist
  que el inicio de sesión (`antigravity/projectDiscovery.ts`), no una copia
  aparte como `antigravityProjectBootstrap.ts` en la referencia. La consulta
  se extrajo del flujo sin cambiar su conducta: las pruebas del flujo siguen
  pasando sin tocarlas. Un proyecto usable es texto no vacío; el centinela
  `__REQUIRES_GCP_PROJECT__` de la referencia no existe aquí, porque el
  descubrimiento devuelve el motivo aparte (`projectDiscoveryOutcome`).
- **El guardado del proyecto recuperado es una dependencia**
  (`persistProjectId`), no una escritura directa a la base: el despacho no
  conoce el almacén.
- **El extremo del refresco genérico también es una dependencia**
  (`genericEndpoint`), por la misma falta de registro global de proveedores.
- **Sin contexto de proxy saliente**: el punto de inyección es `fetch`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes (el primer typecheck dio además un TS2869 en la prueba, un `??` inalcanzable, corregido). `__tests__/accounts`: 428 tests, 0 fail (tsc-106e4bc, que cubre también #106e-4c).
