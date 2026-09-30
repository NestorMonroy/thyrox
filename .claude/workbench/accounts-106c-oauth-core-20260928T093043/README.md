# #106c — núcleo OAuth de las cuentas de proveedor

Porte a `src/packages/provider/src/accounts/oauth/`:

| Módulo | Porte de (`omniroute:`, MIT) | Responsabilidad |
|---|---|---|
| `pkce.ts` | `src/lib/oauth/utils/pkce.ts` | verificador de longitud declarada, reto S256, `state` |
| `callbackServer.ts` | `src/lib/oauth/utils/server.ts` | recibir la redirección y entregar su query |
| `oauthFlows.ts` | `src/lib/oauth/providers.ts` | URL de autorización, intercambio, finalizar fuera de banda, device code |
| `oauthPersistence.ts` | `src/lib/oauth/connectionPersistence.ts` | el resultado OAuth como cuenta del store (#106b) |

`@thyrox/provider/oauth` ya trae `crypto.ts` y `AuthCodeListener`, porte del
binario para el login propio de la CLI: fijan la longitud del verificador y
escuchan en `localhost` con la página y la configuración de ese login. Los
flujos de OmniRoute necesitan otra longitud por proveedor (`pkceVerifierBytes`)
y otra página, así que el núcleo de cuentas lleva el suyo.

## Divergencias

1. **El callback escucha en `127.0.0.1`**, no en `0.0.0.0`: la redirección
   la hace el navegador de la misma máquina, y exponer el código de
   autorización a la red no compra nada. Para un despliegue remoto la
   referencia sube la redirección a una URL pública
   (`resolveBrowserOAuthRedirectUri`), que llega con el flujo de Antigravity
   en #106d, el único que la usa.
2. **`waitForCallback` se integra en `startCallbackServer`**: en la
   referencia no está conectado al servidor (guarda el `onCallback` en la
   función `resolve` y nadie lo lee). Aquí el servidor devuelve la promesa
   del callback con su plazo.
3. **Los flujos se reciben** (`createOAuthFlows(flows)`) en vez de salir del
   registro global `PROVIDERS`; los flujos concretos son #106d.
4. **El mensaje de un flujo de importación lo declara el flujo**
   (`importTokenHint`), en vez de una cadena de `if` por nombre de proveedor
   en el despachador.
5. **Persistir es síncrono y sin sincronización con la nube**
   (`syncToCloudIfEnabled`): el store es síncrono y thyrox no tiene nube.
6. **Sin el estado de proyecto degradado de Antigravity**
   (`antigravityPersistStatus`): llega con ese flujo en #106d.
7. **Sin los tickets del enlace público de Codex** (`deviceFlowTickets.ts`):
   son la página `/connect/codex/{token}` del tablero, que thyrox no tiene.

## Verificación

Rojo persistido en `red-106c.txt`. Anulaciones: `annul-106c.sh`,
`results-106c.txt`.

La anulación 12 no discriminaba: la fila de prueba llevaba `email: null`,
y el store devuelve las filas sin la clave. Con la forma real cae; la
repetición es `annul-106c-12.sh`. Las 16 discriminan.

Build tsc: 0 errores. Test tsc: sólo los dos TS6059 que ya están en HEAD.
`__tests__/accounts`: 58/58.

Las funciones de desambiguación se nombran por su criterio
(`isSameWorkspaceAccount`, `isSameOrganizationAccount`): `results-106c.txt`
conserva los nombres y el título de prueba con que se midieron las
anulaciones 13 y 14, antes del renombre.
