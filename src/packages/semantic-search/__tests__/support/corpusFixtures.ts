/**
 * Fixtures compartidas por las suites de PostgreSQL del corpus: el esquema de
 * usar y tirar con su store abierto por URL, un embedder determinista que
 * deriva el vector del texto (sin modelo) y el ciclo de embeber lo que falta
 * en un espacio leyendo sólo los chunks persistidos.
 */
import type { SQL } from 'bun'

import { withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import { type CorpusPolicy, INITIAL_CORPUS_POLICY } from '../../corpusPolicy.ts'
import { openSemanticSearchStore, type SemanticSearchStore } from '../../store.ts'

/** Suficiente para vaciar los chunks pendientes de los corpus de prueba en una sola llamada. */
const PENDING_BATCH = 1000
/** Primo con que se reparte cada carácter entre componentes y signos. */
const SPREAD_PRIME = 31
/** Módulo que centra cada componente alrededor de cero, para que la cuantización binaria no sea constante. */
const COMPONENT_MODULUS = 17
const COMPONENT_CENTER = 8

export async function currentSchema(sql: SQL): Promise<string> {
  const [row] = (await sql.unsafe('SELECT current_schema() AS name')) as { name: string }[]
  if (!row) throw new Error('current_schema() returned no row')
  return row.name
}

/** El dominio privado de las suites: su contenido sólo lo encuentra su dueño. */
export const PRIVATE_TEST_DOMAIN = 'workspace-note'

/** La política inicial más los dominios con que las suites ingieren. */
export const TEST_CORPUS_POLICY: CorpusPolicy = {
  domains: [
    ...INITIAL_CORPUS_POLICY.domains,
    ...['note', 'notes', 'known', 's'].map(domain => ({ domain, visibility: 'shared' as const })),
    { domain: PRIVATE_TEST_DOMAIN, visibility: 'private' },
  ],
}

export function openStoreFor(url: string, schema: string): SemanticSearchStore {
  return openSemanticSearchStore({ url, schema: { name: schema }, corpusPolicy: TEST_CORPUS_POLICY })
}

/** Corre `body` con un store migrado sobre un esquema desechable; lo cierra al salir. */
export async function withCorpusStore(
  url: string,
  body: (store: SemanticSearchStore, sql: SQL, schema: string) => Promise<void>,
): Promise<void> {
  await withDisposableSchema(url, async sql => {
    const schema = await currentSchema(sql)
    const store = openStoreFor(url, schema)
    try {
      await store.migrate()
      await body(store, sql, schema)
    } finally {
      await store.close()
    }
  })
}

/** Vector determinista de `dimensions` componentes derivado sólo del texto. */
export function embedText(text: string, dimensions: number): number[] {
  const vector = Array.from({ length: dimensions }, () => 0)
  for (let index = 0; index < text.length; index++) {
    const slot = index % dimensions
    vector[slot] = ((vector[slot] ?? 0) + text.charCodeAt(index) * (index + SPREAD_PRIME)) % COMPONENT_MODULUS
  }
  return vector.map(value => value - COMPONENT_CENTER + 0.5)
}

/** Embebe en el espacio todo chunk vigente que aún no tiene vector; devuelve cuántos embebió. */
export async function embedPending(store: SemanticSearchStore, spaceId: number, dimensions: number): Promise<number> {
  const pending = await store.chunksWithoutEmbedding(spaceId, PENDING_BATCH)
  await store.putEmbeddings(
    spaceId,
    pending.map(chunk => ({ chunkId: chunk.chunkId, embedding: embedText(chunk.text, dimensions) })),
  )
  return pending.length
}

export async function countRows(sql: SQL, table: string): Promise<number> {
  const [row] = (await sql.unsafe(`SELECT count(*)::int AS n FROM ${table}`)) as { n: number }[]
  return row?.n ?? 0
}
