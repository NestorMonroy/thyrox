/**
 * Entrada del trabajo de descarga de una capa (`podmanArtifactFetcher.ts` de
 * `@thyrox/local-models`): corre DENTRO del contenedor, sin credencial, baja
 * sólo `--layer-digest` del manifest fijado a `--destination` y deja el
 * resultado del puerto en `--report`.
 *
 * Salida: 0 capa bajada y verificada; 1 fallo del puerto (la causa va en el
 * reporte); 2 argumentos inválidos, sin reporte.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'

const REQUIRED = ['registry', 'repository', 'manifest-digest', 'layer-digest', 'destination', 'report'] as const
const EXIT_FETCHED = 0
const EXIT_PORT_FAILURE = 1
const EXIT_INVALID_ARGUMENTS = 2

const { values } = parseArgs({ options: Object.fromEntries(REQUIRED.map(name => [name, { type: 'string' }])) as Record<(typeof REQUIRED)[number], { type: 'string' }> })
const missing = REQUIRED.filter(name => !values[name])
if (missing.length > 0) {
  process.stderr.write(`fetchLayer: faltan ${missing.map(name => `--${name}`).join(', ')}\n`)
  process.exit(EXIT_INVALID_ARGUMENTS)
}
const option = (name: (typeof REQUIRED)[number]): string => values[name] as string

const consumer = createOciArtifactRegistry({ baseUrl: option('registry'), credential: { kind: 'anonymous' } })
const result = await consumer.pullLayer(
  { repository: option('repository'), digest: option('manifest-digest') },
  option('layer-digest'),
  option('destination'),
)
await mkdir(dirname(option('report')), { recursive: true })
await writeFile(option('report'), JSON.stringify(result, null, 2))
process.stderr.write(`fetchLayer: ${result.status}\n`)
process.exit(result.status === 'success' ? EXIT_FETCHED : EXIT_PORT_FAILURE)
