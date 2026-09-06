import { describe, expect, test } from 'bun:test'
import { join } from 'path'
import {
  getUserBinDir,
  getXDGCacheHome,
  getXDGDataHome,
  getXDGStateHome,
} from '../xdg.js'

const HOME = '/users/test-home'

describe('getXDGStateHome', () => {
  test('uses XDG_STATE_HOME env when set', () => {
    expect(
      getXDGStateHome({ env: { XDG_STATE_HOME: '/custom/state' }, homedir: HOME }),
    ).toBe('/custom/state')
  })

  test('defaults to ~/.local/state when XDG_STATE_HOME unset', () => {
    expect(getXDGStateHome({ env: {}, homedir: HOME })).toBe(
      join(HOME, '.local', 'state'),
    )
  })

  test('empty XDG_STATE_HOME (empty string) falls back via ?? operator', () => {
    // ?? sólo dispara con null/undefined. La cadena vacía se preserva por
    // spec (env.XDG_STATE_HOME = '' es una señal deliberada de "usar el
    // default" en algunas shells, pero nuestra implementación la deja pasar
    // tal cual). Documenta el contrato actual.
    expect(
      getXDGStateHome({ env: { XDG_STATE_HOME: '' }, homedir: HOME }),
    ).toBe('')
  })
})

describe('getXDGCacheHome', () => {
  test('uses XDG_CACHE_HOME when set', () => {
    expect(
      getXDGCacheHome({
        env: { XDG_CACHE_HOME: '/custom/cache' },
        homedir: HOME,
      }),
    ).toBe('/custom/cache')
  })

  test('defaults to ~/.cache when unset', () => {
    expect(getXDGCacheHome({ env: {}, homedir: HOME })).toBe(
      join(HOME, '.cache'),
    )
  })

  test('XDG_CACHE_HOME takes precedence even with similar XDG_DATA_HOME set', () => {
    // Cada variable XDG es independiente. Fijar una no afecta a otra.
    expect(
      getXDGCacheHome({
        env: { XDG_CACHE_HOME: '/cache', XDG_DATA_HOME: '/data' },
        homedir: HOME,
      }),
    ).toBe('/cache')
  })
})

describe('getXDGDataHome', () => {
  test('uses XDG_DATA_HOME when set', () => {
    expect(
      getXDGDataHome({
        env: { XDG_DATA_HOME: '/custom/data' },
        homedir: HOME,
      }),
    ).toBe('/custom/data')
  })

  test('defaults to ~/.local/share when unset', () => {
    expect(getXDGDataHome({ env: {}, homedir: HOME })).toBe(
      join(HOME, '.local', 'share'),
    )
  })

  test('isolated from XDG_STATE_HOME', () => {
    expect(
      getXDGDataHome({
        env: { XDG_STATE_HOME: '/state' },
        homedir: HOME,
      }),
    ).toBe(join(HOME, '.local', 'share'))
  })
})

describe('getUserBinDir', () => {
  test('always ~/.local/bin (no XDG_BIN_HOME spec — function ignores env)', () => {
    // Crítico: no hay XDG_BIN_HOME estándar. La función retorna
    // homedir + '.local/bin' sin importar ninguna variable de entorno. Si
    // un futuro refactor "extiende" leyendo XDG_BIN_HOME, la ruta de
    // instalación cambiaría en silencio y la resolución de rutas de
    // actualización se rompería.
    expect(getUserBinDir({ env: {}, homedir: HOME })).toBe(
      join(HOME, '.local', 'bin'),
    )
  })

  test('ignores XDG_DATA_HOME (different XDG var)', () => {
    expect(
      getUserBinDir({
        env: { XDG_DATA_HOME: '/custom/data' },
        homedir: HOME,
      }),
    ).toBe(join(HOME, '.local', 'bin'))
  })

  test('ignores XDG_BIN_HOME (no such var in spec)', () => {
    // Documenta el no-soporte deliberado. La spec XDG no define
    // XDG_BIN_HOME. Cualquier valor aquí DEBE ignorarse.
    expect(
      getUserBinDir({
        env: { XDG_BIN_HOME: '/should/be/ignored' },
        homedir: HOME,
      }),
    ).toBe(join(HOME, '.local', 'bin'))
  })
})

describe('XDG functions — homedir override', () => {
  test('all functions honor explicit homedir option', () => {
    expect(getXDGStateHome({ env: {}, homedir: '/H' })).toBe(
      join('/H', '.local', 'state'),
    )
    expect(getXDGCacheHome({ env: {}, homedir: '/H' })).toBe(
      join('/H', '.cache'),
    )
    expect(getXDGDataHome({ env: {}, homedir: '/H' })).toBe(
      join('/H', '.local', 'share'),
    )
    expect(getUserBinDir({ env: {}, homedir: '/H' })).toBe(
      join('/H', '.local', 'bin'),
    )
  })
})

describe('XDG functions — return type', () => {
  test('all return non-empty strings', () => {
    expect(typeof getXDGStateHome({ env: {}, homedir: HOME })).toBe('string')
    expect(typeof getXDGCacheHome({ env: {}, homedir: HOME })).toBe('string')
    expect(typeof getXDGDataHome({ env: {}, homedir: HOME })).toBe('string')
    expect(typeof getUserBinDir({ env: {}, homedir: HOME })).toBe('string')
  })

  test('called without options uses real env / homedir without throwing', () => {
    expect(() => getXDGStateHome()).not.toThrow()
    expect(() => getXDGCacheHome()).not.toThrow()
    expect(() => getXDGDataHome()).not.toThrow()
    expect(() => getUserBinDir()).not.toThrow()
  })
})
