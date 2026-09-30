/**
 * El SQL vectorial del store: la tabla de cada espacio de embeddings con su
 * índice HNSW sobre la cuantización binaria, y las consultas que la cruzan con
 * el corpus. Es el único sitio del árbol que escribe SQL de pgvector.
 *
 * Todo objeto de la extensión se califica con el esquema donde vive
 * (`<ext>.vector`, `OPERATOR(<ext>.<~>)`, `<ext>.bit_hamming_ops`): la
 * conexión sólo lleva el esquema del store en su `search_path`, y la
 * extensión puede estar habilitada en cualquier otro —en un servicio
 * gestionado no tiene por qué ser `public`—.
 *
 * El nombre de la tabla se deriva del `space_id`, un entero de identidad: la
 * única parte interpolada que no es texto fijo ni una forma ya validada.
 */
import type { EmbeddingShape } from './config.ts'
import { SEARCHABLE_CHUNK_CONDITION } from './corpusSql.ts'

export function spaceTableName(spaceId: number): string {
  if (!Number.isInteger(spaceId) || spaceId <= 0) throw new RangeError(`invalid space id ${spaceId}: expected a positive integer`)
  return `space_embeddings_${spaceId}`
}

export function spaceIndexName(spaceId: number): string {
  return `${spaceTableName(spaceId)}_binary_hnsw`
}

/** El tipo de la columna vectorial, calificado con el esquema de la extensión. */
export function vectorType(extensionSchema: string, shape: EmbeddingShape): string {
  return `${extensionSchema}.${shape.representation}(${shape.dimensions})`
}

/** La cuantización binaria de una expresión vectorial, idéntica en el índice y en la consulta. */
function binaryQuantized(extensionSchema: string, expression: string, shape: EmbeddingShape): string {
  return `(${extensionSchema}.binary_quantize(${expression})::bit(${shape.dimensions}))`
}

/** El DDL de la tabla del espacio y de su índice HNSW sobre la cuantización binaria. */
export function createSpaceTableStatements(extensionSchema: string, spaceId: number, shape: EmbeddingShape): string[] {
  const table = spaceTableName(spaceId)
  return [
    `CREATE TABLE ${table} (
       chunk_id UUID PRIMARY KEY REFERENCES document_chunks (chunk_id),
       embedding ${vectorType(extensionSchema, shape)} NOT NULL
     )`,
    `CREATE INDEX ${spaceIndexName(spaceId)} ON ${table}
       USING hnsw (${binaryQuantized(extensionSchema, 'embedding', shape)} ${extensionSchema}.bit_hamming_ops)`,
  ]
}

export function dropSpaceTableStatement(spaceId: number): string {
  return `DROP TABLE ${spaceTableName(spaceId)}`
}

/** Inserta o reemplaza el vector de un chunk: `$1` chunk, `$2` vector como texto. */
export function putEmbeddingQuery(extensionSchema: string, spaceId: number, shape: EmbeddingShape): string {
  return `INSERT INTO ${spaceTableName(spaceId)} (chunk_id, embedding) VALUES ($1, $2::${vectorType(extensionSchema, shape)})
          ON CONFLICT (chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding`
}

/** Los chunks vigentes sin vector en el espacio, en orden estable: `$1` límite. */
export function chunksWithoutEmbeddingQuery(spaceId: number): string {
  return `SELECT c.chunk_id, c.document_id, c.version, c.position, c.text
            FROM document_chunks c
            JOIN documents d ON d.document_id = c.document_id AND ${SEARCHABLE_CHUNK_CONDITION}
            LEFT JOIN ${spaceTableName(spaceId)} e ON e.chunk_id = c.chunk_id
           WHERE e.chunk_id IS NULL
           ORDER BY c.document_id, c.version, c.position
           LIMIT $1`
}

/**
 * El filtro de chunk buscable como subconsulta escalar correlacionada sobre
 * el alias `e`. Un `EXISTS` o un `JOIN` los aplana el planificador en un join
 * y ordena después (medido con `EXPLAIN`: sin rastro del HNSW); la subconsulta
 * escalar queda como `Filter: SubPlan` del recorrido por el índice.
 *
 * pendiente: el HNSW filtrado puede cortar en `ef_search` candidatos antes de
 * filtrar y dejar fuera versiones vigentes; con pgvector 0.8.6, 46 filas y
 * `ef_search` 5 o 40 no se reprodujo (el grafo se recorrió entero), así que
 * `hnsw.iterative_scan` no se activa sin un caso que lo exija.
 */
const SEARCHABLE_CHUNK_FILTER = `(SELECT ${SEARCHABLE_CHUNK_CONDITION} FROM document_chunks c
                                JOIN documents d ON d.document_id = c.document_id
                               WHERE c.chunk_id = e.chunk_id)`

/**
 * Los candidatos vigentes más cercanos por distancia de Hamming entre
 * cuantizaciones binarias, ordenados por la misma expresión que indexa el
 * HNSW para que el planificador pueda usarlo: `$1` consulta como texto, `$2`
 * límite. Devuelven el texto del chunk, su identidad y su procedencia: la búsqueda
 * no vuelve a ninguna fuente.
 */
export function binaryCandidatesQuery(extensionSchema: string, spaceId: number, shape: EmbeddingShape): string {
  const query = binaryQuantized(extensionSchema, `$1::${vectorType(extensionSchema, shape)}`, shape)
  const distance = `${binaryQuantized(extensionSchema, 'e.embedding', shape)} OPERATOR(${extensionSchema}.<~>) ${query}`
  return `SELECT n.chunk_id, n.embedding, c.text, c.document_id, c.version, d.domain, d.domain_id, d.source_ref, d.source_revision, n.hamming_distance
            FROM (SELECT e.chunk_id, e.embedding::text AS embedding, ${distance} AS hamming_distance
                    FROM ${spaceTableName(spaceId)} e
                   WHERE ${SEARCHABLE_CHUNK_FILTER}
                   ORDER BY ${distance}
                   LIMIT $2) AS n
            JOIN document_chunks c ON c.chunk_id = n.chunk_id
            JOIN documents d ON d.document_id = c.document_id
           ORDER BY n.hamming_distance`
}
