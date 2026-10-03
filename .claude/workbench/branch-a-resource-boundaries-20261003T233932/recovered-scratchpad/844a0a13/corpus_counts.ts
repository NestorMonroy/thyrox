// Medición de sólo lectura del corpus: cada esquema con tabla `documents`.
import { SQL } from 'bun'
const sql = new SQL(process.env.PROBE_URL as string)
await sql.unsafe('SET default_transaction_read_only = on')
const schemas = (await sql.unsafe("SELECT table_schema FROM information_schema.tables WHERE table_name = 'documents' ORDER BY 1")) as { table_schema: string }[]
const tables = ['documents', 'document_versions', 'document_chunks', 'embedding_spaces', 'embeddings', 'analysis_runs']
for (const { table_schema: schema } of schemas) {
  const counts: Record<string, string> = {}
  for (const table of tables) {
    const exists = (await sql.unsafe('SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2', [schema, table])).length
    counts[table] = exists ? String(((await sql.unsafe(`SELECT count(*)::int AS n FROM "${schema}"."${table}"`)) as { n: number }[])[0]?.n) : 'absent'
  }
  const spaceCols = (await sql.unsafe("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'embedding_spaces'", [schema])) as { column_name: string }[]
  console.log(JSON.stringify({ schema, ...counts, embedding_space_columns: spaceCols.map(c => c.column_name) }))
}
const ext = await sql.unsafe("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
console.log(JSON.stringify({ vector_extension: ext }))
await sql.close()
