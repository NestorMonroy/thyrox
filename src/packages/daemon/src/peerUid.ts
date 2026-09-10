/**
 * Búsqueda de peer-uid para sockets de dominio Unix. `ant 5163.js`
 * TF3/AF3/zF3 — resuelve el uid efectivo del proceso conectante vía
 * getsockopt SO_PEERCRED (Linux) o LOCAL_PEERCRED (macOS), para que el
 * daemon pueda rechazar conexiones al socket de control desde un uid
 * distinto (el error de usar sudo, filesystems compartidos entre hosts,
 * etc.).
 *
 * Devuelve:
 *   - null cuando la plataforma no soporta la búsqueda de uid o cuando la
 *     búsqueda falla (best-effort — se acepta la conexión si no se puede
 *     verificar, igual que ant). El llamador trata null como "no
 *     verificable, aceptar".
 *   - un número cuando el uid del peer se resolvió con éxito.
 *
 * Windows no está soportado (los named pipes tienen un modelo de ACL
 * distinto; ant también devuelve null).
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/peerUid.ts`.
 */

import type { Socket } from 'node:net'
import { dlopen, FFIType, ptr } from 'bun:ffi'

import { logEvent } from './internal/pendingCrossPackageDeps.js'

/**
 * Obtiene el uid del peer conectante para un socket de dominio Unix.
 * Devuelve null ante cualquier fallo. Los errores se registran pero no se
 * propagan — verificar al peer es best-effort.
 */
export function getPeerUid(socket: Socket): number | null {
  if (process.platform === 'win32') return null
  // socket._handle.fd es el file descriptor subyacente. La API pública de
  // Node no lo expone; se accede igual que ant.
  const handle = (socket as unknown as { _handle?: { fd?: number } })._handle
  const fd = typeof handle?.fd === 'number' ? handle.fd : -1
  if (fd < 0) return null
  try {
    if (process.platform === 'darwin') return getPeerUidMacOS(fd)
    return getPeerUidLinux(fd)
  } catch (e) {
    logEvent('tengu_daemon_peer_uid_lookup_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      msg: (e as Error).message.slice(0, 80),
    })
    return null
  }
}

/**
 * SO_PEERCRED de Linux. Devuelve la estructura sockaddr ucred { pid; uid;
 * gid }. uid está en el offset de byte 4. Optionlevel SOL_SOCKET=1,
 * optname SO_PEERCRED=17.
 */
function getPeerUidLinux(fd: number): number | null {
  const ffi = loadGetsockopt()
  if (!ffi) return null
  const buf = new Uint8Array(12) // sizeof(struct ucred)
  const len = new Uint32Array([12])
  const r = ffi.getsockopt(fd, 1, 17, buf, len)
  if (r !== 0) return null
  return new DataView(buf.buffer).getUint32(4, true)
}

/**
 * LOCAL_PEERCRED de macOS. Devuelve la estructura xucred; uid está en el
 * offset de byte 4. Option level 0 (SOL_LOCAL) en macOS, optname
 * LOCAL_PEERCRED=1.
 */
function getPeerUidMacOS(fd: number): number | null {
  const ffi = loadGetsockopt()
  if (!ffi) return null
  const buf = new Uint8Array(76) // sizeof(struct xucred) — sobre-asignado
  const len = new Uint32Array([76])
  // SOL_LOCAL = 0, LOCAL_PEERCRED = 0x001 en macOS
  const r = ffi.getsockopt(fd, 0, 1, buf, len)
  if (r !== 0) return null
  return new DataView(buf.buffer).getUint32(4, true)
}

interface GetsockoptFFI {
  getsockopt: (
    fd: number,
    level: number,
    optname: number,
    buf: Uint8Array,
    len: Uint32Array,
  ) => number
}

let cachedFFI: GetsockoptFFI | null | undefined

/**
 * `bun:ffi` resuelve siempre bajo Bun (es un módulo interno, no un paquete
 * npm) — verificado con `Bun.resolveSync('bun:ffi', cwd)`. La fuente lo
 * cargaba con `require()` diferido dentro de un `try`; aquí el `import`
 * queda estático arriba (regla de imports perezosos) y sólo el `dlopen`,
 * que sí puede fallar en tiempo de ejecución si `libc`/`libSystem` no
 * aparece, se envuelve en el `try/catch` de esta función.
 */
function loadGetsockopt(): GetsockoptFFI | null {
  if (cachedFFI !== undefined) return cachedFFI
  try {
    const libname = process.platform === 'darwin' ? 'libSystem.dylib' : 'libc.so.6'
    const lib = dlopen(libname, {
      getsockopt: {
        args: [
          FFIType.i32,
          FFIType.i32,
          FFIType.i32,
          FFIType.ptr,
          FFIType.ptr,
        ],
        returns: FFIType.i32,
      },
    })
    cachedFFI = {
      getsockopt: (fd, level, optname, buf, len) =>
        lib.symbols.getsockopt(fd, level, optname, ptr(buf), ptr(len)) as number,
    }
    return cachedFFI
  } catch {
    cachedFFI = null
    return null
  }
}

/**
 * Verifica si el uid del peer conectante coincide con el uid del daemon.
 * Devuelve null si se permite el acceso (el peer coincide O no se puede
 * verificar); devuelve un string de mensaje de error si el acceso debe
 * rechazarse. Conducta exacta de `ant 5163.js` RFK.
 */
export function checkPeerUid(socket: Socket): string | null {
  const myUid = process.getuid?.()
  if (myUid == null) return null
  const peerUid = getPeerUid(socket)
  if (peerUid == null) return null
  if (peerUid === myUid) return null
  return `permission denied: connecting uid ${peerUid} != daemon uid ${myUid} (retry without sudo, or as the daemon owner)`
}
