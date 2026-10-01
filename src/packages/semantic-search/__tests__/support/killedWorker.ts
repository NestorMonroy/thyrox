/**
 * Un worker de ingesta que nunca cierra su store: ingiere los archivos del
 * directorio, crea y activa un espacio, avisa por stdout y se queda vivo
 * hasta que quien lo lanzó lo mata. Lo usa la invariante «borrar el worker
 * no borra el corpus», que exige una muerte sin `close()`.
 *
 * Argumentos: `<url> <schema> <directorio>`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { embedPending, openStoreFor } from './corpusFixtures.ts'

export const WORKER_READY_PREFIX = 'ready '
const DOMAIN = 'note'
const SHAPE = { model: 'model-a', dimensions: 4, representation: 'vector' as const }

async function main(): Promise<void> {
  const [url, schema, directory] = process.argv.slice(2)
  if (url === undefined || schema === undefined || directory === undefined) {
    throw new Error('uso: killedWorker <url> <schema> <directorio>')
  }
  const store = openStoreFor(url, schema)
  await store.migrate()
  for (const name of readdirSync(directory).sort()) {
    const chunks = readFileSync(join(directory, name), 'utf8').split('\n')
    await store.ingestDocument({ domain: DOMAIN, domainId: name, sourceRef: `tmp:${name}`, sourceRevision: null, metadata: { name }, chunks })
  }
  const space = await store.createEmbeddingSpace(SHAPE)
  await embedPending(store, space.spaceId, SHAPE.dimensions)
  await store.activateSpace(space.spaceId)
  process.stdout.write(`${WORKER_READY_PREFIX}${space.spaceId}\n`)
  await new Promise(() => {})
}

if (import.meta.main) await main()
