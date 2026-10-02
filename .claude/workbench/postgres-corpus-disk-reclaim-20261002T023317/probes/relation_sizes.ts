/**
 * T005c: lo que el corpus ya ocupa en PostgreSQL, por relación, y los ajustes
 * que fijan el margen operativo (WAL). Sólo lee. Corre dentro de una unidad.
 * Uso: bun relation_sizes.ts [esquema]
 */
import { SQL } from 'bun'

const schema = process.argv[2] ?? process.env.THYROX_SEMANTIC_SEARCH_SCHEMA ?? 'semantic_search'
const url = process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL
if (!url) { console.error('relation_sizes: falta la URL'); process.exit(2) }
const sql = new SQL({ url })
const relations = await sql`
  SELECT c.relname AS name, c.relkind AS kind, coalesce(t.relname, c.relname) AS table_name,
         pg_relation_size(c.oid)::bigint AS bytes, c.reltuples::bigint AS estimated_rows
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_index i ON i.indexrelid = c.oid LEFT JOIN pg_class t ON t.oid = i.indrelid
  WHERE n.nspname = ${schema} AND c.relkind IN ('r', 'i', 't')
  ORDER BY c.relname`
const counts: Record<string, number> = {}
for (const { name } of relations.filter((r: { kind: string }) => r.kind === 'r')) {
  const [row] = await sql.unsafe(`SELECT count(*)::bigint AS n FROM "${schema}"."${name}"`)
  counts[name] = Number(row.n)
}
const settings = await sql`SELECT name, setting, unit FROM pg_settings
  WHERE name IN ('max_wal_size', 'min_wal_size', 'wal_segment_size', 'block_size')`
const [database] = await sql`SELECT pg_database_size(current_database())::bigint AS bytes`
const [vector] = await sql`SELECT extversion FROM pg_extension WHERE extname = 'vector'`
const [text] = await sql.unsafe(`SELECT coalesce(sum(octet_length(text)), 0)::bigint AS bytes FROM "${schema}".document_chunks`)
await sql.close()
console.log(JSON.stringify({ schema, pgvector: vector?.extversion ?? null, databaseBytes: Number(database.bytes),
  counts, relations: relations.map((r: Record<string, unknown>) => ({ ...r, bytes: Number(r.bytes), estimated_rows: Number(r.estimated_rows) })),
  settings, chunkTextBytes: Number(text.bytes) }))
