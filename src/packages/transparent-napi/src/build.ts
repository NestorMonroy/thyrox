/**
 * Compila el addon `transparent.node` para la plataforma donde corre:
 * `cc -shared -fPIC` de `native/transparent.c` contra los encabezados de N-API,
 * a `vendor/<arch>-linux/transparent.node`, que es lo que el paquete carga.
 *
 * Sólo en Linux (IP_TRANSPARENT es de Linux). Que falte el compilador o los
 * encabezados no es fatal: devuelve `built: false` con la causa, y el modo de
 * captura TPROXY queda desactivado.
 *
 * Porte de `omniroute: scripts/build/build-tproxy-native.mjs` (MIT). La
 * referencia usa `node-gyp rebuild`, que descarga los encabezados de la red;
 * aquí se usan los que ya trae una instalación de node, o los que declare
 * `THYROX_NODE_API_HEADERS`. Los argumentos son una lista fija: ningún valor
 * externo se interpola en una cadena de shell.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

export interface BuildTransparentDeps {
  platform?: string
  arch?: string
  /** El directorio con `node_api.h`; `null` cuando no se encontró. */
  headersDir?: string | null
  run?: (cmd: string, args: string[]) => void
  exists?: (p: string) => boolean
}

export interface BuildTransparentResult {
  built: boolean
  output?: string
  reason?: string
}

export interface HeaderSearch {
  exists?: (p: string) => boolean
  /** Rutas a ejecutables de node cuyos encabezados viven en `../include/node`. */
  nodeBinaries?: string[]
}

function knownNodeBinaries(): string[] {
  const found: string[] = []
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (dir) found.push(path.join(dir, 'node'))
  }
  return found
}

/** El directorio de `node_api.h`: el declarado, o el de un node conocido. */
export function resolveNodeApiHeaders(search: HeaderSearch = {}): string | null {
  const exists = search.exists ?? existsSync
  const declared = process.env.THYROX_NODE_API_HEADERS?.trim()
  if (declared && exists(path.join(declared, 'node_api.h'))) return declared
  for (const binary of search.nodeBinaries ?? knownNodeBinaries()) {
    const dir = path.join(path.dirname(path.dirname(binary)), 'include', 'node')
    if (exists(path.join(dir, 'node_api.h'))) return dir
  }
  return null
}

function defaultRun(cmd: string, args: string[]): void {
  execFileSync(cmd, args, { stdio: 'pipe', env: process.env })
}

export function buildTransparentNative(packageRoot: string, deps: BuildTransparentDeps = {}): BuildTransparentResult {
  const platform = deps.platform ?? process.platform
  const arch = deps.arch ?? process.arch
  const exists = deps.exists ?? existsSync
  const run = deps.run ?? defaultRun

  if (platform !== 'linux') return { built: false, reason: 'non-linux host (IP_TRANSPARENT is Linux-only)' }
  const source = path.join(packageRoot, 'native', 'transparent.c')
  if (!exists(source)) return { built: false, reason: 'native source absent (transparent.c not found)' }
  const headersDir = deps.headersDir === undefined ? resolveNodeApiHeaders({ exists }) : deps.headersDir
  if (!headersDir) return { built: false, reason: 'N-API headers not found (node_api.h); set THYROX_NODE_API_HEADERS' }

  const output = path.join(packageRoot, 'vendor', `${arch}-linux`, 'transparent.node')
  try {
    run('cc', ['-shared', '-fPIC', '-O2', '-Wall', `-I${headersDir}`, source, '-o', output])
  } catch (err) {
    return { built: false, reason: `toolchain/build failed: ${err instanceof Error ? err.message : String(err)}` }
  }
  if (!exists(output)) return { built: false, reason: 'the compiler produced no transparent.node' }
  return { built: true, output }
}
