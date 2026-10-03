import { SQL } from 'bun'
const base = process.env.PROBE_URL as string
const root = new SQL(base)
const dbs = (await root.unsafe('SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1')) as { datname: string }[]
await root.close()
for (const { datname } of dbs) {
  const sql = new SQL(base.replace(/\/[^/]+$/, `/${datname}`))
  const rows = (await sql.unsafe("SELECT table_schema, count(*)::int AS tables FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') GROUP BY 1 ORDER BY 1")) as unknown[]
  const docs = (await sql.unsafe("SELECT table_schema FROM information_schema.tables WHERE table_name IN ('documents','document_chunks')")) as unknown[]
  console.log(JSON.stringify({ datname, schemas: rows, corpusTables: docs }))
  await sql.close()
}
