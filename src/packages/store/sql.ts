/**
 * El dialecto de base de datos y la apertura de una conexión por URL, para
 * cualquier store de thyrox. `Bun.SQL` da la misma API a varios motores; lo
 * que cambia entre ellos —los tipos que van y vuelven, si acepta cargar
 * extensiones— se declara aquí una sola vez, en lugar de en cada consumidor.
 */
import { SQL } from 'bun'

/**
 * Motores admitidos hoy. `sqlite:`/`file:` y `postgres:`/`postgresql:` abren;
 * `mysql:`/`mariadb:` están declarados en la URL pero su soporte llega en una
 * fase posterior (D7), así que se rechazan nombrándolos en vez de como un
 * esquema desconocido.
 */
export const DIALECTS = ['sqlite', 'postgres'] as const
export type Dialect = (typeof DIALECTS)[number]

const DECLARED_PENDING = ['mysql', 'mariadb'] as const

function schemeOf(url: string): string | undefined {
  return /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase()
}

/** Enmascara las credenciales de una URL de conexión antes de que viajen a un mensaje. */
function maskCredentials(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***@')
}

/** El motor que nombra una URL de base de datos, o `null` si no es uno admitido. */
export function dialectOf(url: string): Dialect | null {
  const scheme = schemeOf(url)
  if (scheme === 'sqlite' || scheme === 'file') return 'sqlite'
  if (scheme === 'postgres' || scheme === 'postgresql') return 'postgres'
  return null
}

export function jsonParam(dialect: Dialect, value: unknown): unknown {
  return dialect === 'postgres' ? value : JSON.stringify(value)
}

export function readJson(value: unknown): Record<string, unknown> {
  return (typeof value === 'string' ? JSON.parse(value) : value) as Record<string, unknown>
}

export function readTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

export function readId(value: unknown): number {
  return Number(value)
}

/** Lo que el motor de una URL permite abrir, más allá de su dialecto. */
export type StoreCapabilities = { dialect: Dialect; extensionsLoadable: boolean }

/**
 * Abre la conexión que la URL declara: motor, dialecto y capacidades, en un
 * solo sitio. `sqlite:` no puede cargar extensiones (H-THYROX-238: `Bun.SQL`
 * no expone `loadExtension` sobre ese motor, al revés que `bun:sqlite`);
 * `postgres:` sí.
 */
export function openByUrl(url: string): { sql: SQL; dialect: Dialect; capabilities: StoreCapabilities } {
  const masked = maskCredentials(url)
  const scheme = schemeOf(url)
  if (scheme && (DECLARED_PENDING as readonly string[]).includes(scheme)) {
    throw new Error(`database URL '${masked}' declares engine '${scheme}', not yet supported (phase D7)`)
  }
  const dialect = dialectOf(url)
  if (!dialect) throw new Error(`unsupported database URL '${masked}': expected sqlite:// or postgres://`)
  return { sql: new SQL(url), dialect, capabilities: { dialect, extensionsLoadable: dialect === 'postgres' } }
}
