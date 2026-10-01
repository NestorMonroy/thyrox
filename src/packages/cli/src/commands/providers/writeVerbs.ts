/**
 * Los verbos que escriben conexiones: `add` da de alta una de clave de API,
 * `edit` cambia sólo los campos declarados de una existente e `import` da de
 * alta las de un archivo JSON, saltando las que ya existen por proveedor y
 * nombre, con el proveedor por su id canónico (`providerId.ts`). Un archivo
 * aporta datos de proveedor y nada más: su id, su estado o su tipo de
 * autenticación no llegan a la fila.
 *
 * Ninguna salida lleva el secreto; el ensayo (`--dry-run`) muestra su forma.
 *
 * Porte de `runProviderAddCommand`, `runProviderEditCommand` y
 * `runProviderImportCommand` en `omniroute: bin/cli/commands/provider-crud.mjs`
 * (MIT). Aquí el store es local; un resultado de importación nombra la
 * conexión creada, y el ensayo de una importación se marca `would_create`.
 */
import { flag, hasFlag } from '../../entry/flags.ts'
import { EXIT_FAIL, EXIT_OK, EXIT_USAGE } from '../../exitCodes.ts'
import { firstPositional } from './commandArgs.ts'
import { buildConnectionPayload, parsePriority, type ConnectionPayloadOptions } from './connectionPayload.ts'
import { resolveConnection } from './connectionSelector.ts'
import { CREDENTIAL_ARGUMENT_REFUSED, passesCredentialAsArgument, resolveCredential, type CredentialSources } from './credentialInput.ts'
import { canonicalProviderId } from './providerId.ts'
import { publicConnection } from './publicConnection.ts'
import { credentialShape, redactSecrets } from './secretShape.ts'

type Row = Record<string, unknown>

export interface WriteVerbDeps extends CredentialSources {
  store: { list(): Row[]; create(data: Row): Row | null; update(id: string, fields: Row): Row | null | unknown }
  write: (text: string) => void
  readFile: (path: string) => string
}

const VALUE_FLAGS = ['name', 'credential-env', 'default-model', 'priority', 'provider-specific-data', 'credential'] as const
const CREDENTIAL_REQUIRED = 'Provider credential is required (use --credential-stdin or --credential-env).'

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

function optionsFrom(args: string[]): ConnectionPayloadOptions {
  return { name: flag(args, 'name'), defaultModel: flag(args, 'default-model'), priority: flag(args, 'priority'), providerSpecificData: flag(args, 'provider-specific-data') }
}

export async function runAddVerb(args: string[], deps: WriteVerbDeps): Promise<number> {
  const provider = firstPositional(args, VALUE_FLAGS)?.trim()
  if (!provider) {
    deps.write('Provider id is required.\n')
    return EXIT_USAGE
  }
  if (passesCredentialAsArgument(args)) {
    deps.write(`${CREDENTIAL_ARGUMENT_REFUSED}\n`)
    return EXIT_USAGE
  }
  const dryRun = hasFlag(args, 'dry-run')
  const allowNone = hasFlag(args, 'no-credential')
  try {
    const credential = allowNone ? undefined : await resolveCredential(args, deps, { prompt: !dryRun && !hasFlag(args, 'yes') })
    if (!credential && !dryRun && !allowNone) throw new Error(CREDENTIAL_REQUIRED)
    const payload = buildConnectionPayload(provider, optionsFrom(args), credential)
    if (dryRun) {
      const preview = { action: 'providers.add', provider: payload.provider, name: payload.name, defaultModel: payload.defaultModel ?? null, credential: credentialShape(credential), providerSpecificData: payload.providerSpecificData ? redactSecrets(payload.providerSpecificData) : null }
      deps.write(hasFlag(args, 'json') ? json(preview) : `dry-run: would add ${payload.provider}/${payload.name}\n`)
      return EXIT_OK
    }
    const created = deps.store.create(payload)
    if (!created) throw new Error(`Provider connection '${String(payload.name)}' was not created.`)
    deps.write(hasFlag(args, 'json') ? json({ connection: publicConnection(created) }) : `Added provider connection '${String(created.name)}'.\n`)
    return EXIT_OK
  } catch (error) {
    deps.write(`${message(error)}\n`)
    return EXIT_FAIL
  }
}

export async function runEditVerb(args: string[], deps: WriteVerbDeps): Promise<number> {
  const active = hasFlag(args, 'active')
  const inactive = hasFlag(args, 'inactive')
  if (active && inactive) {
    deps.write('--active and --inactive cannot be used together.\n')
    return EXIT_USAGE
  }
  if (passesCredentialAsArgument(args)) {
    deps.write(`${CREDENTIAL_ARGUMENT_REFUSED}\n`)
    return EXIT_USAGE
  }
  const changes: Row = {}
  const priority = flag(args, 'priority')
  if (priority !== undefined) {
    try {
      changes.priority = parsePriority(priority)
    } catch (error) {
      deps.write(`${message(error)}\n`)
      return EXIT_USAGE
    }
  }
  const selector = firstPositional(args, VALUE_FLAGS) ?? ''
  try {
    const connection = resolveConnection(deps.store.list(), selector)
    if (!connection) throw new Error(`No provider connection matches '${selector}'.`)
    const name = flag(args, 'name')
    const defaultModel = flag(args, 'default-model')
    if (name !== undefined) changes.name = name
    if (defaultModel !== undefined) changes.defaultModel = defaultModel || null
    if (active || inactive) changes.isActive = active
    const credential = await resolveCredential(args, deps, { prompt: false })
    if (credential) changes.apiKey = credential
    if (Object.keys(changes).length === 0) {
      deps.write('At least one edit field is required (--name, --default-model, --priority, --active/--inactive, or credential).\n')
      return EXIT_USAGE
    }
    const label = String(connection.name || connection.id)
    if (hasFlag(args, 'dry-run')) {
      const preview = { action: 'providers.edit', connection: publicConnection(connection), changes: { ...changes, apiKey: credentialShape(changes.apiKey) } }
      deps.write(hasFlag(args, 'json') ? json(preview) : `dry-run: would edit ${label}\n`)
      return EXIT_OK
    }
    const updated = deps.store.update(String(connection.id), changes)
    if (!updated) throw new Error(`Provider connection '${label}' was not updated.`)
    deps.write(hasFlag(args, 'json') ? json({ connection: publicConnection(updated as Row) }) : `Updated provider connection '${label}'.\n`)
    return EXIT_OK
  } catch (error) {
    deps.write(`${message(error)}\n`)
    return EXIT_FAIL
  }
}

type ImportResult = { provider?: string; name?: string; ok: boolean; status?: string; connectionId?: unknown; error?: string }

const identityKey = (provider: unknown, name: unknown) => `${canonicalProviderId(String(provider ?? '')).toLowerCase()}\0${String(name ?? provider ?? '').toLowerCase()}`

function importEntry(entry: unknown, existing: Map<string, Row>, dryRun: boolean, deps: WriteVerbDeps): ImportResult {
  if (!entry || typeof entry !== 'object' || !(entry as Row).provider) return { ok: false, error: 'entry.provider is required' }
  const fields = entry as Row
  const provider = canonicalProviderId(String(fields.provider))
  const name = String(fields.name || provider).trim()
  const found = existing.get(identityKey(provider, name))
  if (found) return { provider, name, ok: true, status: 'skipped_existing', connectionId: found.id }
  try {
    const credential = (fields.apiKey ?? fields.credential) as string | undefined
    if (!credential && fields.allowNoCredential !== true) throw new Error(CREDENTIAL_REQUIRED)
    const payload = buildConnectionPayload(provider, { name: fields.name, defaultModel: fields.defaultModel, priority: fields.priority, providerSpecificData: fields.providerSpecificData }, credential)
    if (dryRun) return { provider, name, ok: true, status: 'would_create' }
    const created = deps.store.create(payload)
    if (!created) throw new Error(`Provider connection '${name}' was not created.`)
    existing.set(identityKey(provider, name), created)
    return { provider, name, ok: true, status: 'created', connectionId: created.id }
  } catch (error) {
    return { provider, name, ok: false, status: 'error', error: message(error) }
  }
}

function describeResult(result: ImportResult): string {
  if (result.status === 'skipped_existing') return `Skipped existing provider connection '${result.name}'.\n`
  if (result.ok) return `${result.status === 'created' ? 'Created' : 'Would create'} provider connection '${result.name}'.\n`
  return `Failed provider connection '${result.name ?? '?'}': ${result.error}\n`
}

export function runImportVerb(args: string[], deps: WriteVerbDeps): number {
  const file = firstPositional(args, VALUE_FLAGS) ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(deps.readFile(file))
  } catch (error) {
    deps.write(`Cannot read provider import file: ${message(error)}\n`)
    return EXIT_FAIL
  }
  const entries: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray((parsed as Row | null)?.providers) ? ((parsed as Row).providers as unknown[]) : [parsed]
  if (entries.length === 0) {
    deps.write('Provider import file contains no entries.\n')
    return EXIT_USAGE
  }
  const dryRun = hasFlag(args, 'dry-run')
  const existing = new Map<string, Row>()
  for (const row of deps.store.list()) if (!existing.has(identityKey(row.provider, row.name))) existing.set(identityKey(row.provider, row.name), row)
  const results: ImportResult[] = []
  for (const entry of entries) {
    const result = importEntry(entry, existing, dryRun, deps)
    results.push(result)
    if (!result.ok && !hasFlag(args, 'continue-on-error')) break
  }
  deps.write(hasFlag(args, 'json') ? json({ file, results }) : results.map(describeResult).join(''))
  return results.every(result => result.ok) ? EXIT_OK : EXIT_FAIL
}
