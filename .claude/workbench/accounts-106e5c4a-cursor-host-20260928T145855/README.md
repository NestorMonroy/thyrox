# 106e-5c-4a — Cursor en el anfitrión: credenciales, `cursor-agent` y candado por clave

Porte de `omniroute: src/lib/cursor/tokenExtractor.ts`,
`src/lib/providerModels/cursorAgent.ts` y `src/shared/utils/keyedMutex.ts`:

- `accounts/cursor/cursorTokenExtractor.ts` — `state.vscdb` del IDE y `auth.json` del CLI.
- `accounts/cursor/cursorAgent.ts` — el proceso, su binario y su catálogo de modelos.
- `concurrency/keyedMutex.ts` — el candado que serializa por clave.

`red-106e5c4a.txt` es la mitad roja; `annul-106e5c4a.sh`, 41 anulaciones;
`rerun-106e5c4a.sh` repite las 21 y 27 tras afilar sus casos. La 2 anulaba el
`onRejected` de la cola: su predecesor es un marcador que nunca rechaza, así
que era código muerto y se retiró. `results-106e5c4a.txt` publica el resultado.

Las pruebas del IDE usan bases SQLite reales en un directorio temporal, y las
del proceso, guiones de shell reales: el plazo con SIGTERM y el SIGKILL de
quien lo ignora se miden contra procesos vivos.

## Divergencias declaradas

- La base se abre con `bun:sqlite` en sólo lectura, con `busy_timeout`, y se
  lee su cabecera al abrir: un archivo que no es SQLite falla al abrir (y en
  macOS se nombra), no al consultar. La referencia elegía un driver entre
  varios (`tryOpenSync`).
- Un fallo de lectura se devuelve sin escribirlo en la consola.
- El anfitrión se inyecta (`home`, `platform`, `appdata`, `verifyInstalled`,
  `exists`, `path`) en vez de leerse de `os` y `process` en el cuerpo.
- El mensaje de no autenticado dice «on this host», no el nombre del producto
  de la referencia.
- `humanizeCursorModelId` conserva sólo las excepciones que difieren de
  capitalizar la primera letra (`GPT`, `XHigh`): las demás daban lo mismo.
- `fetchCursorAgentModels` acepta `resolveBinary` para no depender del disco.
- El candado expone `pendingKeys()` para poder medir que una clave se olvida.
