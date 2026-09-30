/**
 * La configuración del store de búsqueda semántica: la URL como único
 * contrato de conexión, el esquema de PostgreSQL que aloja el corpus y la
 * forma de cada espacio de embeddings (dimensión y representación). La forma
 * no tiene valor por defecto: depende del modelo, que el store no decide, y
 * se declara al crear cada espacio.
 */
import { dialectOf } from '@thyrox/store/sql.ts'

/** La variable que declara la base del store en uso real. */
export const SEMANTIC_SEARCH_DATABASE_URL_VAR = 'THYROX_SEMANTIC_SEARCH_DATABASE_URL'

/** Representaciones que admite la columna vectorial. */
export const REPRESENTATIONS = ['vector', 'halfvec'] as const
export type Representation = (typeof REPRESENTATIONS)[number]

/** Dónde viven las tablas del corpus y su ledger de migraciones. */
export type SchemaConfig = {
  /** El esquema de PostgreSQL que aloja las tablas del store y su ledger. */
  name: string
}

/** La forma de los vectores de un espacio: la fija el modelo que los produce. */
export type EmbeddingShape = {
  dimensions: number
  representation: Representation
}

/** Estados de un espacio de embeddings: a lo sumo uno `active`. */
export const SPACE_STATES = ['building', 'active', 'retired'] as const
export type SpaceState = (typeof SPACE_STATES)[number]

/**
 * Identificador simple de PostgreSQL, sin comillas: el nombre del esquema se
 * interpola en el DDL, así que sólo se acepta esta forma.
 */
const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/

type Env = Record<string, string | undefined>

/** La configuración no permite abrir el store; nunca se sustituye por otro motor. */
export class SemanticSearchConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SemanticSearchConfigError'
  }
}

/** Un embedding con otra dimensión que la del esquema. */
export class EmbeddingDimensionError extends Error {
  constructor(
    readonly received: number,
    readonly expected: number,
  ) {
    super(`embedding has ${received} dimensions; the schema declares ${expected}`)
    this.name = 'EmbeddingDimensionError'
  }
}

function maskCredentials(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***@')
}

/**
 * La URL del store en uso real. Sin la variable rehúsa: no hay base por
 * defecto, ni local ni en memoria.
 */
export function resolveSemanticSearchDatabaseUrl(env: Env = process.env): string {
  const raw = env[SEMANTIC_SEARCH_DATABASE_URL_VAR]?.trim()
  if (!raw) throw new SemanticSearchConfigError(`${SEMANTIC_SEARCH_DATABASE_URL_VAR} is not set: the semantic search store needs a PostgreSQL URL`)
  return validateStoreUrl(raw)
}

/** Acepta sólo una URL de PostgreSQL; `sqlite:`/`file:` rehúsan en vez de degradar. */
export function validateStoreUrl(url: string): string {
  if (dialectOf(url) !== 'postgres') {
    throw new SemanticSearchConfigError(
      `semantic search store requires a PostgreSQL URL (postgres:// or postgresql://), got '${maskCredentials(url)}'`,
    )
  }
  return url
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/** Valida el nombre del esquema antes de interpolarlo en ningún DDL. */
export function validateSchemaConfig(config: SchemaConfig): SchemaConfig {
  if (!IDENTIFIER_PATTERN.test(config.name)) {
    throw new SemanticSearchConfigError(`invalid schema name '${config.name}': expected a simple identifier matching ${IDENTIFIER_PATTERN}`)
  }
  return config
}

/** Valida la forma de un espacio antes de interpolarla en su DDL. */
export function validateEmbeddingShape(shape: EmbeddingShape): EmbeddingShape {
  if (!isPositiveInteger(shape.dimensions)) {
    throw new SemanticSearchConfigError(`invalid dimensions ${shape.dimensions}: expected a positive integer`)
  }
  if (!(REPRESENTATIONS as readonly string[]).includes(shape.representation)) {
    throw new SemanticSearchConfigError(`invalid representation '${shape.representation}': expected one of ${REPRESENTATIONS.join(', ')}`)
  }
  return shape
}

/** Rechaza un embedding de otra dimensión, o con un componente no finito. */
export function validateEmbedding(embedding: readonly number[], dimensions: number): void {
  if (embedding.length !== dimensions) throw new EmbeddingDimensionError(embedding.length, dimensions)
  if (!embedding.every(Number.isFinite)) throw new SemanticSearchConfigError('embedding components must be finite numbers')
}
