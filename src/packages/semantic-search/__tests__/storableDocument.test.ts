/**
 * PostgreSQL no admite U+0000 en `TEXT` ni en `JSONB`. Un documento que lo
 * lleva se guarda con U+2400 en su lugar, y su hash se calcula sobre ese texto.
 */
import { describe, expect, test } from 'bun:test'

import { documentHash } from '../contentHash.ts'
import { NUL_REPLACEMENT, storableDocument } from '../corpus.ts'

const NUL = String.fromCharCode(0)
const document = {
  domain: 'finding', domainId: 'H-DOCS-191', sourceRef: 'docs:h.rst', sourceRevision: 'abc',
  metadata: { title: `separador${NUL}`, tags: [`a${NUL}b`] }, chunks: [`(.subject) + "${NUL}" + (.description)`, 'sin nada'],
}

describe('storableDocument', () => {
  test('cada U+0000 de los chunks y de la metadata pasa a U+2400', () => {
    const stored = storableDocument(document)
    expect(stored.chunks[0]).toBe(`(.subject) + "${NUL_REPLACEMENT}" + (.description)`)
    expect(stored.chunks[1]).toBe('sin nada')
    expect(stored.metadata).toEqual({ title: `separador${NUL_REPLACEMENT}`, tags: [`a${NUL_REPLACEMENT}b`] })
    expect(JSON.stringify(stored).includes('\\u0000')).toBe(false)
  })

  test('el texto literal «\\u0000» (seis caracteres) no se confunde con el carácter', () => {
    const literal = { ...document, metadata: {}, chunks: ['escribe \\u0000 en JSON'] }
    expect(storableDocument(literal).chunks).toEqual(['escribe \\u0000 en JSON'])
  })

  test('un documento sin U+0000 queda idéntico y con el mismo hash', () => {
    const clean = { ...document, metadata: { title: 't' }, chunks: ['uno', 'dos'] }
    expect(storableDocument(clean)).toEqual(clean)
    expect(documentHash(storableDocument(clean).chunks)).toBe(documentHash(clean.chunks))
  })
})
