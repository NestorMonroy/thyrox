/** Corre snapshot.sql contra el store semántico y emite su JSON. Uso: bun snapshot.ts <snapshot.sql> */
import { readFileSync } from 'node:fs'
import { SQL } from 'bun'

const url = process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL
if (!url) { console.error('snapshot: falta la URL'); process.exit(2) }
const sql = new SQL({ url })
const [, query] = readFileSync(process.argv[2], 'utf8').split(/^SET search_path TO semantic_search;$/m)
await sql.unsafe('SET search_path TO semantic_search')
const [row] = (await sql.unsafe(query)) as { snapshot: unknown }[]
console.log(JSON.stringify(row?.snapshot))
await sql.close()
