/**
 * Genera la suite embedding-findings@1 desde el corpus de hallazgos del store,
 * abierto en sólo lectura por `@thyrox/store`. Uso:
 *   bun export_embedding_suite.ts <agent_store.sqlite3> <salida.json> [id-de-suite] [casos]
 */
import { writeFile } from 'node:fs/promises'

import { openLocal } from '@thyrox/store/db.ts'
import { buildEmbeddingSuiteFromCorpus, type CorpusRecord } from '@thyrox/local-models/embeddingSuiteFromCorpus.ts'

const [storePath, outputPath] = process.argv.slice(2)
if (!storePath || !outputPath) throw new Error('uso: export_embedding_suite.ts <store> <salida.json>')
const database = openLocal(storePath, { readonly: true })
const objects = database.query("SELECT type, name FROM sqlite_master WHERE name LIKE 'findings%'").all()
console.error(JSON.stringify(objects))
const records = database.query('SELECT rowid AS id, summary, content FROM findings_fts').all() as { id: number; summary: string | null; content: string | null }[]
const corpus: CorpusRecord[] = records.map(row => ({ id: `findings_fts:${row.id}`, summary: row.summary ?? '', content: row.content ?? '' }))
const suiteId = process.argv[4] ?? 'embedding-findings@1'
const caseCount = Number(process.argv[5] ?? 40)
const suite = buildEmbeddingSuiteFromCorpus(corpus, { id: suiteId, caseCount, distractorsPerCase: 7, seed: suiteId })
await writeFile(outputPath, `${JSON.stringify(suite, null, 2)}\n`)
console.log(`corpus ${corpus.length} registro(s) · ${suite.cases.length} caso(s) × ${suite.cases[0]?.distractors.length} distractor(es) → ${outputPath}`)
