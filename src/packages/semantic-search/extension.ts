/**
 * La comprobación de pgvector que precede a toda migración y consulta del
 * store. El store NO administra la extensión —no ejecuta `CREATE EXTENSION`—:
 * detecta su estado y distingue tres condiciones con errores propios, sin
 * prescribir un remedio, porque quién la habilita y cómo depende de la
 * instalación o del servicio gestionado.
 */
import type { SQL } from 'bun'

/**
 * La versión mínima de pgvector que el store exige. Es 0.7.0 porque es la
 * primera que trae las tres capacidades que el store usa: el tipo `halfvec`,
 * la función `binary_quantize` y la clase de operadores HNSW
 * `bit_hamming_ops`. Medido en el paquete instalado: las tres aparecen por
 * primera vez en `vector--0.6.2--0.7.0.sql`. No se iguala a la instalada
 * (0.8.6 en la base de pruebas): subirla sin una capacidad nueva que la exija
 * rechazaría servidores válidos.
 */
export const MINIMUM_PGVECTOR_VERSION = '0.7.0'

const EXTENSION_NAME = 'vector'

/** Lo que el servidor y la base declaran sobre pgvector, leído sin interpretar. */
export type VectorExtensionState = {
  /** La versión por defecto que el servidor ofrece, o `null` si no la ofrece. */
  availableVersion: string | null
  /** La extensión habilitada en la base, o `null` si no lo está. */
  installed: { version: string; schema: string } | null
}

/** La extensión utilizable: su versión efectiva y el esquema donde viven sus objetos. */
export type UsableVectorExtension = { version: string; schema: string }

/** La lectura del estado de pgvector; se sustituye en pruebas por un doble. */
export type VectorExtensionProbe = (sql: SQL) => Promise<VectorExtensionState>

/** pgvector no está disponible en el servidor: falta en la infraestructura. */
export class VectorExtensionUnavailableError extends Error {
  readonly code = 'pgvector-unavailable'

  constructor() {
    super(`PostgreSQL server does not offer the '${EXTENSION_NAME}' extension (pg_available_extensions): infrastructure without pgvector`)
    this.name = 'VectorExtensionUnavailableError'
  }
}

/** pgvector está disponible en el servidor pero no habilitada en esta base. */
export class VectorExtensionNotEnabledError extends Error {
  readonly code = 'pgvector-not-enabled'

  constructor(readonly availableVersion: string) {
    super(
      `extension '${EXTENSION_NAME}' ${availableVersion} is available on the server but not enabled in this database (pg_extension): ` +
        'the database needs provisioning; this store does not enable extensions',
    )
    this.name = 'VectorExtensionNotEnabledError'
  }
}

/** pgvector está habilitada con una versión menor que la mínima. */
export class VectorExtensionVersionError extends Error {
  readonly code = 'pgvector-version'

  constructor(
    readonly found: string,
    readonly required: string,
  ) {
    super(`extension '${EXTENSION_NAME}' is enabled at version ${found}; this store requires ${required} or newer`)
    this.name = 'VectorExtensionVersionError'
  }
}

function versionSegments(version: string): number[] {
  const segments = version.split('.')
  const allNumeric = segments.every(segment => /^\d+$/.test(segment))
  if (!allNumeric) throw new Error(`unreadable extension version '${version}': expected dot-separated integers`)
  return segments.map(Number)
}

/** Compara dos versiones por segmento numérico; un segmento ausente cuenta como 0. */
export function compareVersions(left: string, right: string): number {
  const leftSegments = versionSegments(left)
  const rightSegments = versionSegments(right)
  const length = Math.max(leftSegments.length, rightSegments.length)
  for (let index = 0; index < length; index++) {
    const difference = (leftSegments[index] ?? 0) - (rightSegments[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

/**
 * Decide, en el orden fijo —disponible en el servidor, habilitada en la base,
 * versión efectiva—, si pgvector es utilizable, y lanza el error de la
 * primera condición que falla.
 */
export function assertVectorExtensionUsable(state: VectorExtensionState): UsableVectorExtension {
  if (state.availableVersion === null && state.installed === null) throw new VectorExtensionUnavailableError()
  if (state.installed === null) throw new VectorExtensionNotEnabledError(state.availableVersion ?? 'unknown')
  const isTooOld = compareVersions(state.installed.version, MINIMUM_PGVECTOR_VERSION) < 0
  if (isTooOld) throw new VectorExtensionVersionError(state.installed.version, MINIMUM_PGVECTOR_VERSION)
  return state.installed
}

/** Lee el estado de pgvector de los catálogos del servidor y de la base. */
export async function readVectorExtensionState(sql: SQL): Promise<VectorExtensionState> {
  const [available] = (await sql.unsafe('SELECT default_version FROM pg_available_extensions WHERE name = $1', [EXTENSION_NAME])) as {
    default_version: string
  }[]
  const [installed] = (await sql.unsafe(
    'SELECT e.extversion AS version, n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = $1',
    [EXTENSION_NAME],
  )) as { version: string; schema: string }[]
  return { availableVersion: available?.default_version ?? null, installed: installed ?? null }
}
