import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { openBrowser, openPath, setExecFileNoThrowForTests } from '../browser.js'

type ExecFileCall = { file: string; args: string[] }

let calls: ExecFileCall[] = []
let nextCode = 0

beforeEach(() => {
  setExecFileNoThrowForTests(async (file, args) => {
    calls.push({ file, args })
    return { code: nextCode }
  })
})

afterAll(() => {
  // Restaura el lanzador REAL — este setter es un singleton de módulo, no
  // acotado a este archivo; sin restaurar, otro consumidor de
  // openPath/openBrowser en el mismo proceso de `bun test` heredaria el
  // stub.
  setExecFileNoThrowForTests(null)
})

let originalPlatform: PropertyDescriptor | undefined
let originalBrowserEnv: string | undefined

function setPlatform(value: string): void {
  originalPlatform ??= Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { value, configurable: true })
}

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform)
  }
  if (originalBrowserEnv === undefined) delete process.env.BROWSER
  else process.env.BROWSER = originalBrowserEnv
  calls = []
  nextCode = 0
})

describe('openPath — dispatcha el comando segun plataforma', () => {
  test('en linux invoca xdg-open con el path', async () => {
    setPlatform('linux')
    const result = await openPath('/tmp/algo')
    expect(calls).toEqual([{ file: 'xdg-open', args: ['/tmp/algo'] }])
    expect(result).toBe(true)
  })

  test('en darwin invoca open', async () => {
    setPlatform('darwin')
    await openPath('/tmp/algo')
    expect(calls[0]?.file).toBe('open')
  })

  test('en win32 invoca explorer', async () => {
    setPlatform('win32')
    await openPath('C:\\algo')
    expect(calls[0]?.file).toBe('explorer')
  })

  test('si el comando falla (code != 0), devuelve false en vez de lanzar', async () => {
    setPlatform('linux')
    nextCode = 127
    expect(await openPath('/no/existe')).toBe(false)
  })
})

describe('openBrowser — validacion de URL', () => {
  test('una URL mal formada devuelve false SIN invocar ningun comando', async () => {
    setPlatform('linux')
    expect(await openBrowser('no-es-una-url')).toBe(false)
    expect(calls).toEqual([])
  })

  test('un protocolo distinto de http/https devuelve false SIN invocar comando', async () => {
    setPlatform('linux')
    expect(await openBrowser('ftp://ejemplo.com')).toBe(false)
    expect(calls).toEqual([])
  })

  test('una URL http valida SI invoca el comando de plataforma', async () => {
    setPlatform('linux')
    originalBrowserEnv = process.env.BROWSER
    delete process.env.BROWSER
    const result = await openBrowser('https://ejemplo.com')
    expect(calls).toEqual([{ file: 'xdg-open', args: ['https://ejemplo.com'] }])
    expect(result).toBe(true)
  })

  test('BROWSER env var, si esta definida, sustituye al comando por defecto (no-win32)', async () => {
    setPlatform('linux')
    originalBrowserEnv = process.env.BROWSER
    process.env.BROWSER = 'mi-navegador'
    await openBrowser('https://ejemplo.com')
    expect(calls[0]?.file).toBe('mi-navegador')
  })

  test('en win32 SIN BROWSER, usa rundll32 url,OpenURL', async () => {
    setPlatform('win32')
    originalBrowserEnv = process.env.BROWSER
    delete process.env.BROWSER
    await openBrowser('https://ejemplo.com')
    expect(calls).toEqual([
      { file: 'rundll32', args: ['url,OpenURL', 'https://ejemplo.com'] },
    ])
  })

  test('en win32 CON BROWSER, envuelve la URL entre comillas (necesario para shell)', async () => {
    setPlatform('win32')
    originalBrowserEnv = process.env.BROWSER
    process.env.BROWSER = 'mi-navegador'
    await openBrowser('https://ejemplo.com')
    expect(calls).toEqual([
      { file: 'mi-navegador', args: ['"https://ejemplo.com"'] },
    ])
  })
})
