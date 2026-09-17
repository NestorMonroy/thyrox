/**
 * Tests del extractor de declaraciones ANCLADAS POR LITERAL.
 *
 * Por que existe, y por que el ancla no puede ser el nombre del simbolo:
 * el payload esta minificado y sus bindings se renombran entre builds. La
 * tabla de ventanas de limite de uso se llama `E0e` en 2.1.266 y `x0` en
 * 2.1.274 — el mismo mecanismo, otro nombre. Un extractor que reciba el
 * identificador mide el significante y concluye sobre el significado: sobre
 * 2.1.274 devolveria cero y ese cero se leeria como «el mecanismo ya no
 * esta». Lo que SI sobrevive a la reconstruccion son los literales de
 * cadena y de numero, porque son datos y no nombres.
 *
 * La guarda que carga el peso: un literal cuenta como sitio cuando es el
 * TEXTO COMPLETO de un nodo de cadena, de un nombre de propiedad o de un
 * identificador — nunca cuando es una subcadena de un literal mas grande.
 * El control positivo NO esta fabricado: en `chunk-ayyj05ne.js` de 2.1.274
 * `used_percentage` sale 14 veces, y las primeras son prosa dentro del
 * texto de ayuda de la linea de estado. Una busqueda por texto las trae; el
 * extractor tiene que dejarlas fuera.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractByLiteral, findLiteralSites, parsesClean } from '../src/declaration.ts'

const CORPUS = join(import.meta.dir, '../../../../_references/claude-code-bin/2.1.274/bunfs-root')
const RATE_LIMIT_CHUNK = join(CORPUS, 'chunk-ayyj05ne.js')
const hayCorpus = existsSync(RATE_LIMIT_CHUNK)

describe('sitios de literal — la guarda de texto completo', () => {
  test('un literal de cadena cuenta', () => {
    const sitios = findLiteralSites('var a=["five_hour","5h"];', 'five_hour')
    expect(sitios.length).toBe(1)
  })

  test('la SUBCADENA de un literal mayor NO cuenta', () => {
    // La forma real del defecto: la prosa de ayuda menciona el nombre del
    // campo dentro de un literal enorme.
    const doc = 'var d="...\\"used_percentage\\": number | null, // Pre-calculated...";'
    expect(findLiteralSites(doc, 'used_percentage').length).toBe(0)
  })

  test('un nombre de propiedad cuenta', () => {
    const sitios = findLiteralSites('var o={used_percentage:1};', 'used_percentage')
    expect(sitios.length).toBe(1)
  })

  test('un literal numerico cuenta por su texto', () => {
    expect(findLiteralSites('var h=n+31536000;', '31536000').length).toBe(1)
  })

  test('un comentario NO cuenta', () => {
    expect(findLiteralSites('// used_percentage aqui\nvar a=1;', 'used_percentage').length).toBe(0)
  })
})

describe('extraccion de la declaracion que contiene el literal', () => {
  test('sube de la cadena a la declaracion de variable entera', () => {
    const src = 'var z=1;var x0=[["five_hour","5h"],["seven_day","7d"]];var y=2;'
    const [d] = extractByLiteral(src, 'five_hour')
    expect(d.text).toBe('var x0=[["five_hour","5h"],["seven_day","7d"]];')
    expect(d.binding).toBe('x0')
  })

  test('sube de la cadena a la funcion entera', () => {
    const src = 'function f(e){return e.get("anthropic-ratelimit-unified-5h-utilization")}'
    const [d] = extractByLiteral(src, 'anthropic-ratelimit-unified-5h-utilization')
    expect(d.text).toBe(src)
    expect(d.binding).toBe('f')
    expect(d.kind).toBe('FunctionDeclaration')
  })

  test('lo extraido parsea solo', () => {
    const src = 'var a=1;function g(){return 31536000}'
    const [d] = extractByLiteral(src, '31536000')
    expect(parsesClean(d.text)).toBe(true)
  })

  test('un literal ausente devuelve la lista vacia, no una excepcion', () => {
    expect(extractByLiteral('var a=1;', 'no-existe-en-ningun-sitio')).toEqual([])
  })
})

describe.if(hayCorpus)('contra el corpus REAL de 2.1.274', () => {
  const src = readFileSync(RATE_LIMIT_CHUNK, 'utf8')

  test('la tabla de ventanas se recupera sin conocer su binding', () => {
    const [d] = extractByLiteral(src, 'seven_day_overage_included')
        .filter((x) => x.text.includes('"five_hour","5h"'))
    expect(d).toBeDefined()
    expect(d.text).toContain('["overage","overage"]')
    // Las cuatro ventanas, y el binding que 2.1.266 llamaba `E0e`.
    expect(d.text.match(/\["[a-z_]+","[a-z0-9_]+"\]/g)?.length).toBe(4)
  })

  test('la guarda deja fuera la prosa de ayuda de la linea de estado', () => {
    // Por texto el literal sale mas veces de las que es un dato: la ayuda de
    // la linea de estado lo DOCUMENTA dentro de un literal enorme.
    const porTexto = src.split('used_percentage').length - 1
    const sitios = findLiteralSites(src, 'used_percentage')
    expect(porTexto).toBeGreaterThan(sitios.length)
    expect(sitios.length).toBeGreaterThan(0)
    // Y el discriminador, que es lo que distingue este control de un verde
    // cualquiera: TODO sitio es el literal mismo, no un nodo que lo contiene.
    // Con la guarda anulada el nodo de la ayuda entra, y mide miles de bytes.
    const mayor = Math.max(...sitios.map((s) => s.end - s.start))
    expect(mayor).toBeLessThanOrEqual('used_percentage'.length + 2)
  })

  test('toda declaracion extraida parsea sola', () => {
    const ds = extractByLiteral(src, 'seven_day_overage_included')
    expect(ds.length).toBeGreaterThan(0)
    expect(ds.every((d) => parsesClean(d.text))).toBe(true)
  })

  test('el prefijo de cabecera se recupera aunque viva en una plantilla', () => {
    // `szo` compone el nombre de cabecera por interpolacion:
    //   e.get(`anthropic-ratelimit-unified-${s}-utilization`)
    // El prefijo es el TemplateHead. Es el ancla que una sesion futura
    // alcanzaria primero, y sin el la funcion que lee las tres cabeceras no
    // se puede recuperar por ningun literal suyo.
    const ds = extractByLiteral(src, 'anthropic-ratelimit-unified-')
    expect(ds.length).toBeGreaterThan(0)
    expect(ds.some((d) => d.text.includes('-surpassed-threshold'))).toBe(true)
  })

})
