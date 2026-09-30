/**
 * El SQL vectorial del store: el DDL de su única migración y las consultas.
 * Es el único sitio del árbol que escribe SQL de pgvector.
 *
 * Todo objeto de la extensión se califica con el esquema donde vive
 * (`<ext>.vector`, `OPERATOR(<ext>.<~>)`, `<ext>.bit_hamming_ops`): la
 * conexión sólo lleva el esquema del store en su `search_path`, y la
 * extensión puede estar habilitada en cualquier otro —en un servicio
 * gestionado no tiene por qué ser `public`—.
 */
import type { SchemaConfig } from './config.ts'

export const EMBEDDINGS_TABLE = 'semantic_embeddings'
export const MIGRATIONS_TABLE = 'semantic_search_migrations'
export const BINARY_INDEX_NAME = 'semantic_embeddings_binary_hnsw'

/** El tipo de la columna vectorial, calificado con el esquema de la extensión. */
export function vectorType(extensionSchema: string, config: SchemaConfig): string {
  return `${extensionSchema}.${config.representation}(${config.dimensions})`
}

/** La cuantización binaria de una expresión vectorial, idéntica en el índice y en la consulta. */
function binaryQuantized(extensionSchema: string, expression: string, config: SchemaConfig): string {
  return `(${extensionSchema}.binary_quantize(${expression})::bit(${config.dimensions}))`
}

/** La expresión de la consulta, recibida como literal de texto en `$1`. */
function queryVector(extensionSchema: string, config: SchemaConfig): string {
  return `$1::${vectorType(extensionSchema, config)}`
}

/**
 * El nombre de la migración lleva la forma del embedding: abrir un esquema ya
 * migrado con otra dimensión o representación choca con la procedencia del
 * ledger en vez de alterar la tabla en silencio.
 */
export function migrationName(config: SchemaConfig): string {
  return `create_embeddings_${config.representation}(${config.dimensions})`
}

/** El DDL de la tabla de embeddings y de su índice HNSW sobre la cuantización binaria. */
export function createEmbeddingsStatements(extensionSchema: string, config: SchemaConfig): string[] {
  return [
    `CREATE TABLE ${EMBEDDINGS_TABLE} (
       id TEXT PRIMARY KEY,
       embedding ${vectorType(extensionSchema, config)} NOT NULL,
       metadata JSONB NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX ${BINARY_INDEX_NAME} ON ${EMBEDDINGS_TABLE}
       USING hnsw (${binaryQuantized(extensionSchema, 'embedding', config)} ${extensionSchema}.bit_hamming_ops)`,
  ]
}

/** Inserta o reemplaza un embedding: `$1` id, `$2` vector como texto, `$3` metadata como JSON. */
export function upsertQuery(extensionSchema: string, config: SchemaConfig): string {
  return `INSERT INTO ${EMBEDDINGS_TABLE} (id, embedding, metadata, updated_at)
          VALUES ($1, $2::${vectorType(extensionSchema, config)}, $3::jsonb, now())
          ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata, updated_at = now()`
}

/** Lee un embedding por id: `$1` id. El vector vuelve como texto `[a,b,…]`. */
export function getEmbeddingQuery(): string {
  return `SELECT id, embedding::text AS embedding, metadata FROM ${EMBEDDINGS_TABLE} WHERE id = $1`
}

/**
 * Los candidatos más cercanos por distancia de Hamming entre cuantizaciones
 * binarias, ordenados por la misma expresión que indexa el HNSW para que el
 * planificador pueda usarlo: `$1` consulta como texto, `$2` límite.
 */
export function binaryCandidatesQuery(extensionSchema: string, config: SchemaConfig): string {
  const distance = `${binaryQuantized(extensionSchema, 'embedding', config)} OPERATOR(${extensionSchema}.<~>) ${binaryQuantized(extensionSchema, queryVector(extensionSchema, config), config)}`
  return `SELECT id, embedding::text AS embedding, metadata, ${distance} AS hamming_distance
            FROM ${EMBEDDINGS_TABLE}
           ORDER BY ${distance}
           LIMIT $2`
}
