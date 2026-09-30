# storageV5 y el daemon en la referencia 2.1.283 (F3d-4b)

Producido por un subagente Explore de sólo lectura el 2026-09-29 sobre
`_references/claude-code-bin/2.1.283/bunfs-root/`. Transcrito aquí para que
sobreviva a la conversación. La afirmación central (la fábrica del backend es
un stub) se re-midió después, con el resultado al final.

## storageV5 es un tipo de interfaz, no un servicio

- `chunk-m8ebe51k.js` NO es la implementación: es un CONSUMIDOR que recibe un
  backend y llama `listEntries({namespace:"sidecar",...})`, `readText(...)` y
  `ensureScope(...)`; también tiene una ruta de fs directo con `O_NOFOLLOW`,
  `requireNlink1` y `verifyHandlePath`.
- Ningún chunk define una clase que implemente `ensureScope`/`write`/
  `listEntries` para el backend v5.
- La fábrica es un stub (`chunk-w1vp9f7e.js`): `uVn` = `tryCreateV5Backend`
  devuelve siempre `undefined`. `N()` es un pin por proceso (bandera remota
  `tengu_hover_rest`; `X0r` lee además `CLAUDE_CODE_HOVER_REST`).
- El backend se crearía en cada proceso al arrancar (`iXn({storageV5EnvPin})`,
  `chunk-fa2jy0nf.js`), anclado al directorio de config.
- Todo consumidor lleva la rama de respaldo: `if(N()&&backend!==void 0){await
  backend.ensureScope(...)} else fs.mkdir(...)`, con modos 448 (0700) y 384
  (0600) en el propio consumidor.

## El daemon

- Propósito: sesiones en segundo plano ("bg"), telemetría `tengu_bg_daemon_*`.
- Lanzamiento desacoplado (`detached:!0`); macOS con `launchctl asuser`;
  Windows por WMI con respaldo a spawn directo; `CLAUDE_CODE_PROCESS_WRAPPER`.
- IPC: un socket de control, `net.createServer`, en
  `<tmp>/cc-daemon-<uid>/<hash8>/control.sock` (Unix) o
  `\\.\pipe\cc-daemon-<key>-control` (Windows, clave en `~/.claude/daemon/pipe.key`
  0600). Marco: cabecera de 5 bytes (longitud uint32 + tipo) y JSON. Lleva
  dispatch, nudge y shutdown; NO lleva almacenamiento.
- Ciclo de vida: `bgDisabled`, `startedAt >= spawnIssuedAt`, lock con
  `lock_at_deadline` (absent/unreadable/other_alive/other_dead/other_eperm),
  reinstalación de npm.
- Tombstones en el namespace `daemon` (`host-managed`) por storageV5 si lo hay;
  si no, escritura de archivo plana.
- El `storageV5` que recibe el daemon es el mismo objeto en proceso, creado en
  su propio proceso; nunca se serializa por el socket.

## Consumidores de storageV5

| Chunk | Namespace |
|---|---|
| chunk-92tvramn.js | daemon (dispatch, host-managed) |
| chunk-m5drh1xg.js | daemon (host-managed) |
| chunk-5mcqvwzx.js | session (carpeta de la clave del buzón) |
| chunk-hb0x674w.js | job |
| chunk-zgfcmyzt.js | task |
| chunk-csayct82.js | pluginCache, trash, alias de sesión |
| chunk-m8ebe51k.js | sidecar, transcript |
| chunk-d2j9nqzr.js | ledger de comentarios |
| chunk-d310mfjt.js | credencial de org-memory |
| chunk-t6pwageh.js | cachés de capacidades de modelo y gateway |

Ninguno pasa por un socket ni por la red.

## Relación con el proxy de modelos

Ninguna: sin `ANTHROPIC_BASE_URL`, proxy ni localhost en los chunks del daemon.
`CLAUDE_CODE_USE_GATEWAY` sólo se anota en el tombstone.

## Re-medición de la afirmación central

```
$ bash bin/binary symbol chunk-w1vp9f7e.js uVn N </dev/null
---- chunk-w1vp9f7e.js function uVn [1543,1580)
function uVn(){if(!N())return;return}
---- chunk-8nz62976.js function N [1137,1164)
function N(){return t===!0}
$ grep -oE 'v5 storage backend was built at start-up.{0,120}' chunk-w1vp9f7e.js
v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access
```
