/**
 * `local-models-catalog declare <nombre-ollama> [--revision <commit>]` y
 * `local-models-catalog list [--json]`: el catálogo de modelos locales de la
 * instalación (`localModelHome`). `--revision` da el commit completo de
 * Hugging Face que un nombre contractual de fuente `hf` sólo lleva en 12
 * caracteres. Salidas: 0 hecho · 2 rehusado, con la causa y la ruta.
 */

import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'

import { EXIT_OK, EXIT_REFUSED, type CommandOutput } from './commandOutput.js'
import { declareInstalledModel, type DeclarationOptions } from './declareInstalledModel.js'
import { managedOllama, type Environment } from './managedOllama.js'
import { OllamaApi } from './ollamaApi.js'
import { infrastructureEnsureCommand, OLLAMA_CONTAINER, requireInfrastructure, type InfrastructureEnsure } from './infrastructureReadiness.js'
import { volumeMountpoint } from './volumeBlobs.js'

export const CATALOG_USAGE = [
  'uso: local-models-catalog declare <nombre-ollama> [--revision <commit>]',
  '     local-models-catalog list [--json]',
].join('\n')

export interface CommandContext {
  readonly env: Environment
  readonly thyroxRoot: string
  readonly output: CommandOutput
  readonly now: () => Date
  /** Reconciliación de la infraestructura antes de usarla; sin declarar, `bin/infrastructure_ensure` del árbol. */
  readonly ensureInfrastructure?: InfrastructureEnsure
}

/** El ensure del contexto, o el del árbol de thyrox. */
export function infrastructureEnsureOf(context: CommandContext): InfrastructureEnsure {
  return context.ensureInfrastructure ?? infrastructureEnsureCommand(context.thyroxRoot)
}

interface DeclareArguments {
  readonly ollamaName: string
  readonly options: DeclarationOptions
}

const REVISION_FLAG = '--revision'

export async function runCatalogCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  const [subcommand, ...rest] = argv
  try {
    const declaration = subcommand === 'declare' ? parseDeclareArguments(rest) : undefined
    if (declaration !== undefined) return await declare(declaration, context)
    if (subcommand === 'list') return await list(rest.includes('--json'), context)
  } catch (error) {
    context.output.stderr(`local-models-catalog: ${(error as Error).message}`)
    return EXIT_REFUSED
  }
  context.output.stderr(CATALOG_USAGE)
  return EXIT_REFUSED
}

/** `<nombre>` o `<nombre> --revision <commit>`; cualquier otra forma no es una declaración. */
function parseDeclareArguments(argv: readonly string[]): DeclareArguments | undefined {
  const [ollamaName, flag, revision, ...extra] = argv
  if (ollamaName === undefined || ollamaName.startsWith('-') || extra.length > 0) return undefined
  if (flag === undefined) return { ollamaName, options: {} }
  if (flag !== REVISION_FLAG || revision === undefined) return undefined
  return { ollamaName, options: { revision } }
}

async function declare(declaration: DeclareArguments, context: CommandContext): Promise<number> {
  await requireInfrastructure([OLLAMA_CONTAINER], infrastructureEnsureOf(context))
  const ollama = managedOllama(context.env)
  const entry = await declareInstalledModel(declaration.ollamaName, {
    api: new OllamaApi(ollama.baseUrl),
    mountpoint: await volumeMountpoint(ollama.podmanBin, ollama.volume),
    catalogPath: catalogPath(context),
    now: context.now,
  }, declaration.options)
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
