/**
 * Los invariantes de `gemini/modelMapping.ts` y `gemini/sseParser.ts`
 * pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA — y donde NO aporta. Las
 * tres anulaciones se midieron una a una, y el resultado no es el que yo
 * esperaba:
 *
 * | Anulacion | conducta | aqui |
 * |---|---|---|
 * | invertir el orden de las dos sustituciones de fin de linea | **1 de 35** | 1 de 5 (caso 4) |
 * | quitar el guard `includes('\r')` | **0 de 35** | 1 de 5 (caso 5) |
 * | retirar el `unpackModelId` del mapeo | **0 de 15** | 1 de 5 (caso 1) |
 *
 * La primera fila corrige un sobre-claim mio: yo declare que la conducta era
 * ciega al orden, razonando que un doble salto de mas solo produce una trama
 * vacia que se descarta. Es cierto para la trama, y FALSO para el caso de
 * CRLF y LF mezclados: ahi el salto de mas parte la trama en dos y el campo
 * `event` se pierde. La suite portada si lo ve, y el caso 4 es redundante con
 * ella. Se conserva porque nombra el invariante, no porque sea el unico que
 * lo alcanza.
 *
 * Las otras dos filas son donde este instrumento si es lo unico: un guard de
 * rendimiento no tiene conducta observable, y el prefijo de conexion exigiria
 * un caso que la suite de la fuente no trae.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const mapeo = readFileSync(resolve(aqui, '..', 'src', 'gemini', 'modelMapping.ts'), 'utf-8')
const analizador = readFileSync(resolve(aqui, '..', 'src', 'gemini', 'sseParser.ts'), 'utf-8')

describe('invariantes escritos en gemini/modelMapping.ts', () => {
  test('1. el prefijo de conexion se retira ANTES del recorte y de la familia', () => {
    const cuerpo = mapeo.slice(mapeo.indexOf('export function resolveGeminiModel'))
    const posUnpack = cuerpo.indexOf('unpackModelId(anthropicModel)')
    const posRecorte = cuerpo.indexOf('.replace(/\\[1m\\]$/i')
    const posFamilia = cuerpo.indexOf('getModelFamily(cleanModel)')
    expect(posUnpack).toBeGreaterThan(-1)
    expect(posUnpack).toBeLessThan(posRecorte)
    expect(posRecorte).toBeLessThan(posFamilia)
  })

  test('2. el recorte del sufijo ignora la caja — a diferencia del de OpenAI', () => {
    expect(mapeo).toMatch(/\.replace\(\/\\\[1m\\\]\$\/i, ''\)/)
  })

  test('3. sin variable que resuelva la familia, LANZA: no hay mapa por defecto', () => {
    // Es la diferencia de fondo con el hermano de OpenAI, que cae a su tabla.
    expect(mapeo).toMatch(/throw new ConfigurationError\(/)
    expect(mapeo).not.toMatch(/DEFAULT_MODEL_MAP/)
  })
})

describe('invariantes escritos en gemini/sseParser.ts', () => {
  test('4. CRLF se sustituye ANTES que el CR suelto', () => {
    // Al reves, cada `\r\n` daria DOS saltos en vez de uno. Ninguna asercion
    // de conducta lo ve, porque un doble salto de mas solo produce una trama
    // vacia, que la propia funcion descarta.
    // Se ancla al inicio de la funcion, no al guard: si se anclara al guard,
    // quitarlo haria fallar tambien este caso y los dos dejarian de medir
    // cosas distintas. Medido: asi anclado, cada uno cae por su motivo.
    const norm = analizador.slice(analizador.indexOf('export function parseSSEFrames'))
    const posCrlf = norm.indexOf('/\\r\\n/g')
    const posCr = norm.indexOf('/\\r/g')
    expect(posCrlf).toBeGreaterThan(-1)
    expect(posCr).toBeGreaterThan(-1)
    expect(posCrlf).toBeLessThan(posCr)
  })

  test('5. solo se normaliza cuando el buffer trae algun CR', () => {
    expect(analizador).toMatch(/if \(buffer\.includes\('\\r'\)\) \{/)
  })
})
