/**
 * Entrada del trabajo de instalación (`ollamaModelInstaller.ts`): corre
 * DENTRO del contenedor, sin credencial, y deja `{status, reason?}` en
 * `--report`. Sólo importa por ruta relativa (ver `ollamaApi.ts`).
 *
 * Salida: 0 instalado; 1 fallido (la causa va en el reporte);
 * 2 argumentos inválidos, sin reporte.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { OllamaApi, installModelIntoOllama } from '../ollamaApi.js'

const REQUIRED = ['ollama-url', 'name', 'artifact', 'sha256', 'report'] as const
const EXIT_INSTALLED = 0
const EXIT_FAILED = 1
const EXIT_USAGE = 2

const { values } = parseArgs({ options: Object.fromEntries(REQUIRED.map(name => [name, { type: 'string' }])) as Record<(typeof REQUIRED)[number], { type: 'string' }> })
const missing = REQUIRED.filter(name => !values[name])
if (missing.length > 0) {
  process.stderr.write(`installModel: faltan ${missing.map(name => `--${name}`).join(', ')}\n`)
  process.exit(EXIT_USAGE)
}
const option = (name: (typeof REQUIRED)[number]): string => values[name] as string

const outcome = await installModelIntoOllama(new OllamaApi(option('ollama-url')), {
  name: option('name'),
  artifactPath: option('artifact'),
  contentSha256: option('sha256'),
})
await mkdir(dirname(option('report')), { recursive: true })
await writeFile(option('report'), JSON.stringify(outcome, null, 2))
process.stderr.write(`installModel: ${outcome.status}\n`)
process.exit(outcome.status === 'installed' ? EXIT_INSTALLED : EXIT_FAILED)
