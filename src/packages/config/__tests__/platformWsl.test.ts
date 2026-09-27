/**
 * `getPlatform` distingue WSL de Linux leyendo `/proc/version`, como la fuente
 * (`ccnmt: packages/config/platform.ts`). La rama no tenía prueba: el
 * sustituto de `@thyrox/storage` la colapsaba en `linux` y nada lo notaba.
 *
 * `/proc/version` se inyecta con `setFsImplementation` de `@thyrox/storage`,
 * por donde el original lo lee; no se toca el disco. Plataforma, sistema de
 * archivos y la memoización se restauran al terminar: son estado del módulo y
 * `bun test` corre todos los archivos en un proceso (H-THYROX-207).
 *
 * Control de anulación: sin la lectura de `/proc/version` en el original cae
 * el caso WSL y ningún otro.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { getFsImplementation, setFsImplementation } from '@thyrox/storage/fsOperations.js'
import { getPlatform } from '../platform.ts'

const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!
const realFs = getFsImplementation()
const WSL_VARIABLES = ['WSL_DISTRO_NAME', 'WSL_INTEROP'] as const
const realWslEnv = Object.fromEntries(WSL_VARIABLES.map(name => [name, process.env[name]]))

function onLinuxWith(procVersion: string, env: Partial<Record<(typeof WSL_VARIABLES)[number], string>> = {}): void {
  for (const name of WSL_VARIABLES) {
    if (env[name] === undefined) delete process.env[name]
    else process.env[name] = env[name]
  }
  Object.defineProperty(process, 'platform', { value: 'linux' })
  setFsImplementation({
    ...realFs,
    readFileSync: ((path: string, options?: unknown) =>
      path === '/proc/version' ? procVersion : (realFs.readFileSync as (p: string, o?: unknown) => string)(path, options)
    ) as typeof realFs.readFileSync,
  })
  getPlatform.cache.clear()
}

afterEach(() => {
  for (const name of WSL_VARIABLES) {
    if (realWslEnv[name] === undefined) delete process.env[name]
    else process.env[name] = realWslEnv[name]
  }
  Object.defineProperty(process, 'platform', realPlatform)
  setFsImplementation(realFs)
  getPlatform.cache.clear()
})

describe('getPlatform — WSL frente a Linux, como la fuente', () => {
  test('un kernel de Microsoft es wsl', () => {
    onLinuxWith('Linux version 5.15.153.1-microsoft-standard-WSL2 (root@1a2b) #1 SMP')
    expect(getPlatform()).toBe('wsl')
  })

  // 2.1.283 (`chunk-fmsbxtrp.js`, clase `S`, `getPlatform`): las variables que
  // WSL exporta deciden antes que `/proc/version`.
  test('WSL_DISTRO_NAME basta aunque /proc/version no lo diga', () => {
    onLinuxWith('Linux version 6.8.0-45-generic #45-Ubuntu SMP', { WSL_DISTRO_NAME: 'Ubuntu' })
    expect(getPlatform()).toBe('wsl')
  })

  test('WSL_INTEROP también', () => {
    onLinuxWith('Linux version 6.8.0-45-generic #45-Ubuntu SMP', { WSL_INTEROP: '/run/WSL/1_interop' })
    expect(getPlatform()).toBe('wsl')
  })

  test('un kernel Linux corriente es linux', () => {
    onLinuxWith('Linux version 6.8.0-45-generic (buildd@lcy02-amd64-075) #45-Ubuntu SMP')
    expect(getPlatform()).toBe('linux')
  })
})
