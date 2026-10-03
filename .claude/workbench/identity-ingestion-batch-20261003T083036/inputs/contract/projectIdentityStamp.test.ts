/**
 * La ingesta normaliza la identidad del proyecto en la metadata y deja intacta
 * la evidencia: el texto, el id de dominio, la procedencia y el hash de versión.
 */
import { describe, expect, test } from 'bun:test'

import { documentHash } from '../contentHash.ts'
import type { DocumentInput } from '../corpus.ts'
import { stampProjectIdentity } from '../projectIdentityStamp.ts'

function finding(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    domain: 'finding',
    domainId: 'H-THYROX-431',
    sourceRef: 'kaupamex-docs:source/gestion/pm/thyrox/hallazgos/hallazgo-H-THYROX-431.rst',
    sourceRevision: 'abc123',
    metadata: { severity: 'ALTA' },
    chunks: ['thyrox-ollama failed after the VM restart', 'the model store lives in .thyrox/models/'],
    ...overrides,
  }
}

describe('stampProjectIdentity', () => {
  test('añade la identidad canónica y el nombre observado a la metadata', () => {
    expect(stampProjectIdentity(finding()).metadata).toEqual({
      severity: 'ALTA',
      ecosystem: 'kaupamex',
      canonical_project: 'kaupamex-ai',
      legacy_projects: ['thyrox'],
      observed_project: 'thyrox',
    })
  })

  test('no reescribe el texto, el id de dominio ni la procedencia', () => {
    const original = finding()
    const stamped = stampProjectIdentity(original)
    expect(stamped.chunks).toEqual(original.chunks)
    expect(stamped.domainId).toBe('H-THYROX-431')
    expect(stamped.sourceRef).toBe(original.sourceRef)
    expect(stamped.sourceRevision).toBe(original.sourceRevision)
  })

  test('no cambia el hash de versión', () => {
    const original = finding()
    expect(documentHash(stampProjectIdentity(original).chunks)).toBe(documentHash(original.chunks))
  })

  test('toma el nombre observado del id de dominio antes que del texto', () => {
    const stamped = stampProjectIdentity(finding({ chunks: ['kaupamex-ai now owns the corpus'] }))
    expect(stamped.metadata.observed_project).toBe('thyrox')
  })

  test('deja el nombre observado en null cuando la fuente no nombra ningún proyecto', () => {
    const stamped = stampProjectIdentity(finding({ domainId: 'ERR-012', chunks: ['postgres is down'] }))
    expect(stamped.metadata.observed_project).toBeNull()
  })

  test('no muta la entrada', () => {
    const original = finding()
    stampProjectIdentity(original)
    expect(original.metadata).toEqual({ severity: 'ALTA' })
  })
})
