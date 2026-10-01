/**
 * `local-models-catalog declare <nombre-ollama>` y `local-models-catalog list
 * [--json]`: el catálogo de modelos locales de la instalación
 * (`localModelHome`). Salidas: 0 hecho · 2 rehusado, con la causa y la ruta.
 */

import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'

import { EXIT_OK, EXIT_REFUSED, type CommandOutput } from './commandOutput.js'
import { declareInstalledModel } from './declareInstalledModel.js'
import { managedOllama, type Environment } from './managedOllama.js'
import { OllamaApi } from './ollamaApi.js'
import { volumeMountpoint } from './volumeBlobs.js'

export const CATALOG_USAGE = [
  'uso: local-models-catalog declare <nombre-ollama>',
  '     local-models-catalog list [--json]',
].join('\n')

export interface CommandContext {
  readonly env: Environment
  readonly thyroxRoot: string
  readonly output: CommandOutput
  readonly now: () => Date
}

export async function runCatalogCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  const [subcommand, ...rest] = argv
  try {
    if (subcommand === 'declare' && rest.length === 1) return await declare(rest[0] as string, context)
    if (subcommand === 'list') return await list(rest.includes('--json'), context)
  } catch (error) {
    context.output.stderr(`local-models-catalog: ${(error as Error).message}`)
    return EXIT_REFUSED
  }
  context.output.stderr(CATALOG_USAGE)
  return EXIT_REFUSED
}

async function declare(ollamaName: string, context: CommandContext): Promise<number> {
  const ollama = managedOllama(context.env)
  const entry = await declareInstalledModel(ollamaName, {
    api: new OllamaApi(ollama.baseUrl),
    mountpoint: await volumeMountpoint(ollama.podmanBin, ollama.volume),
    catalogPath: catalogPath(context),
    now: context.now,
  })
  context.output.stdout(`declarado: ${entry.name} (${entry.artifact.bytes} bytes, sha256 ${entry.artifact.sha256})`)
  return EXIT_OK
}

async function list(asJson: boolean, context: CommandContext): Promise<number> {
  const entries = (await loadModelCatalog(catalogPath(context))).entries()
  if (asJson) context.output.stdout(JSON.stringify({ entries }))
  else entries.forEach(entry => context.output.stdout(`${entry.name}\t${entry.capabilities.join(',')}\tctx ${entry.maxContextLength}`))
  return EXIT_OK
}

function catalogPath(context: CommandContext): string {
  return localModelHome(context.env, context.thyroxRoot).catalog
}
