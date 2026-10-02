// Censo de celdas de credencial del store de conexiones: cuántas están
// cifradas (`enc:v1:`), cuántas en claro y cuántas vacías, por columna. Lee
// sólo el prefijo de cada celda dentro de SQL: ningún valor sale del motor.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

import { resolveProvidersDataDir } from '@thyrox/provider/accounts/connectionStoreHome'

const file = join(resolveProvidersDataDir(), 'connections.sqlite3')
const candidates = [file, ...['connections.db', 'provider_connections.sqlite3'].map(name => join(resolveProvidersDataDir(), name))]
const path = candidates.find(existsSync)
if (!path) {
  console.log(JSON.stringify({ store: resolveProvidersDataDir(), present: false }))
  process.exit(0)
}
const db = new Database(path, { readonly: true })
const census: Record<string, unknown> = {}
for (const column of ['api_key', 'access_token', 'refresh_token', 'id_token']) {
  census[column] = db.query(`SELECT
    SUM(CASE WHEN ${column} IS NULL OR ${column} = '' THEN 1 ELSE 0 END) AS empty,
    SUM(CASE WHEN ${column} LIKE 'enc:v1:%' THEN 1 ELSE 0 END) AS sealed,
    SUM(CASE WHEN ${column} IS NOT NULL AND ${column} <> '' AND ${column} NOT LIKE 'enc:v1:%' THEN 1 ELSE 0 END) AS plaintext
    FROM provider_connections`).get()
}
console.log(JSON.stringify({ store: path, present: true, rows: (db.query('SELECT COUNT(*) AS n FROM provider_connections').get() as { n: number }).n, census }, null, 2))
