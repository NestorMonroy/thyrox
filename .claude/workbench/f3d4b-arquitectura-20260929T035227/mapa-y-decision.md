# F3d-4b — mapa de arquitectura y decisión

Fuentes: `inventario-thyrox.md` y `referencia-2.1.283.md` de este banco.

## Mapa

| Componente | Proceso dueño | Protocolo / IPC | Almacenamiento | Consumidor | Ciclo de vida | Estado en thyrox | En la referencia |
|---|---|---|---|---|---|---|---|
| proxy de proveedores | quien llama `startProxyServer` | HTTP (`Bun.serve`) | ninguno compartido | CLI, pool | `stop()` del llamador | implementado | no existe; sin relación con el daemon |
| proxy de credencial | el pool / la CLI | HTTP sobre UDS | ninguno | cliente del provider | `close()` | implementado | no existe |
| MITM + API local | hijo del manager MITM | https/net + HTTP/WS en loopback | sqlite, CA, `.mitm.pid` | UI/CLI | pid + señal | implementado | no existe |
| daemon bg | proceso desacoplado `daemon bg run` | UDS `control.sock`, JSON por versión | archivos propios: roster, jobs, spool, pty-pids | CLI, flota del REPL | spawn por la CLI; watchdogs; adopción al reiniciar | parcial: fuera del workspace, host PTY stub | proceso desacoplado, `control.sock` o named pipe; storage en proceso con respaldo a fs |
| socket rv por trabajo | el REPL bg | UDS `rv.sock`, frames de estado | `state.json` | daemon | ligado al trabajo | implementado | — |
| buzón UDS de sesión | la sesión | UDS por sesión | clave publicada en `<config>/sessions` | otras sesiones | vida de la sesión | ausente (F2 en curso) | igual, clave por storageV5 o archivo |
| storageV5 | cada proceso, en proceso | ninguno | fs bajo el dir de config | session, transcript, sidecar, daemon, job, task… | se crea al arrancar | ausente (sólo claves en `storageKeys.ts` y la interfaz `SessionKeyStorage`) | interfaz + fábrica stub: `tryCreateV5Backend` devuelve `undefined`; todo va por fs directo |

## Frontera de proceso real

- CLI ↔ daemon: sí hay frontera, y ya tiene su IPC (`control.sock`), en la
  referencia y en `@thyrox/daemon`. No transporta almacenamiento.
- daemon ↔ storage: no hay frontera. Cada proceso usa el almacenamiento en su
  propio proceso; en 2.1.283 eso es fs directo porque el backend no se entrega.
- daemon ↔ proxy: ninguna relación, en los dos lados.
- sesión ↔ sesión: el buzón UDS (F2), que es otro mecanismo que el
  `control.sock` del daemon y no se fusiona con él.

## Opción

**A.** `storageV5` es una biblioteca en proceso sobre el sistema de archivos y
el daemon la usaría directamente, en su propio proceso. B no aplica (nada del
almacenamiento vive sólo en otro proceso), C no aplica (ningún servidor
existente sirve almacenamiento, y ninguno debe), D no aplica (no hay
consumidor que necesite un servidor nuevo).

## Dónde cae el trabajo de F3d-4b

- `SessionKeyStorage`: no hay nada que portar para paridad. En 2.1.283 la
  clave del buzón va siempre por archivos, porque el backend no existe; y ese
  camino ya está portado y probado (`inboxKeys.ts`, respaldo en `:314`).
- `storageV5`: la referencia no trae implementación; portarla sería inventarla.
  Queda la interfaz y las claves (`storageKeys.ts`), igual que en la referencia.
- daemon: los huecos reales son del daemon, no del almacenamiento: entrar al
  workspace, el host PTY y el cableado del subcomando `daemon`.
- IPC compartida: no hace falta; la del daemon ya existe.

## Cambio mínimo

Ninguno en almacenamiento. F3d-4b se cierra como "sin backend propio: la
referencia no lo entrega y el camino de archivos es su conducta", y el trabajo
que sí falta se abre como tareas del daemon.
