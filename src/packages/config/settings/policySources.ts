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
 * Cada documento se valida con el rescate campo a campo de
 * `./policyFieldRescue.ts` (porte de `os`/`Ho`, con `Zo` derivada de
 * `RESTRICTIVE_SETTINGS`/`Qe`). Un campo inválido no invalida el documento
 * entero, y una puerta restrictiva
 * inválida se sustituye en vez de descartarse (`substituted: true`); una
 * puerta `"disable"` con un `false` válido se lee como no-op (`removed:
 * true`, un aviso por CAMPO). `writesPolicy` usa `isPolicyNoOp` (`Ed`,
 * reducida a claves de nivel superior — ver el pendiente en
 * `policyFieldRescue.ts`) para no contar un `null` ni un `false` de no-op
 * como intento de escribir política.
 *
 * `readPolicyDocument` también lleva la lista `removed` de `Ty` (porte en
 * `./policyRescue.ts`, un ARREGLO por DOCUMENTO — no confundir con el aviso
 * por campo del párrafo anterior): las claves que `Ed` cuenta como no-op,
 * ausentes del rescate, que ningún aviso previo ya explica. `At` (el filtro
 * de entradas de servidor MCP que 2.1.283 antepone a ese cálculo) no se
 * porta — sus nueve validadores no están en la extracción — así que
 * `removedPolicyKeys` recibe únicamente los avisos de `os` y de
 * `sanitizeCrossSessionInbound`, donde el binario habría sumado también los
 * de `At`.
 *
 * Divergencias que siguen declaradas:
 * - El "suelo" entre fragmentos de `readFilePolicy` (`pd`) se generaliza a
 *   CUALQUIER campo sustituido, no sólo a los de la tabla `_n` del binario
 *   (no extraída): un valor real ya establecido por un fragmento anterior
 *   protege esa ruta de un sustituto posterior, sin la distinción "inerte" de
 *   `_n` que decide cuándo el sustituto se aplica igual con aviso.
 * - `onlySubstitutes` sigue sin ser por documento (`i` en `os`): un documento
 *   con sólo sustitutos y sin escritura real no se distingue todavía de uno
 *   con contenido genuino, más allá de lo que `isPolicyNoOp` ya filtra.
 * - `isPolicyNoOp` no recorre rutas anidadas (`Sn`/`kd`/`gn`, no extraído) ni
 *   reconoce los alias de mercados de plugins (`dt`), hoy *diferidos* en
 *   `inventory.ts`.
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
import { isPolicyNoOp, rescuePolicyDocument } from './policyFieldRescue.ts'
import { removedPolicyKeys } from './policyRescue.ts'
import { sanitizeCrossSessionInbound } from './crossSessionInbound.ts'

type PolicyDocument = Record<string, unknown>

/**
 * Una fuente leída, con sus errores. `removed` (la porción de `Ty` en
 * `./policyRescue.ts`) sólo lo llevan las lecturas que validan un documento
 * propio (`readPolicyDocument`): la remota (`Qq`) y la MDM (`Os`) lo
 * descartan al relayar, igual que 2.1.283.
 */
export type PolicySourceRead = PolicyRead & { errors: PolicyError[]; removed?: string[] }

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

/** `C$o`, con `Ed` (`isPolicyNoOp`): el documento escribe alguna clave de política con valor. */
function writesPolicy(document: PolicyDocument, settings: PolicyDocument | null): boolean {
  return Object.entries(document).some(([key, value]) => !isPolicyNoOp(key, value) && !(NON_POLICY_KEYS as readonly string[]).includes(key))
    || (settings !== null && hasPolicyKeys(settings))
}

type DocumentRead = PolicySourceRead & { loadState: PolicyLoadState; documentHasPolicyContent: boolean; removed: string[] }

/** `md`: la validación de cada documento, por documento y por nombre de fuente. */
const validated = new WeakMap<object, Map<string, DocumentRead>>()

/**
 * `Ty`, con el rescate campo a campo (`os`) en vez de un `safeParse` atómico:
 * un campo inválido no tira el documento entero, y `loadState` es siempre
 * `'loaded'` cuando la forma de nivel superior es un objeto — que es la única
 * forma con que se llega aquí (`readManagedDocument` ya descarta lo que no lo
 * es antes de llamar).
 */
function validatePolicyDocument(document: PolicyDocument, file: string): DocumentRead {
  const candidate = structuredClone(document) as PolicyDocument
  const warnings = sanitizeCrossSessionInbound(candidate, file, { policySource: true })
  const { settings: rescued, issues } = rescuePolicyDocument(candidate)
  const errors: PolicyError[] = [
    ...warnings,
    ...issues.map(issue => ({
      file,
      path: issue.path,
      message: issue.message,
      ...(issue.substituted && { substituted: issue.substituted }),
      ...(issue.removed && { removed: issue.removed }),
    })),
  ]
  const settings = Object.keys(rescued).length > 0 ? rescued : null
  const removed = removedPolicyKeys(document, rescued, errors)
  return { settings, errors, removed, documentHasPolicyContent: writesPolicy(document, settings), loadState: 'loaded' }
}

/** `gd`: cada llamada recibe su copia, para que nadie mute la de la caché. */
function copyOf(read: DocumentRead): DocumentRead {
  return {
    ...read,
    settings: read.settings && structuredClone(read.settings),
    errors: read.errors.map(error => ({ ...error })),
    removed: [...read.removed],
  }
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
  // `pd`: el "suelo" — una ruta cuyo valor actual en `merged` viene de un
  // sustituto (`substituted: true`) queda marcada aquí; mientras lo esté, un
  // sustituto posterior en la misma ruta no dispara el aviso de abajo. Ver la
  // divergencia declarada en el encabezado del archivo.
  const floors = new Set<string>()

  const apply = (read: PolicySourceRead) => {
    errors.push(...read.errors)
    hasContent ||= documentHasPolicyContent(read)
    loadState = combineLoadState(loadState, loadStateOf(read))
    const { settings } = read
    if (!settings || Object.keys(settings).length === 0) return
    const substitutedPaths = new Set(read.errors.filter(error => error.substituted).map(error => error.path))
    const toMerge: PolicyDocument = {}
    for (const [key, value] of Object.entries(settings)) {
      const isSubstitute = substitutedPaths.has(key)
      if (isSubstitute && merged[key] !== undefined && !floors.has(key)) {
        const substituteFile = read.errors.find(error => error.path === key && error.substituted)?.file ?? ''
        errors.push({
          file: substituteFile,
          path: key,
          message: `That substitute is not applied: "${key}" keeps the value an earlier managed-settings document of this folder wrote.`,
          statusOnly: true,
        })
      } else {
        toMerge[key] = value
      }
      if (isSubstitute) floors.add(key)
      else floors.delete(key)
    }
    if (Object.keys(toMerge).length > 0) merged = mergeWith(merged, toMerge, mergeManagedValue)
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
