/**
 * Entrada del trabajo de verificación (`podmanJobVerifier.ts`): corre DENTRO
 * del contenedor, sin credencial, y deja su veredicto en `--report`.
 *
 * Salida: 0 verificado; 1 no verificado (la causa va en el reporte);
 * 2 argumentos inválidos, sin reporte.
 */
import { statfsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { verifyPublishedArtifact } from '../artifactVerifier.js'
import { createOciArtifactRegistry } from '../ociArtifactRegistry.js'

const REQUIRED = ['registry', 'repository', 'tag', 'digest', 'work-dir', 'report'] as const

const { values } = parseArgs({ options: Object.fromEntries(REQUIRED.map(name => [name, { type: 'string' }])) as Record<(typeof REQUIRED)[number], { type: 'string' }> })
const missing = REQUIRED.filter(name => !values[name])
if (missing.length > 0) {
  process.stderr.write(`verifyArtifact: faltan ${missing.map(name => `--${name}`).join(', ')}\n`)
  process.exit(2)
}
const option = (name: (typeof REQUIRED)[number]): string => values[name] as string

const workDir = option('work-dir')
await mkdir(workDir, { recursive: true })
const freeBytes = (): number => {
  const stats = statfsSync(workDir)
  return stats.bavail * stats.bsize
}
const consumer = createOciArtifactRegistry({ baseUrl: option('registry'), credential: { kind: 'anonymous' } })
const outcome = await verifyPublishedArtifact(
  { consumer, verifyDir: workDir, freeBytes },
  { repository: option('repository'), digest: option('digest') },
  { repository: option('repository'), tag: option('tag') },
)
await mkdir(dirname(option('report')), { recursive: true })
await writeFile(option('report'), JSON.stringify(outcome, null, 2))
process.stderr.write(`verifyArtifact: ${outcome.status}\n`)
process.exit(outcome.status === 'verified' ? 0 : 1)
