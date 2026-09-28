# #106d-5b-2 — zed-hosted, xai-oauth y grok-cli

Porte TDD de `omniroute: src/lib/oauth/providers/{zed-hosted,xai-oauth,grok-cli,grok-cli-oauth}.ts`,
de la mitad de autenticación de `open-sse/shared/zedAuth.ts` y de la parte
OAuth de `open-sse/config/grokBuild.ts`.

| Archivo | Qué |
|---|---|
| `red-106d5b2.txt` | la mitad roja: la suite antes de existir los módulos |
| `pkcs1-v15-probe.txt` | medición del relleno PKCS#1 v1.5 en Bun y en Node |
| `annul-106d5b2.sh` | 37 anulaciones, una por mitad de juicio |
| `results-106d5b2.txt` | veredicto por anulación |

## Divergencias declaradas

- **Client id sólo por variable.** Grok Build y xAI OAuth comparten
  `THYROX_GROK_OAUTH_CLIENT_ID` (en la referencia, `GROK_OAUTH_CLIENT_ID` con
  un id incrustado de respaldo, que no se copia).
- **Zed sin PKCS#1 v1.5.** La referencia descifra con OAEP-SHA256 y, si falla,
  con PKCS#1 v1.5. Bun rehúsa ese relleno en el descifrado privado
  (`pkcs1-v15-probe.txt`: «no longer supported for private decryption»), así
  que la rama no puede ejecutarse en thyrox. No se reimplementa a mano un
  relleno retirado por su oráculo de tiempo: se queda OAEP, el relleno que Zed
  usa y que la referencia prueba primero.
- **Zed, puerto local.** La referencia reusa el puerto del tablero
  (`getRuntimePorts`); thyrox no tiene tablero, así que quien compone el flujo
  inyecta `loopbackPort` (el del servidor local de inicio de sesión). Sin él,
  el puerto nativo por defecto (58443) y el pegado manual.
- **Zed, sólo la autenticación.** El token LLM, la caché de modelos y
  `zedLlmFetch` son del consumo de la conexión: van con #106e.
- **Grok, lo pegado.** En la referencia `mapTokens` envía todo registro con
  `access_token` a la conversión del navegador, así que la importación nunca
  ve un id token, un tipo ni un alcance: la mezcla de claims del id token
  (`resolveGrokIdentity` con dos fuentes) y la rama `access_token` de
  `extractTokenAndRefresh` eran inalcanzables. El porte conserva sólo las
  formas alcanzables — JWT suelto, `{ accessToken }` y `auth.json` — con la
  misma salida (idToken, tokenType y scope nulos). El validador de pegado del
  modal (`parseGrokCliPasteToken`) va con las importaciones (#106d-6).
- **Grok, cabeceras.** Sólo las de OAuth; las de sesión y modelos son del
  proxy (#106e).
- El reloj de la caducidad se inyecta (`now`) en vez de `Date.now()`.

## Re-medición

- **10 (nombre desde `github_login`) no discriminaba:** el usuario de prueba no
  traía correo, y `mapTokens` recae en el correo — que era el mismo login. Con
  un correo distinto, la anulación cae.
- **37 (URI de verificación completa)** no estaba ejercida; la prueba del HTTP
  local ahora trae una completa distinta.

## Typecheck

La primera pasada (`tsc-106d5b2`) dio dos TS2345 en la prueba: pasaba un JWT
suelto a `mapTokens`, que recibe un registro. La ruta siempre envuelve lo
pegado como `{ accessToken }`; la prueba usa esa forma y el JWT suelto se
ejerce sobre `mapImportedGrokToken`. Tras el arreglo (`tsc-106d5b2-fix`), sólo
los dos TS6059 preexistentes. `__tests__/accounts`: 171 tests, 0 fail.
