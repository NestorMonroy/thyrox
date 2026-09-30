/**
 * El arranque del buzón por socket de la sesión (`mn`, vía
 * `@thyrox/local-observability/uds/udsMessaging.js`) desde el módulo de
 * arranque compartido de `bin/cli`, junto a `registerSessionAtLaunch`
 * (`sessionRegistryAtLaunch.ts`) — TASK-THYROX-0450.
 *
 * Medido contra 2.1.283 (`_references/claude-code-bin/2.1.283/bunfs-root/`)
 * antes de cablear:
 *
 *   - **El orden**: `chunk-65294ky5.js` (`setup()`) arranca el buzón con
 *     `await h.startCrossSessionInbox(y,n,{profileStartup:!0})` ANTES de
 *     que corra ningún hook — el propio `startMessagingInbox` ya portado
 *     (`inboxServer.ts:447`) fija `process.env[MESSAGING_SOCKET_ENV]` sólo
 *     tras bindear, chmod-ear y publicar la clave, y siempre antes de
 *     devolver. Aquí `bin/cli` (`runLoop.ts`, `print.ts`) llama esta
 *     función ANTES de la primera llamada a `streamLoop` — el único punto
 *     donde corren los hooks `SessionStart` (`@thyrox/agent/loop/
 *     index.ts:206`) —, así que el env queda exportado antes de que
 *     cualquier hook pueda hacer un snapshot de `process.env`.
 *   - **`--bare` / `THYROX_CODE_SIMPLE`**: `setup.ts:96` guarda el mismo
 *     gate que la referencia (`!isBareMode() || messagingSocketPath !==
 *     undefined` — `--messaging-socket-path` es la vía de escape también en
 *     modo bare, mismo patrón que el resto del árbol declara para `#23222`).
 *     Se reproduce aquí verbatim en vez de reexportar `setup.ts`, que trae
 *     consigo instalación de swarm, snapshot de teammates y restauración de
 *     terminal — nada de eso es de este módulo.
 *   - **`--messaging-socket-path`**: en la referencia llega como
 *     `o.messagingSocketPath` (argv ya parseado) hasta `setup(cwd, …, ei)`
 *     (`chunk-bdv29443.js`). Aquí el llamador (`runLoop.ts`/`print.ts`) lee
 *     `flag(argv, 'messaging-socket-path')` de SU propio argv y lo pasa
 *     como `explicitSocketPath`.
 *   - **La publicación en el pid file**: la referencia sólo llama
 *     `updateSessionMessagingSocketPath`/`getUdsMessagingSocketPath` en el
 *     camino de "late bind" (`chunk-65294ky5.js`, función `ie`, gateada por
 *     un refresco de GrowthBook — fuera de alcance, no portado). En el
 *     camino eager que sí se porta aquí, la referencia deja que
 *     `registerAtLaunch` (que corre ANTES que `setup()` en su bootstrap
 *     monolítico) componga el registro sin este campo, y algún consumidor
 *     posterior no medido lo completa. Este árbol tiene los dos pasos
 *     desacoplados —`registerSessionAtLaunch` no sabe nada del buzón—, así
 *     que la pieza que SÍ está portada y sin llamador
 *     (`publishMessagingSocketPath`, `pidFileRecord.ts`) se invoca aquí con
 *     la ruta ya bindeada, inmediatamente después de arrancar el buzón:
 *     mismo campo (`messagingSocketPath`) y mismo mecanismo (`X5o`/
 *     `updateSessionMessagingSocketPath`) que usa el camino de "late bind"
 *     de la referencia, aplicado también al camino eager — divergencia
 *     declarada, exigida por el desacople de este puerto.
 *
 * `feature('UDS_INBOX')` es un macro de compilación de `bun:bundle`: se
 * resuelve con la bandera `--feature` de `bun`, ausente en `bin/cli`
 * (apagado por defecto, igual que en `setup.ts`) y presente en
 * `scripts/dev.ts` para otras banderas (`DEV_FEATURES`). Una sesión de
 * prueba la enciende con el mismo mecanismo:
 * `bun --feature=UDS_INBOX run <entry>`.
 */
import { feature } from 'bun:bundle'
import { isBareMode } from '@thyrox/config/env/utils.js'
import { publishMessagingSocketPath } from '@thyrox/local-observability/uds/pidFileRecord.js'

/** El mismo contrato estructural que `MessagingStop` de `inboxServer.ts`: cierra el buzón y desregistra su limpieza de apagado. */
export type MessagingInboxStop = () => Promise<void>

/**
 * Arranca el buzón de esta sesión si `feature('UDS_INBOX')` está encendida
 * y el modo no es `--bare` (salvo que `explicitSocketPath` la traiga como
 * vía de escape), y publica la ruta bindeada en `sessions/<pid>.json`.
 * `undefined` si no arrancó por cualquiera de esas causas — el mismo
 * significado que `startUdsMessaging` ya usa.
 */
export async function startMessagingInboxAtLaunch(explicitSocketPath?: string): Promise<MessagingInboxStop | undefined> {
  if (isBareMode() && explicitSocketPath === undefined) return undefined
  if (!feature('UDS_INBOX')) return undefined
  const m = await import('@thyrox/local-observability/uds/udsMessaging.js')
  const stop = await m.startUdsMessaging(
    explicitSocketPath ?? m.getDefaultUdsSocketPath(),
    { isExplicit: explicitSocketPath !== undefined },
  )
  if (stop === undefined) return undefined
  const boundPath = m.getUdsMessagingSocketPath()
  if (boundPath !== undefined) await publishMessagingSocketPath(boundPath)
  return stop
}
