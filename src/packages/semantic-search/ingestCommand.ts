/**
 * `semantic-search-ingest <dominio> --root <dir> [--source-label <nombre>]`
 * (ADR-008 D5, TASK-THYROX-0684): ingiere en el store semántico los
 * documentos del dominio que reconoce bajo una raíz nombrada. El recorrido es
 * siempre deliberado: sin `--root` se rehúsa.
 *
 * La procedencia sale del árbol: el nombre del repositorio (la raíz de git
 * que contiene a `--root`, o `--source-label`) y su commit `HEAD`; fuera de
 * git la revisión queda vacía. La ruta local nunca entra en la identidad.
 *
 * Publica el conteo con lo que quedó sin reconocer, nombrado por stderr: un
 * archivo con nombre de documento que no dio texto no se da por preservado.
 *
 * Salidas: 0 ingerido · 2 rehusado sin ingerir.
 */
import { spawnSync } from 'node:child_process'
import { basename, resolve } from 'node:path'

import { resolveSemanticSearchDatabaseUrl } from './config.ts'
import { FINDING_DOMAIN, ingestFindings, recognizeFindings, type IngestionSource } from './findingIngestion.ts'
import { openSemanticSearchStore } from './store.ts'

export const SEMANTIC_SEARCH_SCHEMA_VAR = 'THYROX_SEMANTIC_SEARCH_SCHEMA'
export const DEFAULT_SEMANTIC_SEARCH_SCHEMA = 'semantic_search'
export const INGEST_EXIT_OK = 0
export const INGEST_EXIT_REFUSED = 2

export const INGEST_USAGE = 'uso: semantic-search-ingest finding --root <dir> [--source-label <nombre>]'

export type IngestCommandContext = {
  env: Readonly<Record<string, string | undefined>>
  output: { stdout(line: string): void; stderr(line: string): void }
}

type IngestArguments = { domain: string; root: string; sourceLabel: string | undefined }

class IngestRefusal extends Error {}

const ROOT_FLAG = '--root'
const SOURCE_LABEL_FLAG = '--source-label'
const SUPPORTED_DOMAINS = [FINDING_DOMAIN]

export async function runIngestCommand(argv: readonly string[], context: IngestCommandContext): Promise<number> {
  try {
    const args = parseArguments(argv)
    const url = resolveSemanticSearchDatabaseUrl(context.env)
    return await ingest(args, url, schemaOf(context.env), context)
  } catch (error) {
    const message = error instanceof IngestRefusal ? `${error.message}\n${INGEST_USAGE}` : error instanceof Error ? error.message : String(error)
    context.output.stderr(`semantic-search-ingest: ${message}`)
    return INGEST_EXIT_REFUSED
  }
}

async function ingest(args: IngestArguments, url: string, schema: string, context: IngestCommandContext): Promise<number> {
  const source = sourceOf(args)
  const { recognized, unrecognized } = recognizeFindings(args.root, source)
  const store = openSemanticSearchStore({ url, schema: { name: schema } })
  try {
    await store.migrate()
    const summary = await ingestFindings(store, recognized)
    for (const path of unrecognized) context.output.stderr(`sin reconocer: ${path}`)
    context.output.stdout(`${args.domain}: ${recognized.length} reconocido(s) · ${summary.created} creado(s) · ${summary.newVersion} versión(es) nueva(s) · ${summary.unchanged} sin cambios · ${unrecognized.length} sin reconocer (alcance medido: ${args.root}, fuente ${source.label}@${source.revision ?? 'sin-git'})`)
    return INGEST_EXIT_OK
  } finally {
    await store.close()
  }
}

function parseArguments(argv: readonly string[]): IngestArguments {
  const [domain, ...rest] = argv
  if (domain === undefined || !SUPPORTED_DOMAINS.includes(domain)) {
    throw new IngestRefusal(`el dominio «${domain ?? ''}» no tiene ingestor; hoy: ${SUPPORTED_DOMAINS.join(', ')}`)
  }
  const root = flagValue(rest, ROOT_FLAG)
  if (root === undefined) throw new IngestRefusal(`falta ${ROOT_FLAG}: el recorrido es siempre de una raíz nombrada`)
  return { domain, root: resolve(root), sourceLabel: flagValue(rest, SOURCE_LABEL_FLAG) }
}

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const at = argv.indexOf(flag)
  return at < 0 ? undefined : argv[at + 1]
}

function schemaOf(env: IngestCommandContext['env']): string {
  return env[SEMANTIC_SEARCH_SCHEMA_VAR]?.trim() || DEFAULT_SEMANTIC_SEARCH_SCHEMA
}

function sourceOf(args: IngestArguments): IngestionSource {
  const topLevel = gitOutput(args.root, ['rev-parse', '--show-toplevel'])
  return {
    label: args.sourceLabel ?? basename(topLevel ?? args.root),
    revision: topLevel === undefined ? null : gitOutput(args.root, ['rev-parse', 'HEAD']) ?? null,
  }
}

function gitOutput(directory: string, gitArguments: readonly string[]): string | undefined {
  const run = spawnSync('git', ['-C', directory, ...gitArguments], { encoding: 'utf8' })
  return run.status === 0 ? run.stdout.trim() : undefined
}
