# 106e-5c-5 — configuraciones de extracción y demonio de vigencia de cookies

Porte de `omniroute: open-sse/services/tokenExtractionConfig.ts` y
`open-sse/services/autoRefreshDaemon.ts`:

- `accounts/webCookie/tokenExtractionConfig.ts` — las 22 configuraciones de
  inicio de sesión y extracción, generadas del bloque `RAW_CONFIGS` de la
  referencia con gawk para no transcribirlas a mano.
- `accounts/webCookie/autoRefreshDaemon.ts` — el demonio de vigencia.

`red-106e5c5.txt` es la mitad roja; `annul-106e5c5.sh`, 25 anulaciones;
`results-106e5c5.txt` publica el resultado.

## Observación sobre la referencia, portada tal cual

El demonio pide la página de inicio con `HEAD` **sin enviar la credencial**
registrada: sólo un sitio que rechace a cualquiera con 401/403 la marcaría
caducada. Se porta fiel, sin corregirlo. La verificación efectiva de una
cookie en el barrido es la de 106e-5c-3 (`webCookieHealthCheck`), que sí la
envía.

## Divergencias declaradas

- El demonio es una instancia (`createAutoRefreshDaemon`) y no un singleton de
  módulo; el reloj, los temporizadores, `fetch`, el plazo de la petición y el
  catálogo se inyectan.
- Los registros van por `RefreshLogger` con el tag `AUTO_REFRESH`, no por
  `console`.
- El `try/catch` exterior de `check()` en la referencia no se porta: la
  validación nunca lanza (captura dentro y devuelve «vigente»), así que esa
  rama era inalcanzable.
- Dos textos con marca: la entrada `claude-web` se llama «Anthropic Web
  (claude.ai)» y su instrucción dice «your Anthropic account»; la de
  `zai-web` no nombra el producto de la referencia.
- `TOKEN_EXTRACTION_CONFIGS` se publica como `ReadonlyMap`.
