/**
 * Escuchar en la ruta del buzón sin pisar a otra sesión. Porte de `me`, `ne`,
 * `tn`, `sn`, `rn`, `B` y `H` de 2.1.283 (`chunk-yg53q7yp.js`).
 *
 * Divergencia de la referencia: `ne` detecta la colisión sólo por
 * `EADDRINUSE`, y Bun escucha sin error sobre un socket vivo y se queda con
 * sus clientes. Aquí la vida del socket se mide antes de escuchar.
 */
import { randomBytes } from 'node:crypto'
import { readdir, unlink } from 'node:fs/promises'
import { Socket, type Server } from 'node:net'
import { basename, dirname, join } from 'node:path'

import { getErrnoCode } from '../errorHelpers.ts'
import type { InboxState } from './inboxState.ts'
import { MAX_SOCKET_PATH_BYTES } from './socketPath.ts'

/** Cuánto espera `me` a que el socket acepte antes de darlo por muerto. */
const LIVENESS_TIMEOUT_MS = 250
const MOVED_ASIDE_ATTEMPTS = 3

/** `me`: si alguien escucha en la ruta. */
export function isSocketLive(path: string): Promise<'live' | 'dead'> {
  return new Promise(resolve => {
    const probe = new Socket()
    const settle = (verdict: 'live' | 'dead') => {
      probe.destroy()
      resolve(verdict)
    }
    probe.on('connect', () => settle('live'))
    probe.on('error', () => settle('dead'))
    probe.setTimeout(LIVENESS_TIMEOUT_MS, () => settle('dead'))
    probe.connect({ path })
  })
}

/** `ne`: escucha en la ruta; `false` si otra sesión ya escucha ahí. */
export async function listenOn(server: Server, path: string): Promise<boolean> {
  if ((await isSocketLive(path)) === 'live') return false
  return new Promise((resolve, reject) => {
    const onError = (error: unknown) => {
      if (getErrnoCode(error) === 'EADDRINUSE') resolve(false)
      else reject(error)
    }
    server.once('error', onError)
    server.listen(path, () => {
      server.removeListener('error', onError)
      resolve(true)
    })
  })
}

/** `tn`: una ruta hermana única; si no cabe en `sun_path`, un nombre corto en el mismo directorio. */
export function movedAsidePath(path: string): string {
  const candidate = `${path.replace(/\.sock$/, '')}-${randomBytes(4).toString('hex')}.sock`
  if (Buffer.byteLength(candidate) <= MAX_SOCKET_PATH_BYTES) return candidate
  const dir = dirname(path)
  const room = MAX_SOCKET_PATH_BYTES - Buffer.byteLength(join(dir, '.sock'))
  return join(dir, `${randomBytes(8).toString('hex').slice(0, Math.max(1, room))}.sock`)
}

/** `sn`: retira las rutas apartadas de esta ruta que ya nadie escucha. */
export async function reapMovedAsideSockets(path: string): Promise<void> {
  const prefix = `${basename(path).replace(/\.sock$/, '')}-`
  let names: string[]
  try {
    names = await readdir(dirname(path))
  } catch {
    return
  }
  for (const name of names) {
    if (!name.startsWith(prefix) || !/^[0-9a-f]{8}\.sock$/.test(name.slice(prefix.length))) continue
    const sibling = join(dirname(path), name)
    if ((await isSocketLive(sibling)) === 'live') continue
    await unlink(sibling).catch(() => {})
  }
}

/**
 * `rn`: escucha en la ruta automática. Un socket muerto se retira; uno vivo
 * es de otra sesión (un espacio de pids hermano), y se escucha a su lado.
 */
export async function bindAutoSocket(server: Server, path: string): Promise<string> {
  await reapMovedAsideSockets(path)
  if (await listenOn(server, path)) return path
  if ((await isSocketLive(path)) !== 'live') {
    await unlink(path).catch(() => {})
    if (await listenOn(server, path)) return path
  }
  for (let attempt = 0; attempt < MOVED_ASIDE_ATTEMPTS; attempt++) {
    const aside = movedAsidePath(path)
    if (await listenOn(server, aside)) return aside
  }
  throw new Error('listen EADDRINUSE on the auto socket path and its moved-aside siblings')
}

/** `H`: el buzón deja de estar activo. */
export function clearActiveInbox(state: InboxState): void {
  state.activeSocketPath = undefined
}

/**
 * `B`: cierra los clientes y el servidor, espera a que termine el mensaje en
 * curso y borra el socket, que `close` no retira.
 */
export async function closeInbox(state: InboxState, server: Server, path: string): Promise<void> {
  for (const client of state.connectedClients) client.destroy()
  state.connectedClients.clear()
  server.close()
  await state.processingChain
  await unlink(path).catch(() => {})
  clearActiveInbox(state)
}
