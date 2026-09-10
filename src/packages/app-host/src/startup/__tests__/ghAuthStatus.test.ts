import { afterEach, describe, expect, test } from 'bun:test'
import { getGhAuthStatus } from '../ghAuthStatus.js'

// Bun.which y Bun.spawn son globales del runtime; se sustituyen por la
// duración de cada test y se restauran en afterEach — evita el subprocess
// real de `gh` (que puede no estar instalado ni autenticado en CI).
const originalWhich = Bun.which
const originalSpawn = Bun.spawn

afterEach(() => {
  Bun.which = originalWhich
  Bun.spawn = originalSpawn
})

describe('getGhAuthStatus — gh no instalado', () => {
  test('Bun.which no encuentra gh → not_installed, sin invocar spawn', async () => {
    let spawnLlamado = false
    // @ts-expect-error — sólo se necesita la forma que which() usa aquí
    Bun.which = () => null
    // @ts-expect-error — no debería llamarse en esta rama
    Bun.spawn = () => {
      spawnLlamado = true
      throw new Error('no debería spawnearse sin gh instalado')
    }
    const estado = await getGhAuthStatus()
    expect(estado).toBe('not_installed')
    expect(spawnLlamado).toBe(false)
  })
})

describe('getGhAuthStatus — gh instalado', () => {
  test('exit code 0 de `gh auth token` → authenticated', async () => {
    // @ts-expect-error — stub mínimo
    Bun.which = () => '/usr/bin/gh'
    // @ts-expect-error — stub mínimo del subprocess
    Bun.spawn = (cmd: string[]) => {
      expect(cmd).toEqual(['gh', 'auth', 'token'])
      return { exited: Promise.resolve(0) }
    }
    const estado = await getGhAuthStatus()
    expect(estado).toBe('authenticated')
  })

  test('exit code distinto de 0 → not_authenticated', async () => {
    // @ts-expect-error — stub mínimo
    Bun.which = () => '/usr/bin/gh'
    // @ts-expect-error — stub mínimo del subprocess
    Bun.spawn = () => ({ exited: Promise.resolve(1) })
    const estado = await getGhAuthStatus()
    expect(estado).toBe('not_authenticated')
  })
})
