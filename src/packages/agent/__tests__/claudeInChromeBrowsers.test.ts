/**
 * Navegadores, sockets y apertura de URL de Claude in Chrome (2.1.275,
 * `chunk-g0b24p3s.js`). Linux es la plataforma de este contenedor.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  BROWSER_DETECTION_ORDER,
  getAllBrowserDataPaths,
  getAllNativeMessagingHostsDirs,
  getAllSocketPaths,
  getAllWindowsRegistryKeys,
  getSecureSocketPath,
  getSocketDir,
} from '../claudeInChromeCommon.js'

describe('rutas de mensajería nativa (G8n)', () => {
  test('en Linux, bajo el home, en el orden de detección y sin Arc', () => {
    const dirs = getAllNativeMessagingHostsDirs()
    expect(dirs[0]).toEqual({ browser: 'chrome', path: join(homedir(), '.config', 'google-chrome', 'NativeMessagingHosts') })
    expect(dirs.map(d => d.browser)).toEqual(BROWSER_DETECTION_ORDER.filter(b => b !== 'arc'))
  })
  test('el directorio de datos es el padre de NativeMessagingHosts', () => {
    const data = getAllBrowserDataPaths()
    expect(data).toEqual(getAllNativeMessagingHostsDirs().map(d => ({ browser: d.browser, path: dirname(d.path) })))
  })
})

describe('claves de registro (q8n)', () => {
  test('una por navegador, en HKCU', () => {
    const keys = getAllWindowsRegistryKeys()
    expect(keys).toHaveLength(7)
    expect(keys.every(k => k.key.startsWith('HKCU\\Software\\'))).toBe(true)
  })
})

describe('sockets del puente (kmt, Amt, Y8n)', () => {
  test('un socket por proceso dentro del directorio del usuario', () => {
    expect(getSocketDir()).toMatch(/^\/tmp\/claude-mcp-browser-bridge-.+$/)
    expect(getSecureSocketPath()).toBe(join(getSocketDir(), `${process.pid}.sock`))
  })
  test('sin directorio de sockets, no hay ninguno', async () => {
    expect(Array.isArray(await getAllSocketPaths())).toBe(true)
  })
})

describe('openInChrome (wie)', () => {
  // Un `google-chrome` falso en el PATH, que deja constancia de cada URL: sin
  // él no hay navegador que detectar y todo daría false por otra razón.
  // `Bun.which` lee el PATH del arranque, así que la llamada va en un proceso
  // hijo con el PATH ya puesto.
  let bin: string
  let calls: string
  beforeAll(() => {
    bin = mkdtempSync(join(tmpdir(), 'fake-chrome-'))
    calls = join(bin, 'calls.txt')
    writeFileSync(join(bin, 'google-chrome'), `#!/bin/sh\necho "$1" >> "${calls}"\n`)
    chmodSync(join(bin, 'google-chrome'), 0o755)
  })
  afterAll(() => rmSync(bin, { recursive: true, force: true }))

  function openInChild(url: string): boolean {
    const module = join(import.meta.dir, '..', 'claudeInChromeCommon.ts')
    const result = Bun.spawnSync(
      [process.execPath, '-e', `const m = await import(${JSON.stringify(module)}); console.log(await m.openInChrome(${JSON.stringify(url)}))`],
      { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } },
    )
    return result.stdout.toString().trim().split('\n').at(-1) === 'true'
  }

  test('abre una URL https en el navegador detectado', () => {
    expect(openInChild('https://example.com')).toBe(true)
    expect(readFileSync(calls, 'utf8')).toContain('https://example.com')
  })
  test('rechaza lo que no es http(s) sin lanzar nada', () => {
    rmSync(calls, { force: true })
    expect(openInChild('file:///etc/passwd')).toBe(false)
    expect(openInChild('javascript:alert(1)')).toBe(false)
    expect(existsSync(calls)).toBe(false)
  })
})
