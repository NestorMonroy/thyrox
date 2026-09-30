# #106d-6b — archivo de credenciales del CLI de Anthropic

Porte TDD de `omniroute: src/lib/oauth/utils/claudeAuthFile.ts` (exportar una
conexión al archivo de credenciales del CLI) y `claudeAuthImport.ts`
(importarlo como conexión).

| Archivo | Qué |
|---|---|
| `red-106d6b.txt` | la mitad roja |
| `annul-106d6b.sh` | 35 anulaciones, una por mitad de juicio |
| `annul-106d6b-rerun.sh` | re-medición de 26 |
| `results-106d6b.txt` | veredicto por anulación: las 35 discriminan |

## Divergencias declaradas

- **Nombres.** Los identificadores, mensajes y el nombre de archivo exportado
  dicen Anthropic (`anthropic-auth-<correo>.json`, «Anthropic (imported)»): el
  gate de la palabra del producto no admite la otra. Lo que es formato del
  archivo del CLI (`claudeAiOauth`) y el id del proveedor en el store
  (`claude`) se conservan: son contrato.
- **Refresco inyectado.** `getAccessToken`/`updateProviderCredentials` son de
  #106e; aquí `refresh` es una dependencia (`{ unrecoverable: true }` para un
  refresh token muerto, `null` para un fallo) y lo refrescado se persiste con
  `store.update`.
- **Margen de refresco:** cinco minutos. La referencia toma el máximo con
  `TOKEN_EXPIRY_BUFFER_MS` de su módulo de refresco, que llega con #106e.
- **Rutas y respaldo.** `authPath` lo pasa quien llama (en la referencia sale
  de la tabla estática de CLIs) y el respaldo central es un `backup` opcional.
- **User-Agent del bootstrap** inyectado: el de thyrox, no el del CLI ajeno.
- **Reloj y aleatoriedad** inyectados (`now`, `randomHex`).
- `shouldRefreshAnthropicConnection` no lleva la guarda de `NaN`: una fecha
  ilegible da `NaN` y ninguna comparación con `NaN` es verdadera.

## Re-medición

- **26 (bootstrap no-OK)** no discriminaba: la respuesta de error no era JSON,
  así que el `catch` la absorbía igual. Con un 500 cuyo cuerpo es JSON, la
  anulación cae.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 191 tests, 0 fail (job tsc-106d6b-20260928T103045).
