# #106e-1 — infraestructura del refresco de tokens

Porte TDD de `omniroute: open-sse/services/tokenRefresh/{shared, casGuard,
circuitBreaker, rotationMap, googleClientBinding}.ts` y de
`wasRefreshTokenRotated` (`refreshSerializer.ts`), en `src/accounts/refresh/`.

| Archivo | Qué |
|---|---|
| `red-106e1.txt` | la mitad roja |
| `annul-106e1.sh` | 57 anulaciones |
| `rerun-106e1.sh` | las re-medidas tras afinar las pruebas, más la 17b sobre la línea nueva |
| `results-106e1.txt` | veredicto |

## Veredicto de las anulaciones

49 de 57 discriminaron a la primera. De las ocho restantes:

- **9, 10, 11, 17, 37, 57 — pruebas insuficientes, afinadas.** Las cuatro
  primeras las tapaba la búsqueda del código dentro de una frase, que
  encuentra cualquier código en cualquier sitio. Lo que no ve es el orden:
  el campo `error` tiene que ganar a un código mencionado antes en el
  mensaje. La 37 pedía comprobar que un irrecuperable no toca el disyuntor.
  La 57 pedía una marca con el prefijo en otra caja.
- **18 y 20 — comprobaciones muertas, retiradas.** `readRefreshErrorBody` ya
  no analiza el JSON antes de clasificar: la rama de texto lo analiza ella
  misma. Esto deja una sola clasificación (anulación 17b).
  `isUnrecoverableRefreshError` ya no comprueba `typeof object`: un texto no
  tiene `.error`.

## Divergencias declaradas

- **Estado por instancia, no por módulo.** El disyuntor con sus reintentos
  (`createRefreshRetrier`) y el mapa de rotaciones (`createRotationMap`)
  reciben reloj y espera inyectados: la pausa de media hora y el minuto de
  rotación se prueban sin esperar. La guarda CAS sigue en un
  `AsyncLocalStorage` de módulo, porque se consulta desde el fondo de la
  persistencia. Su reinicio de contadores es público (`resetCasGuardStats`),
  no una función «sólo para pruebas».
- **Sin clientes de Google incrustados.** La referencia resuelve el cliente
  «builtin» de sus credenciales públicas. Aquí `selectGoogleRefreshClient`
  recibe los clientes de cada familia, que el orquestador (#106e-4) lee de
  las variables `THYROX_*`. Si falta el de un proveedor, rehúsa nombrándolo.
- **La sal de la clave del mapa de rotaciones** es propia
  (`thyrox-token-cache`). Es una sal de hash, no una credencial. La clave
  sigue sin llevar el refresh token en claro.
- **`lookup` no vuelve a mirar la caducidad** tras podar: con el mismo reloj,
  la entrada caducada ya no está.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 323 tests, 0 fail (tsc-106e1-20260928T111234).
