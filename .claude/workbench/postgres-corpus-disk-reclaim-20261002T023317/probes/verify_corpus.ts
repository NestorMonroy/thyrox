/**
 * Verificación de un dominio ingerido, sólo con lo que hay en PostgreSQL:
 * cada documento vigente tiene chunks, su `content_hash` es el hash de esos
 * chunks, su identidad y su procedencia están, no hay chunks duplicados, y el
 * texto de una muestra se recupera por identidad. Sólo lee.
 * Uso: bun verify_corpus.ts <dominio> <id-muestra>...
 */
import { SQL } from 'bun'

import { chunkHash, documentHash } from '../../../../src/packages/semantic-search/contentHash'
import { openSemanticSearchStore } from '../../../../src/packages/semantic-search/store'

const [domain, ...samples] = process.argv.slice(2)
const url = process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL
if (!url || !domain) { console.error('verify_corpus: falta la URL o el dominio'); process.exit(2) }
const schema = process.env.THYROX_SEMANTIC_SEARCH_SCHEMA ?? 'semantic_search'
const sql = new SQL({ url })
await sql.unsafe(`SET search_path TO "${schema}"`)
const documents = (await sql.unsafe(
  `SELECT d.document_id, d.domain_id, d.source_ref, d.source_revision, d.content_hash, d.version,
          array_agg(c.text ORDER BY c.position) AS chunks, array_agg(c.content_hash ORDER BY c.position) AS chunk_hashes
     FROM documents d JOIN document_chunks c ON c.document_id = d.document_id AND c.version = d.version
    WHERE d.domain = $1 GROUP BY d.document_id`, [domain])) as {
  document_id: string; domain_id: string; source_ref: string; source_revision: string | null; content_hash: string
  version: number; chunks: string[]; chunk_hashes: string[] }[]
const [withoutChunks] = (await sql.unsafe(
  `SELECT count(*)::int AS n FROM documents d WHERE d.domain = $1 AND NOT EXISTS
     (SELECT 1 FROM document_chunks c WHERE c.document_id = d.document_id AND c.version = d.version)`, [domain])) as { n: number }[]
const [duplicates] = (await sql.unsafe(
  `SELECT count(*)::int AS n FROM (SELECT document_id, version, position FROM document_chunks
     GROUP BY 1, 2, 3 HAVING count(*) > 1) x`)) as { n: number }[]
const hashMismatch = documents.filter(d => documentHash(d.chunks) !== d.content_hash).map(d => d.domain_id)
const chunkHashMismatch = documents.filter(d => d.chunks.some((text, i) => chunkHash(text) !== d.chunk_hashes[i])).map(d => d.domain_id)
const missingIdentity = documents.filter(d => !d.domain_id || !d.source_ref || !d.source_revision).map(d => d.domain_id)
const store = openSemanticSearchStore({ url, schema: { name: schema } })
const retrieval = []
for (const domainId of samples) {
  const found = await store.findDocument({ domain, domainId })
  const [chunk] = (await sql.unsafe(
    `SELECT c.text FROM document_chunks c JOIN documents d USING (document_id)
      WHERE d.domain = $1 AND d.domain_id = $2 AND c.version = d.version ORDER BY c.position LIMIT 1`, [domain, domainId])) as { text: string }[]
  retrieval.push({ domainId, found: found !== null, sourceRef: found?.sourceRef, firstChunk: chunk?.text.slice(0, 160) ?? null })
}
await store.close()
await sql.close()
const passed = documents.length > 0 && withoutChunks.n === 0 && duplicates.n === 0 && hashMismatch.length === 0
  && chunkHashMismatch.length === 0 && missingIdentity.length === 0 && retrieval.every(r => r.found && r.firstChunk)
console.log(JSON.stringify({ domain, documents: documents.length, withoutChunks: withoutChunks.n, duplicateChunks: duplicates.n,
  hashMismatch, chunkHashMismatch, missingIdentity, retrieval, passed }, null, 1))
process.exit(passed ? 0 : 1)
