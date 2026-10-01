/**
 * D5 contra un PostgreSQL real (ADR-THYROX-008): sólo un origen declarado
 * entra, lo efímero no deja filas, lo privado lleva a su dueño y sólo él lo
 * encuentra, una versión nueva no borra la anterior y un chunk citado por un
 * análisis no se puede borrar.
 *
 * Sin `THYROX_TEST_POSTGRES_URL` la suite se declara NO MEDIDA en vez de pasar.
 */
import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl } from '@thyrox/store/testing/postgresTestSchema.ts'

import { INITIAL_CORPUS_POLICY } from '../corpusPolicy.ts'
import { EphemeralContentError, UndeclaredCorpusDomainError } from '../errors.ts'
import { openSemanticSearchStore } from '../store.ts'
import { countRows, embedPending, embedText, PRIVATE_TEST_DOMAIN, withCorpusStore } from './support/corpusFixtures.ts'

const url = resolvePostgresTestUrl()
const SHAPE = { model: 'model-a', dimensions: 4, representation: 'vector' as const }
const CANDIDATES = 10
const SECRET = 'notas privadas del workspace uno'

if (!url) {
  describe('visibilidad del corpus — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('visibilidad del corpus — qué entra', () => {
    test('la política inicial rehúsa un origen sin declarar y lo efímero, sin dejar filas', async () => {
      await withCorpusStore(testUrl, async (_store, sql, schema) => {
        const store = openSemanticSearchStore({ url: testUrl, schema: { name: schema }, corpusPolicy: INITIAL_CORPUS_POLICY })
        try {
          const base = { domainId: 'w', sourceRef: '.claude/worktrees/x/w.md', sourceRevision: null, metadata: {}, chunks: ['w'] }
          await expect(store.ingestDocument({ ...base, domain: 'worktree' })).rejects.toBeInstanceOf(UndeclaredCorpusDomainError)
          await expect(store.ingestDocument({ ...base, domain: 'adr', visibility: 'ephemeral' })).rejects.toBeInstanceOf(EphemeralContentError)
          expect(await countRows(sql, 'documents')).toBe(0)
          expect((await store.ingestDocument({ ...base, domain: 'adr', sourceRef: 'docs/adr-001.rst' })).status).toBe('created')
          expect((await store.findDocument({ domain: 'adr', domainId: 'w' }))?.visibility).toBe('shared')
        } finally {
          await store.close()
        }
      })
    })
  })

  describe('visibilidad del corpus — privado', () => {
    test('un documento privado sólo aparece en la búsqueda de su dueño', async () => {
      await withCorpusStore(testUrl, async store => {
        await store.ingestDocument({ domain: 'note', domainId: 'pub', sourceRef: 'pub.md', sourceRevision: null, metadata: {}, chunks: ['texto compartido'] })
        const created = await store.ingestDocument({ domain: PRIVATE_TEST_DOMAIN, owner: 'ws-1', domainId: 'n', sourceRef: 'n.md', sourceRevision: null, metadata: {}, chunks: [SECRET] })
        const space = await store.createEmbeddingSpace(SHAPE)
        await embedPending(store, space.spaceId, SHAPE.dimensions)
        await store.activateSpace(space.spaceId)
        const query = embedText(SECRET, SHAPE.dimensions)
        const texts = async (owner?: string) => (await store.searchNearest(query, 5, { candidates: CANDIDATES, owner })).map(hit => hit.text)
        expect(await texts()).not.toContain(SECRET)
        expect(await texts('ws-2')).not.toContain(SECRET)
        expect(await texts('ws-1')).toContain(SECRET)
        expect(await texts('ws-1')).toContain('texto compartido')
        expect(await store.findDocument({ domain: PRIVATE_TEST_DOMAIN, domainId: 'n' })).toBeNull()
        expect(await store.findDocument({ domain: PRIVATE_TEST_DOMAIN, owner: 'ws-1', domainId: 'n' })).toMatchObject({ documentId: created.documentId, visibility: 'private', owner: 'ws-1' })
      })
    })

    test('dos dueños con la misma identidad son dos documentos', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const common = { domain: PRIVATE_TEST_DOMAIN, domainId: 'n', sourceRef: 'n.md', sourceRevision: null, metadata: {}, chunks: ['uno'] }
        const first = await store.ingestDocument({ ...common, owner: 'ws-1' })
        const second = await store.ingestDocument({ ...common, owner: 'ws-2' })
        expect(second.status).toBe('created')
        expect(second.documentId).not.toBe(first.documentId)
        expect(await countRows(sql, 'documents')).toBe(2)
      })
    })
  })

  describe('visibilidad del corpus — retención', () => {
    test('una versión nueva conserva el texto de la anterior: no hay TTL ni borrado por reemplazo', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const identity = { domain: 'note', domainId: 'r', sourceRef: 'r.md', sourceRevision: null, metadata: {} }
        await store.ingestDocument({ ...identity, chunks: ['primera'] })
        await store.ingestDocument({ ...identity, chunks: ['segunda'] })
        const rows = (await sql.unsafe('SELECT version, text FROM document_chunks ORDER BY version')) as { version: number; text: string }[]
        expect(rows).toEqual([
          { version: 1, text: 'primera' },
          { version: 2, text: 'segunda' },
        ])
      })
    })

    test('un chunk citado por un análisis no se puede borrar', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        await store.ingestDocument({ domain: 'note', domainId: 'c', sourceRef: 'c.md', sourceRevision: null, metadata: {}, chunks: ['citado'] })
        const space = await store.createEmbeddingSpace(SHAPE)
        const [chunk] = await store.chunksWithoutEmbedding(space.spaceId, 1)
        const chunkId = chunk?.chunkId ?? ''
        await store.recordAnalysisRun({ input: 'citado', spaceId: space.spaceId, candidates: [{ chunkId, score: 1 }], output: {} })
        const deletion = await sql.unsafe('DELETE FROM document_chunks WHERE chunk_id = $1', [chunkId]).then(
          () => null,
          (error: unknown) => error,
        )
        expect(String(deletion)).toMatch(/analysis_candidates/)
        expect(await countRows(sql, 'document_chunks')).toBe(1)
      })
    })
  })
}
