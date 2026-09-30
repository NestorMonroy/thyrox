# #106e-3 — refrescadores del lote B

Porte TDD de `omniroute: open-sse/services/tokenRefresh/providers/{codex,
openference, cursor, kimiCoding, museCode, kiro}.ts`, en
`src/accounts/refresh/providers/`, con el mismo contrato de resultado que el
lote A (`refreshResult.ts`): tokens, token muerto, o `null` si el fallo es
pasajero.

| Archivo | Qué |
|---|---|
| `red-106e3.txt` | la mitad roja |
| `annul-106e3.sh` | 49 anulaciones |
| `rerun-106e3.sh` | la re-medida tras afinar la prueba |
| `results-106e3.txt` | veredicto |

## Veredicto de las anulaciones

46 de 49 discriminaron a la primera. Las tres restantes las tapaba la prueba:

- **11** (codex con la URL de tokens fija): la prueba usaba la configuración
  por defecto, cuya URL es la misma que la fija. Ahora refresca también contra
  una URL declarada.
- **24** (cursor reintenta tras el último intento): el resultado era `null`
  igual; sólo cambiaba una espera de más. La prueba cuenta ahora las esperas.
- **39** (kiro deja escapar el error de configuración del IdP): el `catch`
  exterior también devolvía `null`. La prueba exige ahora el aviso propio.

## Divergencias declaradas

- **Sin contexto de proxy saliente**, igual que el lote A: el punto de
  inyección es el `fetch` de las dependencias.
- **Un módulo común para los tokens de un solo uso.** codex y openference
  eran dos copias del mismo refresco; aquí comparten `rotatingTokenRefresh.ts`
  y difieren sólo en la URL y el conjunto de códigos muertos. Los dos rehúsan
  sin cliente (`requireClientId`), nombrando la variable `THYROX_*`.
- **codex** toma la URL de tokens de su configuración, no de una constante.
- **Cursor** recibe inyectados el reloj, el azar y la espera, y los intentos,
  la base del retroceso y el plazo son configurables.
- **Kimi Coding** recibe inyectada la descripción del host (`system`) y el
  entorno de la versión; `KIMI_CODING_TOKEN_URL` se exporta desde su flujo.
- **Muse Code** recibe el reloj inyectado para `lastRefresh`.
- **Kiro** valida la región contra `AWS_REGION_PATTERN` antes de componer la
  URL de OIDC, re-registra el cliente con `kiroService.registerClient` en vez
  de repetir el registro, y devuelve el cliente nuevo como `newClient` en vez
  de los campos `_newClient*` de la referencia.
- `OPENFERENCE_TOKEN_URL` se exporta desde su flujo (antes `TOKEN_URL`, local).

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 372 tests, 0 fail (tsc-106e3).
