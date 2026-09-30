/**
 * La identidad del corpus durable (ADR-THYROX-008 1.5.0) contra un
 * PostgreSQL real: un documento es `domain` · `scope` · `domainId`, su versión
 * es el hash del contenido, y `sourceRef` · `sourceRevision` son procedencia
 * que se guarda sin decidir nada. Las filas escritas con la identidad vieja
 * (migración 2) convergen por `reconcileLegacyIdentities` sin que ningún
 * análisis pierda el texto de sus candidatos.
 *
 * Sin `THYROX_TEST_POSTGRES_URL` la suite se declara NO MEDIDA en vez de pasar.
 */
import type { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl, withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import type { DocumentInput } from '../corpus.ts'
import type { LegacyIdentityResolver } from '../legacyIdentity.ts'
import { countRows, currentSchema, embedPending, openStoreFor, withCorpusStore } from './support/corpusFixtures.ts'
import { allChunkIds, candidateTexts, insertLegacyAnalysisRun, insertLegacyDocument, migrateToLegacySchema } from './support/legacyCorpus.ts'

const url = resolvePostgresTestUrl()

const FINDINGS = 'finding'
const ADR = 'adr'
const MODEL = { model: 'model-a', dimensions: 4, representation: 'vector' as const }
const REVISION_A = 'aaaaaaa'
const REVISION_B = 'bbbbbbb'

function finding(domainId: string, sourceRef: string, chunks: readonly string[], sourceRevision: string | null = REVISION_A): DocumentInput {
  return { domain: FINDINGS, domainId, sourceRef, sourceRevision, metadata: {}, chunks }
}

async function versionsOf(sql: SQL, documentId: string): Promise<number[]> {
  const rows = (await sql.unsafe('SELECT DISTINCT version FROM document_chunks WHERE document_id = $1 ORDER BY version', [documentId])) as { version: number }[]
  return rows.map(row => row.version)
}

if (!url) {
  describe('identidad de dominio — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('identidad de dominio — ingesta', () => {
    test('1: mismo domainId y mismo contenido desde dos rutas de clon es un documento con una versión', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const first = await store.ingestDocument(finding('H-API-0001', 'clone-a/pm/hallazgo-H-API-0001.rst', ['cuerpo 1']))
        await store.ingestDocument(finding('H-API-0002', 'clone-a/pm/hallazgo-H-API-0002.rst', ['cuerpo 2']))
        const again = await store.ingestDocument(finding('H-API-0001', 'clone-b/otra/ruta/hallazgo-H-API-0001.rst', ['cuerpo 1']))
        expect(again).toEqual({ status: 'unchanged', documentId: first.documentId, version: 1 })
        expect(await countRows(sql, 'documents')).toBe(2)
        expect(await versionsOf(sql, first.documentId)).toEqual([1])
      })
    })

    test('2: mismo domainId con contenido cambiado es un documento con dos versiones', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const first = await store.ingestDocument(finding('H-API-0001', 'clone-a/h.rst', ['redacción vieja']))
        const second = await store.ingestDocument(finding('H-API-0001', 'clone-b/h.rst', ['redacción nueva']))
        expect(second).toEqual({ status: 'new-version', documentId: first.documentId, version: 2 })
        expect(await countRows(sql, 'documents')).toBe(1)
        expect(await versionsOf(sql, first.documentId)).toEqual([1, 2])
      })
    })

    test('3: distinto domainId con contenido idéntico son dos documentos', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const first = await store.ingestDocument(finding('H-API-0001', 'h1.rst', ['mismo texto']))
        const second = await store.ingestDocument(finding('H-API-0002', 'h2.rst', ['mismo texto']))
        expect(second.status).toBe('created')
        expect(second.documentId).not.toBe(first.documentId)
        expect(await countRows(sql, 'documents')).toBe(2)
      })
    })

    test('4: cambiar sourceRef no cambia la identidad y actualiza la procedencia', async () => {
      await withCorpusStore(testUrl, async store => {
        const first = await store.ingestDocument(finding('H-API-0001', 'clone-a/h.rst', ['texto']))
        const moved = await store.ingestDocument(finding('H-API-0001', 'clone-a/movido/h.rst', ['texto']))
        expect(moved.documentId).toBe(first.documentId)
        const found = await store.findDocument({ domain: FINDINGS, domainId: 'H-API-0001' })
        expect(found?.documentId).toBe(first.documentId)
        expect(found?.sourceRef).toBe('clone-a/movido/h.rst')
      })
    })

    test('5: cambiar sourceRevision sin cambiar el contenido no crea versión', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const first = await store.ingestDocument(finding('H-API-0001', 'h.rst', ['texto'], REVISION_A))
        const again = await store.ingestDocument(finding('H-API-0001', 'h.rst', ['texto'], REVISION_B))
        expect(again).toEqual({ status: 'unchanged', documentId: first.documentId, version: 1 })
        expect(await countRows(sql, 'document_chunks')).toBe(1)
        const found = await store.findDocument({ domain: FINDINGS, domainId: 'H-API-0001' })
        expect(found).toMatchObject({ version: 1, sourceRevision: REVISION_B })
      })
    })

    test('8: mismo domainId en dos scopes de un dominio con scope son dos documentos', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const common = { domain: ADR, domainId: 'ADR-001', sourceRevision: null, metadata: {}, chunks: ['decisión'] }
        const thyrox = await store.ingestDocument({ ...common, scope: 'thyrox', sourceRef: 'thyrox/adr-001.rst' })
        const api = await store.ingestDocument({ ...common, scope: 'kaupamex-api', sourceRef: 'api/adr-001.rst' })
        expect([thyrox.status, api.status]).toEqual(['created', 'created'])
        expect(await countRows(sql, 'documents')).toBe(2)
        expect((await store.findDocument({ domain: ADR, scope: 'kaupamex-api', domainId: 'ADR-001' }))?.documentId).toBe(api.documentId)
        expect(await store.findDocument({ domain: ADR, domainId: 'ADR-001' })).toBeNull()
      })
    })

    test('findDocument devuelve la versión y el hash vigentes; la búsqueda devuelve la identidad y la procedencia', async () => {
      await withCorpusStore(testUrl, async store => {
        await store.ingestDocument(finding('H-API-0001', 'h.rst', ['uno']))
        const second = await store.ingestDocument(finding('H-API-0001', 'h.rst', ['dos'], REVISION_B))
        const found = await store.findDocument({ domain: FINDINGS, scope: '', domainId: 'H-API-0001' })
        expect(found).toMatchObject({ documentId: second.documentId, domain: FINDINGS, scope: '', domainId: 'H-API-0001', version: 2, sourceRef: 'h.rst' })
        expect(found?.contentHash).toMatch(/^[0-9a-f]{64}$/)
        const space = await store.createEmbeddingSpace(MODEL)
        await embedPending(store, space.spaceId, MODEL.dimensions)
        await store.activateSpace(space.spaceId)
        const [hit] = await store.searchNearest([1, 1, 1, 1], 1, { candidates: 5 })
        expect(hit).toMatchObject({ text: 'dos', domain: FINDINGS, domainId: 'H-API-0001', sourceRef: 'h.rst', sourceRevision: REVISION_B, version: 2 })
      })
    })
  })

  describe('identidad de dominio — migración v2 → v3 y reconciliación', () => {
    test('6 y 7: lo viejo converge a la identidad de dominio sin dejar análisis colgados; lo no mapeado queda sin mapear', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        await migrateToLegacySchema(sql)
        const earliest = await insertLegacyDocument(sql, {
          scope: 'adr',
          sourceIdentity: 'thyrox@c0:clone-b/adr-001.rst',
          versions: [['versión cero']],
          ingestedAt: '2026-09-01T00:00:00Z',
        })
        const later = await insertLegacyDocument(sql, {
          scope: 'adr',
          sourceIdentity: 'thyrox@c1:clone-a/adr-001.rst',
          versions: [['versión uno'], ['versión dos', 'anexo']],
          ingestedAt: '2026-09-02T00:00:00Z',
        })
        const duplicate = await insertLegacyDocument(sql, {
          scope: 'adr',
          sourceIdentity: 'thyrox@c2:clone-c/adr-001.rst',
          versions: [['versión dos', 'anexo']],
          ingestedAt: '2026-09-03T00:00:00Z',
        })
        await insertLegacyDocument(sql, { scope: 'adr', sourceIdentity: 'thyrox@c1:clone-a/adr-002.rst', versions: [['otra decisión']], ingestedAt: '2026-09-02T00:00:00Z' })
        await insertLegacyDocument(sql, { scope: 'notes', sourceIdentity: 'tmp:borrador.md', versions: [['sin dueño']], ingestedAt: '2026-09-02T00:00:00Z' })
        const cited = [earliest.chunkIds[0]?.[0], later.chunkIds[0]?.[0], duplicate.chunkIds[0]?.[1], later.chunkIds[1]?.[0]].map(id => id ?? '')
        const analysisId = await insertLegacyAnalysisRun(sql, cited)
        const textsBefore = await candidateTexts(sql, analysisId)
        const chunksBefore = await allChunkIds(sql)

        const store = openStoreFor(testUrl, schema)
        try {
          expect(await store.migrate()).toEqual([3])
          const resolve: LegacyIdentityResolver = (_scope, sourceIdentity) => {
            const match = /adr-(\d+)\.rst$/.exec(sourceIdentity)
            return match ? { domain: ADR, scope: 'thyrox', domainId: `ADR-${match[1]}` } : null
          }
          expect(await store.reconcileLegacyIdentities(resolve)).toEqual({ mapped: 4, unmapped: 1, documents: 2 })

          const adr001 = await store.findDocument({ domain: ADR, scope: 'thyrox', domainId: 'ADR-001' })
          expect(adr001).toMatchObject({ version: 3, sourceRef: 'thyrox@c2:clone-c/adr-001.rst' })
          expect(await versionsOf(sql, adr001?.documentId ?? '')).toEqual([1, 2, 3])
          expect(await allChunkIds(sql)).toEqual(chunksBefore)
          expect(await candidateTexts(sql, analysisId)).toEqual(textsBefore)

          const run = await store.getAnalysisRun(analysisId)
          expect(run?.candidates.map(candidate => candidate.text)).toEqual(textsBefore)
          expect(run?.corpusVersions).toEqual([1, 2, 3].map(version => ({ documentId: adr001?.documentId ?? '', version })))

          expect(await countRows(sql, 'documents')).toBe(3)
          const [unmapped] = (await sql.unsafe('SELECT count(*)::int AS n FROM documents WHERE domain IS NULL')) as { n: number }[]
          expect(unmapped?.n).toBe(1)
          expect(await store.findDocument({ domain: 'notes', scope: 'notes', domainId: 'tmp:borrador.md' })).toBeNull()
          const reingested = await store.ingestDocument({ domain: 'notes', scope: 'notes', domainId: 'borrador', sourceRef: 'tmp:borrador.md', sourceRevision: null, metadata: {}, chunks: ['sin dueño'] })
          expect(reingested.status).toBe('created')

          const space = await store.createEmbeddingSpace(MODEL)
          const embedded = await embedPending(store, space.spaceId, MODEL.dimensions)
          expect(embedded).toBe(4)
          expect(await store.reconcileLegacyIdentities(resolve)).toEqual({ mapped: 0, unmapped: 1, documents: 0 })
        } finally {
          await store.close()
        }
      })
    })

    test('la reconciliación converge sobre un documento ya ingerido con la identidad nueva', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        await migrateToLegacySchema(sql)
        await insertLegacyDocument(sql, { scope: 'h', sourceIdentity: 'docs@c0:H-API-0007.rst', versions: [['antes']], ingestedAt: '2026-09-01T00:00:00Z' })
        const store = openStoreFor(testUrl, schema)
        try {
          await store.migrate()
          const current = await store.ingestDocument(finding('H-API-0007', 'docs/H-API-0007.rst', ['ahora']))
          const result = await store.reconcileLegacyIdentities(() => ({ domain: FINDINGS, scope: '', domainId: 'H-API-0007' }))
          expect(result).toEqual({ mapped: 1, unmapped: 0, documents: 1 })
          const found = await store.findDocument({ domain: FINDINGS, domainId: 'H-API-0007' })
          expect(found).toMatchObject({ documentId: current.documentId, version: 2, sourceRef: 'docs/H-API-0007.rst' })
          expect(await countRows(sql, 'documents')).toBe(1)
        } finally {
          await store.close()
        }
      })
    })
  })
}
