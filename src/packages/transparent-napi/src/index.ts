/**
 * transparent-napi: el socket IP_TRANSPARENT que necesita el modo de captura
 * TPROXY. El módulo `net` no puede hacer `setsockopt(IP_TRANSPARENT)` antes de
 * `bind()`, y sin eso el kernel descarta los paquetes redirigidos; el addon
 * crea el socket, lo pone a escuchar y devuelve su descriptor, que se adopta
 * con `server.listen({ fd })`. En cada conexión aceptada,
 * `socket.localAddress`/`localPort` son el destino ORIGINAL (TPROXY lo
 * conserva), sin `SO_ORIGINAL_DST` ni NAT.
 *
 * También da las dos primitivas contra el bucle: `setSocketMark` (SO_MARK en
 * un socket existente) y `connectMarked` (la marca se pone antes de `connect`,
 * así que el SYN ya la lleva y la regla de OUTPUT no lo vuelve a interceptar).
 * Las tres necesitan CAP_NET_ADMIN.
 *
 * La carga sigue el patrón de los demás paquetes nativos: `require` con la
 * ruta LITERAL de cada `.node`, para que el empaquetador de bun lo detecte y
 * lo incruste en el ejecutable. Un nombre compuesto o una variable lo ciegan.
 * Sólo se vendoriza Linux x64; en otra arquitectura el addon se compila en la
 * máquina (`native/build/Release`, donde lo deja node-gyp) o no está.
 *
 * Porte de `omniroute: src/mitm/tproxy/transparentSocket.ts` y
 * `src/mitm/tproxy/native/transparent.c` (MIT).
 */
import { platform, arch } from 'node:os'

export interface TransparentAddon {
  createTransparentListener(ip: string, port: number): number
  setSocketMark(fd: number, mark: number): void
  connectMarked(ip: string, port: number, mark: number): number
}

const VENDOR_X64_LINUX = '../vendor/x64-linux/transparent.node'
const LOCAL_BUILD = '../native/build/Release/transparent.node'

/** Los candidatos por arquitectura, en orden: el vendorizado y el compilado local. */
export const TRANSPARENT_ADDON_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  x64: [VENDOR_X64_LINUX, LOCAL_BUILD],
  arm64: [LOCAL_BUILD],
}

// Cada candidato con su `require` literal: es lo que el empaquetador ve.
function requireCandidate(candidate: string): unknown {
  switch (candidate) {
    case VENDOR_X64_LINUX:
      return require('../vendor/x64-linux/transparent.node')
    case LOCAL_BUILD:
      return require('../native/build/Release/transparent.node')
    default:
      throw new Error(`unknown transparent addon candidate: ${candidate}`)
  }
}

function isAddon(mod: unknown): mod is TransparentAddon {
  const candidate = mod as Partial<TransparentAddon> | null | undefined
  return (
    !!candidate &&
    typeof candidate.createTransparentListener === 'function' &&
    typeof candidate.setSocketMark === 'function' &&
    typeof candidate.connectMarked === 'function'
  )
}

/** El addon, o `null` fuera de Linux, sin `.node`, o con uno que no trae las tres funciones. */
export function loadTransparentAddon(
  req: (candidate: string) => unknown = requireCandidate,
  os: () => string = platform,
  cpu: () => string = arch,
): TransparentAddon | null {
  if (os() !== 'linux') return null
  for (const candidate of TRANSPARENT_ADDON_CANDIDATES[cpu()] ?? []) {
    try {
      const mod = req(candidate)
      if (isAddon(mod)) return mod
    } catch {
      // Este candidato no está; se prueba el siguiente.
    }
  }
  return null
}

const loaded: TransparentAddon | null = loadTransparentAddon()

function unavailable(what: string): Error {
  return new Error(
    `TPROXY transparent-socket addon is not available (${what}). It is Linux-only and must be vendored ` +
      'or built (bun src/packages/transparent-napi/bin/build.ts); CAP_NET_ADMIN is required at runtime.',
  )
}

export function isTransparentSocketAvailable(): boolean {
  return loaded !== null
}

export function createTransparentListenerFd(ip: string, port: number): number {
  if (!loaded) throw unavailable('createTransparentListener')
  return loaded.createTransparentListener(ip, port)
}

export function setSocketMark(fd: number, mark: number): void {
  if (!loaded) throw unavailable('setSocketMark')
  loaded.setSocketMark(fd, mark)
}

export function connectMarked(ip: string, port: number, mark: number): number {
  if (!loaded) throw unavailable('connectMarked')
  return loaded.connectMarked(ip, port, mark)
}
