/**
 * Porte de `ccnmt: packages/agent/__tests__/systemDirectories.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { getSystemDirectories } from '../misc/systemDirectories.js'
import { join } from 'path'

const HOME = '/users/test-home'

describe('getSystemDirectories — macOS', () => {
  test('uses standard $HOME-relative paths', () => {
    const dirs = getSystemDirectories({
      platform: 'macos',
      homedir: HOME,
      env: {},
    })
    expect(dirs.HOME).toBe(HOME)
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
    expect(dirs.DOCUMENTS).toBe(join(HOME, 'Documents'))
    expect(dirs.DOWNLOADS).toBe(join(HOME, 'Downloads'))
  })
  test('ignores USERPROFILE on macOS', () => {
    const dirs = getSystemDirectories({
      platform: 'macos',
      homedir: HOME,
      env: { USERPROFILE: '/foreign/profile' },
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
  })
  test('ignores XDG_DOWNLOAD_DIR on macOS', () => {
    const dirs = getSystemDirectories({
      platform: 'macos',
      homedir: HOME,
      env: { XDG_DOWNLOAD_DIR: '/some/xdg/download' },
    })
    expect(dirs.DOWNLOADS).toBe(join(HOME, 'Downloads'))
  })
})

describe('getSystemDirectories — Windows', () => {
  test('falls back to homedir when USERPROFILE is unset', () => {
    const dirs = getSystemDirectories({
      platform: 'windows',
      homedir: HOME,
      env: {},
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
  })
  test('uses USERPROFILE when set (handles localized folder names)', () => {
    const dirs = getSystemDirectories({
      platform: 'windows',
      homedir: HOME,
      env: { USERPROFILE: 'C:\\Users\\TestUser' },
    })
    expect(dirs.DESKTOP).toBe(join('C:\\Users\\TestUser', 'Desktop'))
    expect(dirs.DOCUMENTS).toBe(join('C:\\Users\\TestUser', 'Documents'))
    expect(dirs.DOWNLOADS).toBe(join('C:\\Users\\TestUser', 'Downloads'))
  })
  test('HOME stays at homedir even when USERPROFILE is set', () => {
    // Contrato: HOME es `homedir`, no `USERPROFILE`. La rama de Windows
    // separa esto deliberadamente (USERPROFILE gobierna las carpetas
    // conocidas, HOME sigue siendo "el home del usuario"). Si un futuro
    // refactor los intercambia por accidente, las herramientas basadas
    // en archivos que resuelven `~/foo` empezarian a escribir en
    // silencio bajo USERPROFILE en vez de HOME.
    const dirs = getSystemDirectories({
      platform: 'windows',
      homedir: HOME,
      env: { USERPROFILE: 'C:\\Users\\Other' },
    })
    expect(dirs.HOME).toBe(HOME)
  })
  test('Windows ignores XDG vars', () => {
    const dirs = getSystemDirectories({
      platform: 'windows',
      homedir: HOME,
      env: { XDG_DOCUMENTS_DIR: '/etc/docs' },
    })
    expect(dirs.DOCUMENTS).toBe(join(HOME, 'Documents'))
  })
})

describe('getSystemDirectories — Linux', () => {
  test('uses XDG vars when set', () => {
    const dirs = getSystemDirectories({
      platform: 'linux',
      homedir: HOME,
      env: {
        XDG_DESKTOP_DIR: '/custom/Desk',
        XDG_DOCUMENTS_DIR: '/custom/Docs',
        XDG_DOWNLOAD_DIR: '/custom/DL',
      },
    })
    expect(dirs.DESKTOP).toBe('/custom/Desk')
    expect(dirs.DOCUMENTS).toBe('/custom/Docs')
    expect(dirs.DOWNLOADS).toBe('/custom/DL')
  })
  test('falls back to defaults when XDG vars are unset', () => {
    const dirs = getSystemDirectories({
      platform: 'linux',
      homedir: HOME,
      env: {},
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
    expect(dirs.DOCUMENTS).toBe(join(HOME, 'Documents'))
    expect(dirs.DOWNLOADS).toBe(join(HOME, 'Downloads'))
  })
  test('falls back per-key when only some XDG vars are set', () => {
    const dirs = getSystemDirectories({
      platform: 'linux',
      homedir: HOME,
      env: { XDG_DOWNLOAD_DIR: '/custom/DL' },
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
    expect(dirs.DOCUMENTS).toBe(join(HOME, 'Documents'))
    expect(dirs.DOWNLOADS).toBe('/custom/DL')
  })
  test('XDG with empty string falls back to default (per `||` semantics)', () => {
    // Contrato: `env.XDG_DESKTOP_DIR || defaults.DESKTOP` — la cadena
    // vacia es falsy. Si un cambio futuro usara `??`, la cadena vacia
    // sobreescribiria el default, lo cual seria incorrecto (XDG deja
    // unset = vacio en algunos shells; esa no es la intencion del
    // usuario).
    const dirs = getSystemDirectories({
      platform: 'linux',
      homedir: HOME,
      env: { XDG_DESKTOP_DIR: '' },
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
  })
})

describe('getSystemDirectories — WSL', () => {
  test('uses Linux-compatible XDG behavior', () => {
    const dirs = getSystemDirectories({
      platform: 'wsl',
      homedir: HOME,
      env: { XDG_DOWNLOAD_DIR: '/wsl/dl' },
    })
    expect(dirs.DOWNLOADS).toBe('/wsl/dl')
  })
  test('falls back to defaults like Linux when XDG unset', () => {
    const dirs = getSystemDirectories({
      platform: 'wsl',
      homedir: HOME,
      env: {},
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
  })
})

describe('getSystemDirectories — unknown platform', () => {
  test('falls through to macOS defaults', () => {
    const dirs = getSystemDirectories({
      platform: 'unknown' as 'macos',
      homedir: HOME,
      env: {},
    })
    expect(dirs.DESKTOP).toBe(join(HOME, 'Desktop'))
    expect(dirs.DOCUMENTS).toBe(join(HOME, 'Documents'))
    expect(dirs.DOWNLOADS).toBe(join(HOME, 'Downloads'))
  })
})

describe('getSystemDirectories — return shape', () => {
  test('always exposes HOME, DESKTOP, DOCUMENTS, DOWNLOADS keys', () => {
    const dirs = getSystemDirectories({ platform: 'macos', homedir: HOME, env: {} })
    expect(dirs).toHaveProperty('HOME')
    expect(dirs).toHaveProperty('DESKTOP')
    expect(dirs).toHaveProperty('DOCUMENTS')
    expect(dirs).toHaveProperty('DOWNLOADS')
  })
})
