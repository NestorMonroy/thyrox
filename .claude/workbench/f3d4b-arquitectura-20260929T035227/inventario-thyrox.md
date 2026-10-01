# Inventario de thyrox: daemon, servidores y almacenamiento (F3d-4b)

Producido por un subagente Explore de sólo lectura el 2026-09-29, sobre
`src/packages` del árbol en `9f076ef3`..`d4b58b5e`. Transcrito aquí porque el
informe de un subagente sólo vive en la conversación que lo pidió. Las citas
son `file:line` de su lectura; no se re-midieron una a una.

## Tabla

| Componente | Proceso dueño | Protocolo / IPC | Almacenamiento | Consumidor | Ciclo de vida | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| bg-daemon (supervisor de trabajos) | `<bin> daemon bg run` desacoplado, `THYROX_CODE_DAEMON_TRANSIENT=1` | UDS `node:net` en `$TMPDIR/cc-daemon-<uid>/<sha8(cwd)>/control.sock`; ops JSON, PROTO_VERSION=1; comprobación del uid del par | `~/.claude/daemon/roster.json`, `~/.claude/jobs/<short>/meta.json`, `state.json`, spool `dispatch/*.json`, `pty-pids/` | CLI (`cli/src/bg/daemonAdapter.ts`), UI de flota del REPL, `stopJob`/`respawnJob` | lo lanza la CLI (`ensureDaemon`); se detiene con `daemon bg stop`, vigilante de inactividad o de actualización; al reiniciar adopta workers del roster y del escaneo de jobs/ | parcial | `daemon/src/bgDaemon.ts:129`; `cli/src/bg/daemonAdapter.ts:168-183`; `daemon/src/socketServer.ts:56-65,141-151,180`; `daemon/src/socketPaths.ts:47-56`; `daemon/src/roster.ts:76,261-266`; `daemon/src/bgAdopt.ts:38`; `daemon/src/bgDaemonTimers.ts` |
| supervisor heredado (`daemon start`) | `runSupervisor`, mismo modelo | ninguno propio | registro de workers | switch de `daemonMain` | `status`/`stop` delegan al bg-daemon | parcial | `daemon/src/main.ts:43-100` |
| socket de encuentro por trabajo | el REPL bg interno | `net.createServer` en `<jobDir>/rv.sock`; el worker empuja state/done/heartbeat | `state.json` | `rvClient` del daemon | sólo con `THYROX_CODE_SESSION_KIND=bg` y la variable del rv-sock | implementado | `agent/background/fleet/rvServer.ts:173,192`; `repl/src/screens/repl/useBgRendezvousServer.ts:24`; `daemon/src/socketPaths.ts:88` |
| proxy de proveedores | `startProxyServer` (`Bun.serve`, host/puerto de config) | HTTP | nada compartido | CLI | `stop()` devuelto al llamador | implementado | `provider/src/proxy/startServer.ts:212` |
| proxy de credencial | `Bun.serve({unix})` | HTTP sobre UDS; inyecta la credencial | ninguno | cliente del provider por `credential.unixSocket` | `close()` | implementado | `provider/src/credentialProxy.ts:49-50`; `provider/src/anthropicHttp.ts:133` |
| servidor MITM | hijo lanzado por `mitm/src/manager.ts` (spawn, SIGTERM) | https/net en puerto local, reenvía al proxy | `.mitm.pid`, store sqlite, CA | manager MITM | archivo pid + `process.kill(pid,0)` | implementado | `mitm/src/server/main.ts:45`; `mitm/src/manager.ts:57,84-101,347` |
| API local del MITM | `Bun.serve` en 127.0.0.1 | HTTP + WS | store de estado | UI/CLI | arranca y para con el manager | implementado | `mitm/src/api/server.ts:12,36,44`; `mitm/src/api/locality.ts:43` |
| escuchas de callback OAuth | `http.createServer` efímero en localhost | HTTP | ninguno | flujos de login | cortos | implementado | `provider/src/oauth/codex-client.ts:256-290`; `provider/src/accounts/oauth/callbackServer.ts:75` |
| relay del upstream proxy de CCR | `Bun.listen`/`net.createServer` en 127.0.0.1:0 | TCP | ninguno | sesión remota | ligado a su sesión | implementado | `server/src/upstreamproxy/relay.ts:194,258,282` |
| servidor del buzón UDS | — | — | — | — | — | ausente (F2 en curso) | `local-observability/src/uds/udsMessaging.ts:1-10` |
| ayudantes del buzón UDS | biblioteca | `bind.ts`, `peerCredentials`, `inboxAuth`, `inboxConnection` | archivos bajo `<config home>/sessions` | nada escucha aún | n/a | parcial | `local-observability/src/uds/bind.ts:38-88`; `inboxKeys.ts:54`; `socketsDir.ts:12` |
| storageV5 | — | — | — | — | — | ausente | único hit: comentario en `provider/src/oauth/client.ts:209` |

## Huecos del daemon

- `@thyrox/daemon` no es miembro del workspace (lo dice su package.json; sólo `agent/` lo declara).
- El anfitrión PTY es un stub: `spawnPtyHost` lanza «@thyrox/cli aun no porta bg/spawnPty» (`daemon/src/internal/pendingCrossPackageDeps.ts:430-432`); `logEvent` y `getClaudeAIOAuthTokens` también son stubs inyectables.
- El subcomando `daemon` no aparece cableado claramente a un entrypoint de la CLI (sólo `config/entrypoint.ts:374` y `daemonAdapter.ts:176`); no se trazó el despacho de nivel superior.
- Hay rutas que asumen no tener daemon: `cli/src/handlers/agentsFleet.ts:299`.

## Almacenamiento

- Los namespaces existen sólo como constructores de claves en `local-observability/src/storageKeys.ts`: `transcript` (:104-119), `sidecar` (:145), `session` (:156), y otros.
- `SessionKeyStorage` (`inboxKeys.ts:54-60`) define `ensureScope`, `write` atómico con modo exacto, `delete`, `listEntries` paginado y `readText`. Sin implementación real: sólo el doble `memoryStorage` de `udsInboxKeys.test.ts:231`. Nadie fija `storageBackendPin` fuera de pruebas; sin backend se usan archivos locales (`inboxKeys.ts:314`).
- `LocalFileStorageBackend` (`storage/src/backends/localFileBackend.ts:20-60`) no se relaciona: sin modos, sin escritura atómica, sin O_NOFOLLOW, sin namespaces.
- Primitivas ya presentes: `writeFileAtomicWithMode` con O_NOFOLLOW y respaldo EXDEV/EPERM (`uds/atomicWrite.ts:30,137,159,252,304,336`); `realpath` y modos del directorio de sockets (`uds/socketsDir.ts:12,48-51`); otro escritor O_EXCL|O_NOFOLLOW 0600 en `skills/src/registry.ts:86-90`.
- Transcripts y sidecars se escriben con fs directo (`storage/src/sessionStorage.ts:222,1285-1292,1339-1379`; `storage/src/agentMetadata.ts:4-9,139`).
- El daemon escribe su estado con `writeFile` + `rename` y modos 0600/0700 propios (`daemon/src/roster.ts:263-266`; `dispatchSpool.ts:231-237`), sin `atomicWrite.ts`.

## Comunicación

- CLI → daemon: `control.sock` (`daemonAdapter.ts:168-183`); el REPL usa `daemonList`/`daemonKill`/`daemonRespawn`.
- daemon → worker: `rv.sock` por trabajo y `<short>.pty.sock`.
- archivos: spool de dispatch, `state.json`, `meta.json`.
- sesión ↔ sesión: ninguna viva (el buzón aún no escucha).
- daemon → proxy: ningún vínculo encontrado.
