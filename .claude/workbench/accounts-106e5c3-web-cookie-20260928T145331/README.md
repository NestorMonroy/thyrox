# 106e-5c-3 — cookies web en el refresco proactivo

Porte de `omniroute: src/lib/tokenHealthCheckWebCookie.ts`,
`src/lib/providers/validation/webCookie.ts`, los conjuntos de
`validation/transport.ts`, los identificadores de
`src/shared/constants/providers/web-cookie.ts` con el `baseUrl` de su entrada
del registro, y `extractZaiToken` de `open-sse/executors/zai-web/protocol.ts`.

- `accounts/webCookie/webCookieProviders.ts` — catálogo (33) y conjuntos.
- `accounts/webCookie/zaiToken.ts` — la credencial de Z.ai.
- `accounts/webCookie/webCookieProbe.ts` — resolver y sondear.
- `accounts/refresh/health/webCookieHealthCheck.ts` — la hoja del barrido.

`red-106e5c3.txt` es la mitad roja; `annul-106e5c3.sh` tiene 41 anulaciones.
`results-106e5c3.txt`: discriminan las 39 que quedan; la 9 se afiló con
`Cookie: baretoken` y las 12 y 32 anulaban guardas sin efecto observable, que
se retiraron.

Los `baseUrl` se extrajeron ejecutando el registro de la referencia
(`getRegistryEntry`) sobre cada id del catálogo, sólo lectura.

## Divergencias declaradas

- El catálogo guarda sólo id y host de sondeo; nombre, icono, color y textos
  de ayuda son de la interfaz de la referencia.
- La pertenencia al catálogo usa `Object.hasOwn`: la referencia indexaba un
  objeto literal y `constructor` pasaba por proveedor.
- Sin guarda SSRF ni reintento por proxy: los hosts salen de un catálogo fijo,
  no de la entrada del usuario. La redirección no se sigue (`redirect:
  'manual'`); un 3xx da `Redirect blocked`, o «no soportado» en `lmarena`,
  como hacía `REDIRECT_BLOCKED`.
- `chatgpt-web` se valida con un validador inyectado; sin él, «no soportado».
  Su normalización del storage state es TASK-THYROX #171 (106e-5c-3b).
- Retiradas dos guardas sin efecto: `startsWith('{')` antes de `JSON.parse` y
  `lastCheckMs > 0` antes de comparar el intervalo.
- El sondeo se inyecta en la hoja; la etiqueta del log es `name` o `id`.
