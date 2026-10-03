// Escribe o lee una fila marcadora en thyrox-postgres. Corre DENTRO de una
// unidad (red del anfitrión); la contraseña llega como secreto montado.
import { SQL } from 'bun'
import { readFileSync, existsSync } from 'node:fs'

const [mode, marker] = process.argv.slice(2)
if (!existsSync('/run/.containerenv')) { console.error('marker: fuera de una unidad'); process.exit(9) }
const password = readFileSync('/run/secrets/THYROX_INFRA_POSTGRES_PASSWORD', 'utf8').trim()
const user = process.env.THYROX_INFRA_POSTGRES_USER || 'thyrox'
const db = process.env.THYROX_INFRA_POSTGRES_DB || 'thyrox'
const port = process.env.THYROX_INFRA_POSTGRES_PORT || '55432'
const sql = new SQL({ hostname: '127.0.0.1', port: Number(port), username: user, password, database: db })
await sql`CREATE TABLE IF NOT EXISTS durability_probe (marker text PRIMARY KEY, written_at timestamptz DEFAULT now())`
if (mode === 'write') {
  await sql`INSERT INTO durability_probe (marker) VALUES (${marker})`
  console.log(`written ${marker}`)
} else {
  const rows = await sql`SELECT marker, written_at FROM durability_probe WHERE marker = ${marker}`
  console.log(rows.length === 1 ? `present ${marker} written_at=${rows[0].written_at.toISOString()}` : `absent ${marker}`)
  await sql.close()
  process.exit(rows.length === 1 ? 0 : 1)
}
await sql.close()
