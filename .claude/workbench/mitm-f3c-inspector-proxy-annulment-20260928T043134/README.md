# Anulación del proxy HTTP y del proxy del sistema (F3c)

`httpProxyServer` y `systemProxyConfig` en `src/packages/mitm/src/inspector/`.
Salida literal en `results.txt`; cada anulación tumba exactamente su caso.

| Anulación | Caso que cae |
|---|---|
| A1 — reenvío sin la lista de cabeceras prohibidas de `@thyrox/provider` | el que exige reenviar `Authorization` y quitar `Proxy-Authorization` y `X-Forwarded-For` |
| A2 — el puerto leído sin el prefijo | el de `THYROX_INSPECTOR_HTTP_PROXY_PORT` |
| A3 — `apply` sin sanear el error | el del error saneado, que antes sólo comprobaba un `Error` no vacío |

Dos correcciones a las pruebas de la referencia, las dos medidas:

- el cliente de la prueba del camino HTTP usaba `http.request` con `path`
  absoluto; en Bun eso va directo al upstream sin pasar por el proxy
  (H-THYROX-226, `bun-http-absolute-path-probe-*`). Ahora escribe la petición
  en forma absoluta sobre un socket crudo y la da por completa al leer su
  `Content-Length`, porque el servidor de Bun no cierra con `Connection: close`;
- el caso del error saneado no comprobaba el saneado; ahora exige que la ruta
  no aparezca.
