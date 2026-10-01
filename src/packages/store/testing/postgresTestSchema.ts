/**
 * El esquema de usar y tirar en el que corre cada prueba de PostgreSQL de
 * `@thyrox/store`, y de dónde sale la URL de la base de pruebas.
 *
 * Ningún caso corre en el esquema `public`: dos pruebas en paralelo, o una
 * que deja basura, no se pisan porque cada una crea el suyo y lo borra al
 * salir — el mismo bloque que `errorStore.postgres.test.ts` repetía por
 * archivo vive aquí una sola vez.
 *
 * El `search_path` se fija en el arranque de cada conexión, no con un `SET`
 * suelto: `Bun.SQL` es un pool, y medido contra PostgreSQL 16 un `SET` llegó a
 * 1 de 4 conexiones, así que `begin` podía caer en otra y no ver el esquema
 * (`.claude/workbench/datos-d1-store-20260929T062907/probe-search-path.sh`).
 *
 * Con el servidor caído, cada esquema desechable intentaba conectar por su
 * cuenta y fallaba por separado (medido: 26 + 8 fallos de ~1 ms). Por eso
 * `withDisposableSchema` comprueba la alcanzabilidad una sola vez por
 * proceso, memoizada por URL (`assertPostgresReachable`): la primera llamada
 * conecta de verdad y lanza UN error legible si no responde; las siguientes
 * reutilizan ese resultado sin volver a conectar.
 */
import { SQL } from 'bun'

import { dialectOf } from '../sql.ts'

type Env = Record<string, string | undefined>

/** La variable que declara la base PostgreSQL de pruebas, sin valor propio del proveedor. */
export const TEST_POSTGRES_URL_VAR = 'THYROX_TEST_POSTGRES_URL'

/** Enmascara las credenciales de una URL antes de que viajen a un mensaje de error. */
function maskCredentials(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***@')
}

/**
 * La URL de la base PostgreSQL de pruebas, o `null` si no se declaró.
 *
 * `null` es «no medido», no «falló»: una suite que lo reciba se declara sin
 * correr en vez de pasar en verde sin haber tocado PostgreSQL. Una URL
 * declarada que no es de PostgreSQL sí lanza — eso no es ausencia, es un dato
 * mal escrito, y callarlo ocultaría el error de configuración.
 */
export function resolvePostgresTestUrl(env: Env = process.env): string | null {
  const raw = env[TEST_POSTGRES_URL_VAR]?.trim()
  if (!raw) return null
  if (dialectOf(raw) !== 'postgres') {
    throw new Error(`${TEST_POSTGRES_URL_VAR}='${maskCredentials(raw)}' no es una URL postgres:// ni postgresql://`)
  }
  return raw
}

export type ConnectOptions = {
  /** El esquema que cada conexión del pool tendrá como `search_path` desde su arranque. */
  searchPath?: string
}

export type DisposableSchemaDeps = {
  /** Sustituye la apertura real de la conexión — para probar las ramas sin un servidor. */
  connect?: (url: string, options?: ConnectOptions) => SQL
  /** Sustituye el sufijo aleatorio del nombre del esquema — para hacerlo determinista en pruebas. */
  randomSuffix?: () => string
}

const SCHEMA_PREFIX = 'thyrox_test_'

function defaultRandomSuffix(): string {
  return crypto.randomUUID().replaceAll('-', '')
}

function defaultConnect(url: string, options: ConnectOptions = {}): SQL {
  if (!options.searchPath) return new SQL(url)
  return new SQL({ url, connection: { search_path: options.searchPath } })
}

export type ReachabilityDeps = {
  /** Sustituye la conexión de sondeo — para probar sin un servidor. */
  connect?: (url: string) => SQL
}

const reachabilityCache = new Map<string, Promise<void>>()

/** Limpia la memoización de {@link assertPostgresReachable} — sólo para pruebas. */
export function resetPostgresReachabilityForTests(): void {
  reachabilityCache.clear()
}

async function probeReachability(url: string, connect: (url: string) => SQL): Promise<void> {
  let sql: SQL | undefined
  try {
    sql = connect(url)
    await sql.unsafe('SELECT 1')
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    throw new Error(
      `PostgreSQL de pruebas inalcanzable en ${maskCredentials(url)}: ${cause}. ` +
        'Arráncalo con: pg_ctlcluster 16 main start',
    )
  } finally {
    await sql?.close()
  }
}

/**
 * Comprueba que `url` responde, una sola vez por proceso: la comprobación se
 * memoiza por URL, así que las llamadas siguientes reutilizan el mismo
 * resultado sin volver a conectar — también si la primera falló. Sin esto,
 * cada esquema desechable intentaba conectar por su cuenta y fallaba por
 * separado (medido: 26 + 8 fallos de ~1 ms, cada uno con su propio error de
 * bajo nivel del driver).
 */
export function assertPostgresReachable(url: string, deps: ReachabilityDeps = {}): Promise<void> {
  const cached = reachabilityCache.get(url)
  if (cached) return cached
  const probe = probeReachability(url, deps.connect ?? defaultConnect)
  reachabilityCache.set(url, probe)
  return probe
}

/**
 * Corre `body` contra un esquema de PostgreSQL nuevo, de nombre único. La
 * conexión que recibe `body` tiene ese esquema como `search_path` en todas las
 * conexiones de su pool. El esquema lo crea y lo borra (`DROP SCHEMA …
 * CASCADE`) una conexión aparte, también si `body` lanza.
 */
export async function withDisposableSchema<T>(
  url: string,
  body: (sql: SQL) => Promise<T>,
  deps: DisposableSchemaDeps = {},
): Promise<T> {
  if (dialectOf(url) !== 'postgres') {
    throw new Error(`withDisposableSchema espera una URL postgres://, recibió '${maskCredentials(url)}'`)
  }
  const connect = deps.connect ?? defaultConnect
  await assertPostgresReachable(url, { connect })
  const schema = `${SCHEMA_PREFIX}${(deps.randomSuffix ?? defaultRandomSuffix)()}`
  const admin = connect(url)
  try {
    await admin.unsafe(`CREATE SCHEMA ${schema}`)
    const work = connect(url, { searchPath: schema })
    try {
      return await body(work)
    } finally {
      await work.close()
    }
  } finally {
    await admin.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await admin.close()
  }
}
