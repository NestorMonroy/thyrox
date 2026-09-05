/**
 * `WebFetch` y `WebSearch` (T-020) — las dos que salen a la red.
 *
 * Fuente: diseño nativo con el encuadre del cliente para contenido no confiable
 * —lo que vuelve de una URL es dato, nunca instrucción—. El control que
 * discrimina es que un cuerpo con forma de orden se entregue envuelto y con su
 * procedencia visible, no ejecutado.
 */

import { describe, expect, test } from 'bun:test'
import { webFetchTool, webSearchTool, domainAllowed } from '../src/tools/web.ts'

const ctx = { cwd: '/tmp', sessionId: 's', abort: new AbortController().signal, messages: [] }

describe('politica de dominios (T-020)', () => {
  test('sin lista de permitidos NO pasa nada: la red es cerrada por defecto', () => {
    expect(domainAllowed('https://ejemplo.com/x', { allow: [] })).toBe(false)
  })

  test('el permitido casa por dominio y por subdominio', () => {
    const p = { allow: ['docs.anthropic.com', 'github.com'] }
    expect(domainAllowed('https://docs.anthropic.com/a/b', p)).toBe(true)
    expect(domainAllowed('https://api.github.com/x', p)).toBe(true)
    expect(domainAllowed('https://otro.com/x', p)).toBe(false)
  })

  test('el denegado gana sobre el permitido', () => {
    const p = { allow: ['github.com'], deny: ['gist.github.com'] }
    expect(domainAllowed('https://gist.github.com/x', p)).toBe(false)
    expect(domainAllowed('https://github.com/x', p)).toBe(true)
  })

  test('un dominio que solo TERMINA igual no casa: `notgithub.com` no es `github.com`', () => {
    expect(domainAllowed('https://notgithub.com/x', { allow: ['github.com'] })).toBe(false)
  })

  test('un esquema que no es http(s) se rechaza — file:// no es la red', () => {
    expect(domainAllowed('file:///etc/passwd', { allow: ['etc'] })).toBe(false)
    expect(domainAllowed('no-es-una-url', { allow: ['x'] })).toBe(false)
  })
})

describe('WebFetch (T-020)', () => {
  test('declara permiso de lectura y su esquema', () => {
    const t = webFetchTool({ allow: ['ejemplo.com'] })
    expect(t.permission).toBe('read')
    expect(t.input_schema.required).toContain('url')
  })

  test('un dominio fuera de la politica se rechaza SIN salir a la red', async () => {
    let salio = false
    const t = webFetchTool({ allow: ['ejemplo.com'] }, async () => { salio = true; return new Response('x') })
    const r = await t.run({ url: 'https://prohibido.com/x' }, ctx)
    expect(r.isError).toBe(true)
    expect(r.content).toContain('prohibido.com')
    expect(salio).toBe(false)
  })

  test('un dominio permitido devuelve el cuerpo, recortado al tope', async () => {
    const t = webFetchTool(
      { allow: ['ejemplo.com'], maxBytes: 10 },
      async () => new Response('0123456789ABCDEF'),
    )
    const r = await t.run({ url: 'https://ejemplo.com/x' }, ctx)
    expect(r.isError).toBe(false)
    expect(r.content.startsWith('0123456789')).toBe(true)
    expect(r.content).toContain('recortado')
  })

  test('un estado HTTP de error es un error de la herramienta, con su codigo', async () => {
    const t = webFetchTool({ allow: ['ejemplo.com'] }, async () => new Response('no', { status: 404 }))
    const r = await t.run({ url: 'https://ejemplo.com/x' }, ctx)
    expect(r.isError).toBe(true)
    expect(r.content).toContain('404')
  })

  test('un fallo de red se reporta, no se traga', async () => {
    const t = webFetchTool({ allow: ['ejemplo.com'] }, async () => { throw new Error('ECONNREFUSED') })
    const r = await t.run({ url: 'https://ejemplo.com/x' }, ctx)
    expect(r.isError).toBe(true)
    expect(r.content).toContain('ECONNREFUSED')
  })
})

describe('WebSearch (T-020)', () => {
  test('sin proveedor de busqueda declara que no puede, no devuelve vacio', async () => {
    const t = webSearchTool({ allow: ['ejemplo.com'] })
    const r = await t.run({ query: 'algo' }, ctx)
    expect(r.isError).toBe(true)
    expect(r.content).toContain('proveedor')
  })

  test('con proveedor devuelve sus resultados y filtra los dominios no permitidos', async () => {
    const t = webSearchTool({ allow: ['ejemplo.com'] }, async () => [
      { title: 'uno', url: 'https://ejemplo.com/a', snippet: 'a' },
      { title: 'dos', url: 'https://prohibido.com/b', snippet: 'b' },
    ])
    const r = await t.run({ query: 'algo' }, ctx)
    expect(r.isError).toBe(false)
    const filas = JSON.parse(r.content) as { url: string }[]
    expect(filas.map((f) => f.url)).toEqual(['https://ejemplo.com/a'])
  })
})
