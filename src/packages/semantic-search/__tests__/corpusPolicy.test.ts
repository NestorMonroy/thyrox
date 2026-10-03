/**
 * La política de ingesta del corpus (ADR-THYROX-008, D5): sólo un origen
 * declarado entra, lo efímero nunca entra sin promoción explícita y lo privado
 * lleva siempre a su dueño. No toca PostgreSQL: la decisión se toma antes de
 * abrir la transacción.
 */
import { describe, expect, test } from 'bun:test'

import { admitDocument, INITIAL_CORPUS_POLICY, type CorpusPolicy } from '../corpusPolicy.ts'
import { EphemeralContentError, InvalidCorpusInputError, UndeclaredCorpusDomainError } from '../errors.ts'

const BASE = { domainId: 'x', sourceRef: 'x.rst', sourceRevision: null, metadata: {}, chunks: ['x'] }
const WITH_PRIVATE: CorpusPolicy = { domains: [...INITIAL_CORPUS_POLICY.domains, { domain: 'workspace-note', visibility: 'private' }] }

describe('política de ingesta del corpus', () => {
  test('la política inicial declara los seis dominios de D5, todos shared', () => {
    expect(INITIAL_CORPUS_POLICY.domains.map(declaration => declaration.domain)).toEqual(['finding', 'error', 'adr', 'technical-doc', 'runbook', 'evidence'])
    expect(new Set(INITIAL_CORPUS_POLICY.domains.map(declaration => declaration.visibility))).toEqual(new Set(['shared']))
  })

  test('un dominio declarado entra con la visibilidad que declara, sin dueño', () => {
    expect(admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain: 'adr' })).toEqual({ visibility: 'shared', owner: null })
  })

  test('un origen sin declarar rehúsa nombrándolo y nombrando los declarados', () => {
    for (const domain of ['worktree', 'workbench', 'log']) {
      expect(() => admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain })).toThrow(UndeclaredCorpusDomainError)
    }
    expect(() => admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain: 'workbench' })).toThrow(/'workbench'.*finding, error, adr/)
  })

  test('lo efímero no entra al corpus durable: exige promoción explícita', () => {
    expect(() => admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain: 'adr', visibility: 'ephemeral' })).toThrow(EphemeralContentError)
  })

  test('una visibilidad distinta de la declarada por el dominio rehúsa', () => {
    expect(() => admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain: 'adr', visibility: 'private', owner: 'ws-1' })).toThrow(/'adr'.*shared.*private/)
  })

  test('lo privado exige dueño, y lo compartido no admite uno', () => {
    expect(admitDocument(WITH_PRIVATE, { ...BASE, domain: 'workspace-note', owner: 'ws-1' })).toEqual({ visibility: 'private', owner: 'ws-1' })
    expect(() => admitDocument(WITH_PRIVATE, { ...BASE, domain: 'workspace-note' })).toThrow(InvalidCorpusInputError)
    expect(() => admitDocument(WITH_PRIVATE, { ...BASE, domain: 'workspace-note', owner: '  ' })).toThrow(InvalidCorpusInputError)
    expect(() => admitDocument(INITIAL_CORPUS_POLICY, { ...BASE, domain: 'adr', owner: 'ws-1' })).toThrow(InvalidCorpusInputError)
  })

  test('una política que declara dos veces un dominio rehúsa', () => {
    expect(() => admitDocument({ domains: [{ domain: 'adr', visibility: 'shared' }, { domain: 'adr', visibility: 'private' }] }, { ...BASE, domain: 'adr' })).toThrow(/declared twice/)
  })
})
