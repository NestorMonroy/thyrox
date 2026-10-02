/**
 * Estado del corpus semántico: versiones de PostgreSQL y pgvector, base, y el
 * conteo de cada tabla del esquema. Sólo lee. Corre dentro de una unidad.
 * Uso: bun corpus_state.ts [esquema]
 */
import { SQL } from 'bun'

const schema = process.argv[2] ?? process.env.THYROX_SEMANTIC_SEARCH_SCHEMA ?? 'semantic_search'
const url = process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL
if (!url) { console.error('corpus_state: falta la URL'); process.exit(2) }
const sql = new SQL({ url })
const [server] = await sql`SELECT current_database() AS database, current_setting('server_version') AS version`
const [vector] = await sql`SELECT extversion FROM pg_extension WHERE extname = 'vector'`
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema} AND table_type = 'BASE TABLE' ORDER BY table_name`
const counts: Record<string, number> = {}
for (const { table_name } of tables) {
  const [row] = await sql.unsafe(`SELECT count(*)::bigint AS n FROM "${schema}"."${table_name}"`)
  counts[table_name] = Number(row.n)
}
const [size] = await sql`SELECT pg_database_size(current_database())::bigint AS bytes`
console.log(JSON.stringify({ database: server.database, postgres: server.version, pgvector: vector?.extversion ?? null,
  schema, databaseBytes: Number(size.bytes), counts }))
await sql.close()
