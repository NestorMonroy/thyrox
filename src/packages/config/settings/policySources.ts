/**
 * La lectura de cada fuente administrada de `policySettings`: la remota
 * (`Qq`), la MDM (`Os`) y el archivo `managed-settings.json` con su
 * directorio de fragmentos `managed-settings.d` (`njr`), más la validación de
 * un documento de política (`HRe`/`Ty`/`gd`). Porte de `chunk-379zyrv7.js` del
 * ejecutable 2.1.283; extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`.
 *
 * Cada lectura devuelve lo que la composición (`./policyComposition.ts`)
 * necesita para decidir qué fuente ata: los settings, sus errores, si el
 * documento trae política y si cargó. Una fuente que no se pudo leer no
 * cuenta como ausente: queda `didNotLoad`, para que la composición falle
 * cerrado en vez de caer a la fuente siguiente.
 *
 * Divergencias declaradas:
 * - La validación es `SettingsSchema` de este paquete, no la de 2.1.283
 *   (`os`/`At`), que rescata campo a campo y registra sustitutos. Por eso no
 *   hay `onlySubstitutes` por documento ni la lista `removed`, y el suelo de
 *   sustitutos entre fragmentos (`pd`) no se porta. pendiente: con el esquema
 *   de rescate.
 * - `C$o` descarta además las claves que `Ed` reconoce como retiradas; aquí
 *   cuenta toda clave de política con valor. pendiente: con `Ed`.
 * - La capa remota no emite el aviso de servidores MCP retenidos (`MRe`,
 *   `agn`) ni los fallos `ruled_empty` del último intento (`jx`), y
 *   `servedSnapshot` es siempre falso: esos tres leen el estado de la sesión
 *   remota, que este paquete aún no modela.
 */
import mergeWith from 'lodash-es/mergeWith.js'
import { type Dirent, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getRemoteManagedSettingsSyncFromCache } from '../remote/syncCacheState.ts'
import {
  combineLoadState,
  documentHasPolicyContent,
  downgradeWslInheritErrors,
  hasPolicyKeys,
  hasPolicyValues,
  loadStateOf,
  NON_POLICY_KEYS,
  type PolicyError,
  type PolicyLoadState,
  type PolicyRead,
} from './policyComposition.ts'
import { mergeManagedValue } from './policyMerge.ts'
import { SettingsSchema } from './types.ts'
import { formatZodError } from './validation.ts'

type PolicyDocument = Record<string, unknown>

/** Una fuente leída, con sus errores. */
export type PolicySourceRead = PolicyRead & { errors: PolicyError[] }

/** Lo que la composición inyecta: las fuentes que no son archivos. */
export type PolicySourceContext = {
  remote?: () => PolicyDocument | null
  mdm?: () => PolicySourceRead | null
}

/** El sistema de archivos que lee `managed-settings.json` y sus fragmentos. */
export type PolicyFiles = {
  readFile(path: string): string
  listDirectory(path: string): Pick<Dirent, 'name' | 'isFile' | 'isSymbolicLink'>[]
}

export const NODE_POLICY_FILES: PolicyFiles = {
  readFile: path => readFileSync(path, 'utf8'),
  listDirectory: path => readdirSync(path, { withFileTypes: true }),
}

const REMOTE_SOURCE = 'remote managed settings'
const MANAGED_FILE = 'managed-settings.json'
const DROP_IN_DIRECTORY = 'managed-settings.d'

function errnoOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : undefined
}

/** `C$o`: el documento escribe alguna clave de política con valor. */
function writesPolicy(document: PolicyDocument, settings: PolicyDocument | null): boolean {
  return Object.entries(document).some(([key, value]) => value !== null && !(NON_POLICY_KEYS as readonly string[]).includes(key))
    || (settings !== null && hasPolicyKeys(settings))
}

type DocumentRead = PolicySourceRead & { loadState: PolicyLoadState; documentHasPolicyContent: boolean }

/** `md`: la validación de cada documento, por documento y por nombre de fuente. */
const validated = new WeakMap<object, Map<string, DocumentRead>>()

/** `Ty`. */
function validatePolicyDocument(document: PolicyDocument, file: string): DocumentRead {
  const parsed = SettingsSchema().safeParse(structuredClone(document))
  if (!parsed.success) {
    return { settings: null, errors: formatZodError(parsed.error, file), documentHasPolicyContent: false, loadState: 'didNotLoad' }
  }
  const data = parsed.data as PolicyDocument
  const settings = Object.keys(data).length > 0 ? data : null
  return { settings, errors: [], documentHasPolicyContent: writesPolicy(document, settings), loadState: 'loaded' }
}

/** `gd`: cada llamada recibe su copia, para que nadie mute la de la caché. */
function copyOf(read: DocumentRead): DocumentRead {
  return { ...read, settings: read.settings && structuredClone(read.settings), errors: read.errors.map(error => ({ ...error })) }
}

/** `HRe`: valida un documento de política con el nombre de su fuente. */
export function readPolicyDocument(document: PolicyDocument, file: string): DocumentRead {
  let byFile = validated.get(document)
  let read = byFile?.get(file)
  if (!read) {
    read = validatePolicyDocument(document, file)
    if (!byFile) validated.set(document, (byFile = new Map()))
    byFile.set(file, read)
  }
  return copyOf(read)
}

/** `Qq`: la capa remota, desde la caché de ajustes gestionados. */
export function readRemotePolicy(context: PolicySourceContext): PolicySourceRead & { servedSnapshot: boolean } {
  const document = context.remote ? context.remote() : (getRemoteManagedSettingsSyncFromCache() as PolicyDocument | null)
  if (!document || Object.keys(document).length === 0) {
    return { settings: null, errors: [], servedSnapshot: false, documentHasPolicyContent: false }
  }
  const { settings, errors, documentHasPolicyContent } = readPolicyDocument(document, REMOTE_SOURCE)
  return { settings, errors, servedSnapshot: false, documentHasPolicyContent }
}

/** `Os`: la capa MDM (plist en macOS, HKLM en Windows). */
export function readMdmPolicy(context: PolicySourceContext): PolicySourceRead {
  const mdm = context.mdm?.()
  if (!mdm) return { settings: null, errors: [], documentHasPolicyContent: false, loadState: 'absent' }
  return {
    settings: mdm.settings && Object.keys(mdm.settings).length > 0 ? mdm.settings : null,
    errors: downgradeWslInheritErrors(mdm.errors, () => readRemotePolicy(context)),
    documentHasPolicyContent: documentHasPolicyContent(mdm),
    loadState: loadStateOf(mdm),
    ...(mdm.onlySubstitutes && { onlySubstitutes: mdm.onlySubstitutes }),
  }
}

/** `BUt`. */
function unreadable(file: string, error: unknown, kind: 'file' | 'directory' = 'file'): PolicyError {
  const what = kind === 'directory' ? 'Managed settings drop-in directory' : 'Settings file'
  return { file, path: '', message: `${what} could not be read: ${error instanceof Error ? error.message : String(error)}`, severity: 'fatal', errorClass: 'unreadable' }
}

/** `ugn`, para un documento administrado que no escribe el usuario. */
function notAnObject(file: string): PolicyError {
  return { file, path: '', message: 'Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.', startupFatal: true }
}

/** `Pne`/`Gye`/`Cd`: un documento administrado del disco. */
function readManagedDocument(path: string, files: PolicyFiles): PolicySourceRead {
  let content: string
  try {
    content = files.readFile(path)
  } catch (error) {
    if (errnoOf(error) === 'ENOENT') return { settings: null, errors: [], loadState: 'absent' }
    return { settings: null, errors: [unreadable(path, error)], loadState: 'didNotLoad' }
  }
  if (content.trim() === '') return { settings: {}, errors: [], loadState: 'loaded' }
  let document: unknown
  try {
    document = JSON.parse(content)
  } catch {
    document = null
  }
  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    return { settings: null, errors: [notAnObject(path)], loadState: 'didNotLoad' }
  }
  return readPolicyDocument(document as PolicyDocument, path)
}

/** `V2o`/`b6`: un fragmento es un `.json` visible, archivo o enlace. */
function isFragment(entry: Pick<Dirent, 'name' | 'isFile' | 'isSymbolicLink'>): boolean {
  return (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith('.json') && !entry.name.startsWith('.')
}

/** `njr`: `managed-settings.json` y, encima, sus fragmentos en orden de nombre. */
export function readFilePolicy(directory: string, files: PolicyFiles = NODE_POLICY_FILES): PolicySourceRead {
  const errors: PolicyError[] = []
  let merged: PolicyDocument = {}
  let found = false
  let authored = false
  let hasContent = false
  let loadState: PolicyLoadState = 'absent'

  const apply = (read: PolicySourceRead) => {
    errors.push(...read.errors)
    hasContent ||= documentHasPolicyContent(read)
    loadState = combineLoadState(loadState, loadStateOf(read))
    const { settings } = read
    if (!settings || Object.keys(settings).length === 0) return
    merged = mergeWith(merged, settings, mergeManagedValue)
    found = true
    if (hasPolicyValues(settings) && !read.onlySubstitutes) authored = true
  }

  apply(readManagedDocument(join(directory, MANAGED_FILE), files))
  const dropIns = join(directory, DROP_IN_DIRECTORY)
  try {
    const names = files.listDirectory(dropIns).filter(isFragment).map(entry => entry.name).sort()
    for (const name of names) apply(readManagedDocument(join(dropIns, name), files))
  } catch (error) {
    const code = errnoOf(error)
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      errors.push(unreadable(dropIns, error, 'directory'))
      loadState = 'didNotLoad'
    }
  }

  const settings = found && hasPolicyKeys(merged) ? merged : null
  return {
    settings,
    errors,
    documentHasPolicyContent: hasContent,
    loadState,
    ...(settings !== null && !authored && hasPolicyValues(settings) && { onlySubstitutes: true }),
  }
}
