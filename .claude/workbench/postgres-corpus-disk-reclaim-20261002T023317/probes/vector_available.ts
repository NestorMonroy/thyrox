/** Versión de pgvector disponible y creada; sólo lee. */
import { SQL } from 'bun'
const sql = new SQL({ url: process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL! })
const available = await sql`SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name = 'vector'`
const [role] = await sql`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`
console.log(JSON.stringify({ vector: available[0] ?? null, superuser: role.rolsuper }))
await sql.close()
