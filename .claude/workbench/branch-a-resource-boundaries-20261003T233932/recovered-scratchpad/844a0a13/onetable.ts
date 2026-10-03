import { SQL } from 'bun'
const sql = new SQL(process.env.PROBE_URL as string)
console.log(JSON.stringify(await sql.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")))
await sql.close()
