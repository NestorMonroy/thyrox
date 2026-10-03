/**
 * A2: deriva la suite de embeddings del corpus propio de hallazgos con
 * `buildEmbeddingSuiteFromCorpus` (la biblioteca existente; no hay CLI que la
 * exponga). Lee el store en sólo lectura y escribe la suite en <salida>.
 *
 * Uso: bun build_embedding_suite.ts <store.sqlite3> <salida.json> [casos] [distractores] [semilla]
 */
import { Database } from 'bun:sqlite'
import { writeFileSync } from 'node:fs'

import { buildEmbeddingSuiteFromCorpus, type CorpusRecord } from '../../../../src/packages/local-models/embeddingSuiteFromCorpus.ts'

const [storePath, outPath, cases = '20', distractors = '3', seed = 'a2-nomic-embed'] = process.argv.slice(2)
if (!storePath || !outPath) {
  process.stderr.write('uso: build_embedding_suite.ts <store.sqlite3> <salida.json> [casos] [distractores] [semilla]\n')
  process.exit(2)
}
const db = new Database(storePath, { readonly: true })
const records = db
  .query<CorpusRecord, []>('SELECT finding_id AS id, summary, content FROM findings_history WHERE finding_id IS NOT NULL')
  .all()
db.close()
const suite = buildEmbeddingSuiteFromCorpus(records, {
  id: `findings-${seed}`,
  caseCount: Number(cases),
  distractorsPerCase: Number(distractors),
  seed,
})
writeFileSync(outPath, JSON.stringify(suite, null, 2))
process.stdout.write(`suite ${suite.id}: ${suite.cases.length} caso(s) de ${records.length} registro(s)\n`)
