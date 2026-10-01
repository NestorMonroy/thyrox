/**
 * El detector de plataforma de 2.1.283 (`chunk-fmsbxtrp.js`, clase `S`, su
 * único ejemplar `p()`): un objeto con fuentes inyectadas que lee
 * `/proc/version` UNA vez para `getPlatform` y `getWslVersion`, y que
 * `init()` ceba de forma asíncrona (`prime`) antes de que nadie pregunte.
 * El puerto anterior eran dos `memoize` con dos lecturas síncronas y sin
 * cebado: la misma respuesta en el caso normal, otro flujo.
 *
 * Banco: `.claude/workbench/platform-wsl-20260927T061837/` (S.js, p.js,
 * references-*.txt).
 *
 * Control de anulación, declarado caso por caso en el cuerpo.
 */
import { describe, expect, test } from 'bun:test'
import { PlatformDetector, type PlatformSources } from '../platform.ts'

function sourcesWith(overrides: Partial<PlatformSources> = {}): PlatformSources & { reads: { sync: number; async: number } } {
  const reads = { sync: 0, async: 0 }
  return {
    platform: 'linux',
    env: {},
    readProcVersionSync: () => {
      reads.sync++
      return 'linux version 6.8.0-45-generic'
    },
    readProcVersion: async () => {
      reads.async++
      return 'Linux version 6.8.0-45-generic'
    },
    osRelease: () => '6.8.0-45-generic',
    readOsRelease: async () => 'ID=ubuntu\nVERSION_ID="24.04"\n',
    ...overrides,
    reads,
  }
}

describe('PlatformDetector — el flujo de la fuente', () => {
  // Anulación: leer /proc/version en cada método en vez de guardarlo cae este caso.
  test('1. una sola lectura sirve a getPlatform y a getWslVersion', () => {
    const sources = sourcesWith()
    const detector = new PlatformDetector(sources)
    expect(detector.getPlatform()).toBe('linux')
    expect(detector.getWslVersion()).toBeUndefined()
    expect(sources.reads.sync).toBe(1)
  })

  // Anulación: un prime que no anula `platform` cae este caso.
  test('2. prime reemplaza la lectura síncrona y anula lo ya decidido', async () => {
    const sources = sourcesWith({ readProcVersion: async () => 'Linux version 5.15.153.1-microsoft-standard-WSL2' })
    const detector = new PlatformDetector(sources)
    expect(detector.getPlatform()).toBe('linux')
    await detector.prime()
    expect(detector.getPlatform()).toBe('wsl')
    expect(detector.getWslVersion()).toBe('2')
  })

  test('3. cebado antes de preguntar, no hay lectura síncrona', async () => {
    const sources = sourcesWith()
    const detector = new PlatformDetector(sources)
    await detector.prime()
    detector.getPlatform()
    expect(sources.reads).toEqual({ sync: 0, async: 1 })
  })

  test('4. fuera de Linux, prime no lee nada', async () => {
    const sources = sourcesWith({ platform: 'darwin', osRelease: () => '23.1.0' })
    const detector = new PlatformDetector(sources)
    await detector.prime()
    expect(sources.reads.async).toBe(0)
    expect(detector.getPlatform()).toBe('macos')
    expect(detector.getMacOSMajorVersion()).toBe(14)
  })

  test('5. si prime falla, queda la lectura síncrona', async () => {
    const sources = sourcesWith({
      readProcVersion: async () => {
        throw new Error('EACCES')
      },
    })
    const detector = new PlatformDetector(sources)
    await detector.prime()
    expect(detector.getPlatform()).toBe('linux')
    expect(sources.reads.sync).toBe(1)
  })

  test('6. las variables de WSL deciden sin leer /proc/version', () => {
    const sources = sourcesWith({ env: { WSL_INTEROP: '/run/WSL/1_interop' } })
    const detector = new PlatformDetector(sources)
    expect(detector.getPlatform()).toBe('wsl')
    expect(sources.reads.sync).toBe(0)
  })

  test('7. microsoft sin número es WSL1', () => {
    const detector = new PlatformDetector(
      sourcesWith({ readProcVersionSync: () => 'linux version 4.4.0-19041-microsoft' }),
    )
    expect(detector.getWslVersion()).toBe('1')
  })

  test('8. la distro sale de /etc/os-release, una vez', async () => {
    const detector = new PlatformDetector(sourcesWith())
    const first = detector.getLinuxDistroInfo()
    expect(detector.getLinuxDistroInfo()).toBe(first)
    expect(await first).toEqual({ linuxKernel: '6.8.0-45-generic', linuxDistroId: 'ubuntu', linuxDistroVersion: '24.04' })
  })
})
