/**
 * El parseo de un documento RST para el corpus (TASK-THYROX-0684): el bloque
 * `.. meta::` va a metadata y el cuerpo se parte en chunks por sección, sin
 * que ninguno pase del tope. Qué haría fallar a esta suite: perder texto al
 * partir, mezclar la metadata con el texto buscable, o producir un chunk vacío.
 */
import { describe, expect, test } from 'bun:test'

import { MAX_CHUNK_CHARACTERS, parseRstDocument } from '../rstDocument.ts'

const FINDING = `.. meta::
   :fecha_creacion: 2026-10-01T09:28:11
   :estado: documentado
   :submodulo: thyrox

.. _h-thyrox-306:

H-THYROX-306 — Una residencia sin camino
========================================

- **Severidad:** ALTA

Premisa verificada
------------------

La enmienda admite varios coordinadores.

Descripción
-----------

Un párrafo.

Otro párrafo.
`

describe('parseRstDocument', () => {
  test('el bloque meta va a metadata y no a los chunks', () => {
    const parsed = parseRstDocument(FINDING)
    expect(Object.entries(parsed.metadata)).toEqual([['fecha_creacion', '2026-10-01T09:28:11'], ['estado', 'documentado'], ['submodulo', 'thyrox']])
    expect(parsed.chunks.join('\n')).not.toContain(':fecha_creacion:')
  })

  test('un chunk por sección, cada uno con su título', () => {
    const { chunks } = parseRstDocument(FINDING)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toStartWith('H-THYROX-306 — Una residencia sin camino')
    expect(chunks[0]).toContain('**Severidad:** ALTA')
    expect(chunks[1]).toStartWith('Premisa verificada')
    expect(chunks[2]).toStartWith('Descripción')
    expect(chunks[2]).toContain('Otro párrafo.')
  })

  test('no pierde texto: todo párrafo del cuerpo está en algún chunk', () => {
    const { chunks } = parseRstDocument(FINDING)
    for (const fragment of ['La enmienda admite varios coordinadores.', 'Un párrafo.', 'Otro párrafo.', '.. _h-thyrox-306:']) {
      expect(chunks.some(chunk => chunk.includes(fragment))).toBe(true)
    }
  })

  test('una sección más larga que el tope se parte por párrafos, sin pasar el tope', () => {
    const paragraph = 'palabra '.repeat(100).trim()
    const long = `Título\n======\n\n${Array.from({ length: 12 }, () => paragraph).join('\n\n')}\n`
    const { chunks } = parseRstDocument(long)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every(chunk => chunk.length <= MAX_CHUNK_CHARACTERS)).toBe(true)
    expect(chunks.join(' ').split(paragraph).length - 1).toBe(12)
  })

  test('un párrafo solo más largo que el tope se parte por caracteres sin perder ninguno', () => {
    const huge = 'x'.repeat(MAX_CHUNK_CHARACTERS * 2 + 10)
    const { chunks } = parseRstDocument(`Título\n======\n\n${huge}\n`)
    expect(chunks.every(chunk => chunk.length <= MAX_CHUNK_CHARACTERS)).toBe(true)
    expect(chunks.join('').replace(/[^x]/g, '')).toHaveLength(huge.length)
  })

  test('un subrayado más corto que el título no es un encabezado', () => {
    const { chunks } = parseRstDocument('Texto largo de un párrafo\n---\n\nSigue.\n')
    expect(chunks).toEqual(['Texto largo de un párrafo\n---\n\nSigue.'])
  })

  test('sin texto no hay chunks', () => {
    expect(parseRstDocument('.. meta::\n   :estado: borrador\n').chunks).toEqual([])
  })
})
