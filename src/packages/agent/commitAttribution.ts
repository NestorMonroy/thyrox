/**
 * Atribucion de un cambio — porte de `ccnmt: packages/agent/commitAttribution.ts`
 * (`sanitizeModelName`, `sanitizeSurfaceKey`, `buildSurfaceKey`,
 * `computeContentHash`).
 *
 * Un cambio se atribuye a una SUPERFICIE (quien lo origino: `cli`, `sdk`,
 * `vscode`) y a un MODELO canonico. El nombre interno de un modelo lleva
 * variantes que no deben salir a un remolque de commit —`-fast`,
 * `-internal`— asi que se colapsa a su familia publica antes de escribirlo.
 *
 * DIVERGENCIA DE TABLA, declarada. La tabla de familias es PARAMETRO del
 * consumidor, no mecanismo: la de la referencia se porta verbatim (sus once
 * entradas) y se le anaden las de ESTE catalogo, que la referencia no
 * conoce. Ninguna asercion portada cambia de veredicto por ello.
 *
 * DIVERGENCIA DE FORMA, declarada. La referencia resuelve con una cadena de
 * `if` en orden de escritura, asi que su especificidad depende del cuidado
 * de quien la edita: colar `opus-4` antes que `opus-4-7` la rompe en
 * silencio. Aqui la tabla se ordena por longitud descendente de clave al
 * cargar el modulo, de modo que «gana el mas especifico» es una propiedad
 * del mecanismo y no del orden del archivo.
 */
import { createHash, randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import type {
  AttributionSnapshotMessage,
  FileAttributionState,
} from './logsTypes.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import {
  getOriginalCwd,
  getSessionId,
} from '@thyrox/app-host/bootstrap/state.js'
import { readEnv } from '@thyrox/config/env/utils'
import { getRemoteUrlForDir, resolveGitDir } from '@thyrox/config/gitFilesystem.js'
import { sequential } from '@thyrox/config/sequential'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logError } from '@thyrox/local-observability/logging'
import { execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { findGitRoot, gitExe } from '@thyrox/storage/git.js'
import { isGeneratedFile } from '@thyrox/tool-registry/generatedFiles.js'

/**
 * La lista de repositorios donde un nombre INTERNO de modelo puede salir a un
 * remolque de commit. Vacía por defecto, y se declara en el entorno como una
 * lista separada por comas.
 *
 * Es deliberadamente una lista de REPOSITORIOS, no un comodín de organización:
 * una organización contiene repositorios públicos, y ahí el modo encubierto
 * tiene que seguir encendido. Sólo entra un repositorio que conste privado.
 */
const INTERNAL_MODEL_REPOS_ENV = 'THYROX_INTERNAL_MODEL_REPOS'

function internalModelRepos(): string[] {
  const declared = readEnv(INTERNAL_MODEL_REPOS_ENV)
  if (!declared) return []
  return declared
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
}

/**
 * La raíz del repositorio para las operaciones de atribución.
 *
 * Se parte de `getCwd()` —que respeta el árbol de trabajo de un agente— y se
 * sube a la raíz de git, para que un `cd` a un subdirectorio no cambie la
 * clave con que se indexa cada archivo. Si no hay raíz de git, cae al
 * directorio original de la sesión.
 */
export function getAttributionRepoRoot(): string {
  const cwd = getCwd()
  return findGitRoot(cwd) ?? getOriginalCwd()
}

/**
 * La clasificación del repositorio, cacheada una vez por proceso.
 *
 * - `internal`: el remoto casa con la lista declarada.
 * - `external`: hay remoto y NO casa (repositorio público o de terceros).
 * - `none`: no hay remoto — ni repositorio de git, ni remoto configurado.
 */
let repoClassCache: 'internal' | 'external' | 'none' | null = null

/** La clasificación cacheada. `null` si la comprobación aún no ha corrido. */
export function getRepoClassCached(): 'internal' | 'external' | 'none' | null {
  return repoClassCache
}

/**
 * ¿Es interno, según lo ya cacheado? `false` si nadie ha comprobado todavía.
 *
 * El default es el SEGURO: ante la duda no se filtra. Un `true` prematuro
 * dejaría salir un nombre en clave a un remolque de commit público, y eso no
 * se deshace.
 */
export function isInternalModelRepoCached(): boolean {
  return repoClassCache === 'internal'
}

/**
 * Comprueba si el repositorio actual está en la lista. Memoizado: se consulta
 * el remoto una sola vez por proceso.
 */
export const isInternalModelRepo = sequential(async (): Promise<boolean> => {
  if (repoClassCache !== null) {
    return repoClassCache === 'internal'
  }

  const cwd = getAttributionRepoRoot()
  const remoteUrl = await getRemoteUrlForDir(cwd)

  if (!remoteUrl) {
    repoClassCache = 'none'
    return false
  }
  const isInternal = internalModelRepos().some(repo => remoteUrl.includes(repo))
  repoClassCache = isInternal ? 'internal' : 'external'
  return isInternal
})

/** Reinicio de la caché de clasificación, sólo para pruebas. */
export function _resetRepoClassCacheForTests(): void {
  repoClassCache = null
}

/**
 * Las once de la referencia, mas las de este catalogo. La clave es el tramo
 * que se busca dentro del nombre interno; el valor, el nombre publico.
 */
const MODEL_FAMILIES: ReadonlyArray<readonly [key: string, canonical: string]> = [
  // Verbatim de la referencia.
  ['opus-4-7', 'claude-opus-4-7'],
  ['opus-4-6', 'claude-opus-4-6'],
  ['opus-4-5', 'claude-opus-4-5'],
  ['opus-4-1', 'claude-opus-4-1'],
  ['opus-4', 'claude-opus-4'],
  ['sonnet-4-6', 'claude-sonnet-4-6'],
  ['sonnet-4-5', 'claude-sonnet-4-5'],
  ['sonnet-4', 'claude-sonnet-4'],
  ['sonnet-3-7', 'claude-sonnet-3-7'],
  ['haiku-4-5', 'claude-haiku-4-5'],
  ['haiku-3-5', 'claude-haiku-3-5'],
  // Anadidas: viven en el catalogo vendorizado y la referencia no las tiene.
  ['opus-4-8', 'claude-opus-4-8'],
  ['opus-4-0', 'claude-opus-4-0'],
  ['opus-5', 'claude-opus-5'],
  ['sonnet-5', 'claude-sonnet-5'],
  ['fable-5-1', 'claude-fable-5-1'],
  ['fable-5', 'claude-fable-5'],
  ['mythos-5-1', 'claude-mythos-5-1'],
  ['mythos-5', 'claude-mythos-5'],
]

/**
 * La misma tabla, ordenada de clave mas larga a mas corta. `fable-5-1` tiene
 * que consultarse antes que `fable-5` porque el nombre del primero contiene
 * al segundo; ordenar por longitud lo garantiza sin depender del orden en
 * que esten escritas las filas.
 */
const FAMILIES_BY_SPECIFICITY = [...MODEL_FAMILIES].sort(
  (a, b) => b[0].length - a[0].length,
)

/** El nombre que recibe un modelo que la tabla no reconoce. */
const UNKNOWN_MODEL = 'claude'

/**
 * Colapsa un nombre interno de modelo a su nombre publico.
 *
 * Lo que la tabla NO cubre, y es deuda declarada: los tres identificadores
 * del catalogo anteriores a la 4 (`claude-3-5-haiku`, `claude-3-5-sonnet`,
 * `claude-3-7-sonnet`) invierten el orden de las palabras respecto a las
 * claves de la referencia (`haiku-3-5`, `sonnet-3-7`), asi que hoy colapsan
 * a `claude`. Son dos convenciones de nombre distintas y elegir una es
 * juicio, no medicion. Sucesor: TASK-DOCS-0431.
 */
export function sanitizeModelName(shortName: string): string {
  for (const [key, canonical] of FAMILIES_BY_SPECIFICITY) {
    if (shortName.includes(key)) return canonical
  }
  return UNKNOWN_MODEL
}

/**
 * Sanea la clave de superficie sustituyendo SOLO su tramo de modelo, que es
 * el que sigue a la ultima barra. Sin barra no hay tramo de modelo, y la
 * clave pasa verbatim.
 */
export function sanitizeSurfaceKey(surfaceKey: string): string {
  const separator = surfaceKey.lastIndexOf('/')
  if (separator === -1) return surfaceKey
  const surface = surfaceKey.slice(0, separator)
  const model = surfaceKey.slice(separator + 1)
  return `${surface}/${sanitizeModelName(model)}`
}

/**
 * Arma la clave de superficie. Su salida es punto fijo de
 * `sanitizeSurfaceKey`: sanear lo ya saneado no lo mueve.
 */
export function buildSurfaceKey(surface: string, model: string): string {
  return `${surface}/${sanitizeModelName(model)}`
}

/** SHA-256 del contenido, en hexadecimal minusculo — sobre bytes UTF-8. */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * CIERRE DEL PORTE. El tramo anterior traía 9 de los 30 símbolos y declaraba
 * su recorte nombrando tres paquetes hermanos ausentes —`fsOperations`,
 * `generatedFiles` y `gitFilesystem`—. Los tres están hoy, así que el aviso
 * SE RETIRA en vez de quedarse pudriendo: un bloqueo caducado que nadie borra
 * se lee como bloqueo vigente, y quien llegue lo vuelve a rodear.
 *
 * DIVERGENCIA DECLARADA — la lista de repositorios permitidos. La fuente lleva
 * en el código 23 nombres de repositorios PRIVADOS de su organización, contra
 * los que compara el remoto para decidir si un nombre interno de modelo puede
 * salir a un remolque de commit. Esa lista es un dato de OTRA organización:
 * copiarla aquí no habilita nada —ninguno de esos repositorios es nuestro— y
 * mete el dominio del proveedor en el árbol del consumidor, que es el defecto
 * que la tarea #249 registra.
 *
 * Lo que se porta es el MECANISMO —clasificar el remoto contra una lista
 * declarada, cacheado una vez por proceso— y la lista pasa a ser PARÁMETRO del
 * despliegue, vacía por defecto y declarada en el entorno. Es la misma forma
 * que `BOOTSTRAP_COMPANY_CODE` ya usa en kaupamex: mecanismo en el código,
 * identidad en la configuración.
 *
 * Con la lista vacía la clasificación da siempre `external` o `none`, que es
 * el default SEGURO: ningún nombre interno sale. Equivocarse hacia `internal`
 * filtraría un nombre en clave a un repositorio público.
 */

/** El subconjunto de `AttributionState` que este cierre necesita. */
export type AttributionState = {
  /** Estados de archivo, indexados por ruta relativa al cwd. */
  fileStates: Map<string, FileAttributionState>
  /**
   * La linea base de la sesion, para el calculo del cambio NETO: sin ella un
   * archivo que alguien modifico fuera del seguimiento se atribuiria entero.
   */
  sessionBaselines: Map<string, { contentHash: string; mtime: number }>
  /** Superficie desde la que se hicieron las ediciones. */
  surface: string
  /** El SHA de HEAD al arrancar la sesion, para detectar commits externos. */
  startingHeadSha: string | null
  /** Total de prompts en la sesion (para el conteo de "steers"). */
  promptCount: number
  /** Prompts al ultimo commit (para calcular los steers del commit actual). */
  promptCountAtLastCommit: number
  /** Total de prompts de permiso mostrados. */
  permissionPromptCount: number
  /** Prompts de permiso al ultimo commit. */
  permissionPromptCountAtLastCommit: number
  /** Pulsaciones de ESC (el usuario cancelo un prompt de permiso). */
  escapeCount: number
  /** Pulsaciones de ESC al ultimo commit. */
  escapeCountAtLastCommit: number
}

/** La superficie del cliente actual, leida del entorno. */
export function getClientSurface(): string {
  return readEnv('CLAUDE_CODE_ENTRYPOINT') ?? 'cli'
}

/** Crea un `AttributionState` vacio para una sesion nueva. */
export function createEmptyAttributionState(): AttributionState {
  return {
    fileStates: new Map(),
    sessionBaselines: new Map(),
    surface: getClientSurface(),
    startingHeadSha: null,
    promptCount: 0,
    promptCountAtLastCommit: 0,
    permissionPromptCount: 0,
    permissionPromptCountAtLastCommit: 0,
    escapeCount: 0,
    escapeCountAtLastCommit: 0,
  }
}

/** Convierte el estado de atribucion en un mensaje de snapshot persistible. */
export function stateToSnapshotMessage(
  state: AttributionState,
  messageId: string,
): AttributionSnapshotMessage {
  const fileStates: Record<string, FileAttributionState> = {}
  for (const [path, fileState] of state.fileStates) {
    fileStates[path] = fileState
  }

  return {
    type: 'attribution-snapshot',
    messageId,
    surface: state.surface,
    fileStates,
    promptCount: state.promptCount,
    promptCountAtLastCommit: state.promptCountAtLastCommit,
    permissionPromptCount: state.permissionPromptCount,
    permissionPromptCountAtLastCommit: state.permissionPromptCountAtLastCommit,
    escapeCount: state.escapeCount,
    escapeCountAtLastCommit: state.escapeCountAtLastCommit,
  }
}

/**
 * Restaura el estado de atribucion desde snapshots persistidos.
 *
 * Los snapshots son volcados de estado COMPLETO, no deltas (ver
 * `stateToSnapshotMessage`). El ULTIMO snapshot tiene el conteo mas reciente
 * para cada ruta — `fileStates` nunca se encoge. Iterar y SUMAR los
 * contadores entre snapshots produce crecimiento cuadratico al restaurar
 * (837 snapshots x 280 archivos -> 1.15 mil billones de "chars" rastreados
 * para un archivo de 5KB en una sesion de 5 dias).
 */
export function restoreAttributionStateFromSnapshots(
  snapshots: AttributionSnapshotMessage[],
): AttributionState {
  const state = createEmptyAttributionState()

  const lastSnapshot = snapshots[snapshots.length - 1]
  if (!lastSnapshot) {
    return state
  }

  state.surface = lastSnapshot.surface
  for (const [path, fileState] of Object.entries(lastSnapshot.fileStates)) {
    state.fileStates.set(path, fileState)
  }

  state.promptCount = lastSnapshot.promptCount ?? 0
  state.promptCountAtLastCommit = lastSnapshot.promptCountAtLastCommit ?? 0
  state.permissionPromptCount = lastSnapshot.permissionPromptCount ?? 0
  state.permissionPromptCountAtLastCommit =
    lastSnapshot.permissionPromptCountAtLastCommit ?? 0
  state.escapeCount = lastSnapshot.escapeCount ?? 0
  state.escapeCountAtLastCommit = lastSnapshot.escapeCountAtLastCommit ?? 0

  return state
}

/**
 * Incrementa `promptCount` y guarda un snapshot de atribucion. Se usa para
 * persistir el conteo de prompts a traves de la compactacion. No muta el
 * estado recibido — devuelve uno nuevo.
 */
export function incrementPromptCount(
  attribution: AttributionState,
  saveSnapshot: (snapshot: AttributionSnapshotMessage) => void,
): AttributionState {
  const newAttribution = {
    ...attribution,
    promptCount: attribution.promptCount + 1,
  }
  const snapshot = stateToSnapshotMessage(newAttribution, randomUUID())
  saveSnapshot(snapshot)
  return newAttribution
}

/**
 * Normaliza una ruta a su forma RELATIVA desde la raiz de atribucion, que es
 * la clave con que se indexa cada archivo.
 *
 * Resuelve los enlaces simbolicos en los dos lados antes de comparar: en macOS
 * el temporal del sistema es un enlace, asi que sin resolver, la misma ruta
 * entraria dos veces al indice con dos claves distintas.
 */
export function normalizeFilePath(filePath: string): string {
  const fs = getFsImplementation()
  const cwd = getAttributionRepoRoot()

  if (!isAbsolute(filePath)) {
    return filePath
  }

  let resolvedPath = filePath
  let resolvedCwd = cwd

  try {
    resolvedPath = fs.realpathSync(filePath)
  } catch {
    // El archivo puede no existir aun: se usa la ruta original.
  }

  try {
    resolvedCwd = fs.realpathSync(cwd)
  } catch {
    // Se conserva el cwd original.
  }

  if (
    resolvedPath.startsWith(resolvedCwd + sep) ||
    resolvedPath === resolvedCwd
  ) {
    // Con barras hacia adelante, para que la clave case con la salida de git
    // tambien en Windows.
    return relative(resolvedCwd, resolvedPath).replaceAll(sep, '/')
  }

  // Segundo intento con las rutas sin resolver, por si el enlace es el que
  // sacaba el archivo de la raiz.
  if (filePath.startsWith(cwd + sep) || filePath === cwd) {
    return relative(cwd, filePath).replaceAll(sep, '/')
  }

  // Fuera de la raiz: se queda absoluta. Una relativa llena de `..` no casaria
  // con ninguna salida de git.
  return filePath
}

/** Ancla una ruta relativa a la raiz de atribucion; lo absoluto pasa igual. */
export function expandFilePath(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath
  }
  return join(getAttributionRepoRoot(), filePath)
}

/**
 * Calcula la contribucion en caracteres de una modificacion, y devuelve el
 * estado que se guarda — o `null` si el calculo falla.
 *
 * El tramo cambiado se localiza por PREFIJO y SUFIJO comunes, no por
 * diferencia de longitud. Es la decision que un porte pierde en silencio:
 * `Math.abs(nuevo.length - viejo.length)` da 0 en una sustitucion de la misma
 * longitud —cambiar `Esc` por `esc`— y la contribucion desapareceria sin
 * error visible.
 */
function computeFileModificationState(
  existingFileStates: Map<string, FileAttributionState>,
  filePath: string,
  oldContent: string,
  newContent: string,
  mtime: number,
): FileAttributionState | null {
  const normalizedPath = normalizeFilePath(filePath)

  try {
    let claudeContribution: number

    if (oldContent === '' || newContent === '') {
      // Archivo nuevo o borrado entero: la contribucion es todo el contenido.
      claudeContribution =
        oldContent === '' ? newContent.length : oldContent.length
    } else {
      const minLen = Math.min(oldContent.length, newContent.length)
      let prefixEnd = 0
      while (
        prefixEnd < minLen &&
        oldContent[prefixEnd] === newContent[prefixEnd]
      ) {
        prefixEnd++
      }
      let suffixLen = 0
      while (
        suffixLen < minLen - prefixEnd &&
        oldContent[oldContent.length - 1 - suffixLen] ===
          newContent[newContent.length - 1 - suffixLen]
      ) {
        suffixLen++
      }
      const oldChangedLen = oldContent.length - prefixEnd - suffixLen
      const newChangedLen = newContent.length - prefixEnd - suffixLen
      claudeContribution = Math.max(oldChangedLen, newChangedLen)
    }

    // Las contribuciones se ACUMULAN: dos ediciones al mismo archivo suman.
    const existingState = existingFileStates.get(normalizedPath)
    const existingContribution = existingState?.claudeContribution ?? 0

    return {
      contentHash: computeContentHash(newContent),
      claudeContribution: existingContribution + claudeContribution,
      mtime,
    }
  } catch (error) {
    logError(error as Error)
    return null
  }
}

/**
 * El `mtime` de un archivo, cayendo al ahora si no existe.
 *
 * Es asincrono para poder precalcularse ANTES de entrar en una devolucion
 * sincrona de estado. Y cae en vez de lanzar: un archivo que el seguimiento
 * aun no ve no debe abortar la atribucion del commit entero.
 */
export async function getFileMtime(filePath: string): Promise<number> {
  const normalizedPath = normalizeFilePath(filePath)
  const absPath = expandFilePath(normalizedPath)
  try {
    const stats = await stat(absPath)
    return stats.mtimeMs
  } catch {
    return Date.now()
  }
}

/** Registra una modificacion. NO muta el estado recibido. */
export function trackFileModification(
  state: AttributionState,
  filePath: string,
  oldContent: string,
  newContent: string,
  _userModified: boolean,
  mtime: number = Date.now(),
): AttributionState {
  const normalizedPath = normalizeFilePath(filePath)
  const newFileState = computeFileModificationState(
    state.fileStates,
    filePath,
    oldContent,
    newContent,
    mtime,
  )
  if (!newFileState) {
    return state
  }

  const newFileStates = new Map(state.fileStates)
  newFileStates.set(normalizedPath, newFileState)

  logForDebugging(
    `Attribution: Tracked ${newFileState.claudeContribution} chars for ${normalizedPath}`,
  )

  return {
    ...state,
    fileStates: newFileStates,
  }
}

/** Una creacion es una modificacion desde el vacio. */
export function trackFileCreation(
  state: AttributionState,
  filePath: string,
  content: string,
  mtime: number = Date.now(),
): AttributionState {
  return trackFileModification(state, filePath, '', content, false, mtime)
}

/**
 * Registra una eliminacion.
 *
 * El hash queda VACIO, que es la marca de «ya no existe»: distinguirlo del
 * hash de una cadena vacia es lo que evita reatribuirlo como archivo presente
 * en el calculo del commit.
 */
export function trackFileDeletion(
  state: AttributionState,
  filePath: string,
  oldContent: string,
): AttributionState {
  const normalizedPath = normalizeFilePath(filePath)
  const existingState = state.fileStates.get(normalizedPath)
  const existingContribution = existingState?.claudeContribution ?? 0
  const deletedChars = oldContent.length

  const newFileState: FileAttributionState = {
    contentHash: '',
    claudeContribution: existingContribution + deletedChars,
    mtime: Date.now(),
  }

  const newFileStates = new Map(state.fileStates)
  newFileStates.set(normalizedPath, newFileState)

  logForDebugging(
    `Attribution: Tracked deletion of ${normalizedPath} (${deletedChars} chars removed, total contribution: ${newFileState.claudeContribution})`,
  )

  return {
    ...state,
    fileStates: newFileStates,
  }
}

/**
 * Registra muchos cambios en UN solo pase, mutando una unica copia del mapa.
 *
 * Copiar el mapa por archivo cuesta cuadratico con cientos de miles de
 * archivos —lo que produce una operacion de control de versiones grande— y
 * ademas dejaria a cada entrada sin ver la anterior, asi que dos cambios al
 * mismo archivo no acumularian.
 */
export function trackBulkFileChanges(
  state: AttributionState,
  changes: ReadonlyArray<{
    path: string
    type: 'modified' | 'created' | 'deleted'
    oldContent: string
    newContent: string
    mtime?: number
  }>,
): AttributionState {
  const newFileStates = new Map(state.fileStates)

  for (const change of changes) {
    const mtime = change.mtime ?? Date.now()
    if (change.type === 'deleted') {
      const normalizedPath = normalizeFilePath(change.path)
      const existingState = newFileStates.get(normalizedPath)
      const existingContribution = existingState?.claudeContribution ?? 0
      const deletedChars = change.oldContent.length

      newFileStates.set(normalizedPath, {
        contentHash: '',
        claudeContribution: existingContribution + deletedChars,
        mtime,
      })

      logForDebugging(
        `Attribution: Tracked deletion of ${normalizedPath} (${deletedChars} chars removed, total contribution: ${existingContribution + deletedChars})`,
      )
    } else {
      const newFileState = computeFileModificationState(
        newFileStates,
        change.path,
        change.oldContent,
        change.newContent,
        mtime,
      )
      if (newFileState) {
        const normalizedPath = normalizeFilePath(change.path)
        newFileStates.set(normalizedPath, newFileState)

        logForDebugging(
          `Attribution: Tracked ${newFileState.claudeContribution} chars for ${normalizedPath}`,
        )
      }
    }
  }

  return {
    ...state,
    fileStates: newFileStates,
  }
}

/**
 * Los tipos de la salida de atribucion, que consume el escritor de notas.
 */

/** El resumen de la contribucion para un commit. */
export type AttributionSummary = {
  claudePercent: number
  claudeChars: number
  humanChars: number
  surfaces: string[]
}

/** El detalle por archivo. */
export type FileAttribution = {
  claudeChars: number
  humanChars: number
  percent: number
  surface: string
}

/** El dato completo que va a la nota de git, en JSON. */
export type AttributionData = {
  version: 1
  summary: AttributionSummary
  files: Record<string, FileAttribution>
  surfaceBreakdown: Record<string, { claudeChars: number; percent: number }>
  excludedGenerated: string[]
  sessions: string[]
}

/**
 * Calcula la atribucion final de los archivos en el indice, comparando la
 * linea base de la sesion contra lo que se va a commitear.
 *
 * Los estados de VARIAS sesiones se funden antes de medir: la linea base mas
 * antigua gana —es el punto de partida real— y las contribuciones se suman.
 */
export async function calculateCommitAttribution(
  states: AttributionState[],
  stagedFiles: string[],
): Promise<AttributionData> {
  const cwd = getAttributionRepoRoot()
  const sessionId = getSessionId()

  const files: Record<string, FileAttribution> = {}
  const excludedGenerated: string[] = []
  const surfaces = new Set<string>()
  const surfaceCounts: Record<string, number> = {}

  let totalClaudeChars = 0
  let totalHumanChars = 0

  const mergedFileStates = new Map<string, FileAttributionState>()
  const mergedBaselines = new Map<
    string,
    { contentHash: string; mtime: number }
  >()

  for (const state of states) {
    surfaces.add(state.surface)

    // Un estado que viene de disco llega como objeto plano, no como mapa: se
    // acepta la forma serializada para que la reanudacion no lo pierda.
    const baselines =
      state.sessionBaselines instanceof Map
        ? state.sessionBaselines
        : new Map(
            Object.entries(
              (state.sessionBaselines ?? {}) as Record<
                string,
                { contentHash: string; mtime: number }
              >,
            ),
          )
    for (const [path, baseline] of baselines) {
      // La MAS ANTIGUA gana: es el punto de partida contra el que se mide.
      if (!mergedBaselines.has(path)) {
        mergedBaselines.set(path, baseline)
      }
    }

    const fileStates =
      state.fileStates instanceof Map
        ? state.fileStates
        : new Map(
            Object.entries(
              (state.fileStates ?? {}) as Record<string, FileAttributionState>,
            ),
          )
    for (const [path, fileState] of fileStates) {
      const existing = mergedFileStates.get(path)
      if (existing) {
        mergedFileStates.set(path, {
          ...fileState,
          claudeContribution:
            existing.claudeContribution + fileState.claudeContribution,
        })
      } else {
        mergedFileStates.set(path, fileState)
      }
    }
  }

  const fileResults = await Promise.all(
    stagedFiles.map(async file => {
      if (isGeneratedFile(file)) {
        return { type: 'generated' as const, file }
      }

      const absPath = join(cwd, file)
      const fileState = mergedFileStates.get(file)
      const baseline = mergedBaselines.get(file)

      const fileSurface = states[0]!.surface

      let claudeChars = 0
      let humanChars = 0

      const deleted = await isFileDeleted(file)

      if (deleted) {
        if (fileState) {
          claudeChars = fileState.claudeContribution
          humanChars = 0
        } else {
          // Eliminacion sin seguimiento: la hizo una persona.
          const diffSize = await getGitDiffSize(file)
          humanChars = diffSize > 0 ? diffSize : 100
        }
      } else {
        try {
          // Solo hace falta el TAMANO, no el contenido: un `stat` evita cargar
          // en memoria un artefacto de compilacion de gigabytes que aparezca
          // en el arbol de trabajo.
          const stats = await stat(absPath)

          if (fileState) {
            claudeChars = fileState.claudeContribution
            humanChars = 0
          } else if (baseline) {
            const diffSize = await getGitDiffSize(file)
            humanChars = diffSize > 0 ? diffSize : stats.size
          } else {
            humanChars = stats.size
          }
        } catch {
          return null
        }
      }

      claudeChars = Math.max(0, claudeChars)
      humanChars = Math.max(0, humanChars)

      const total = claudeChars + humanChars
      const percent = total > 0 ? Math.round((claudeChars / total) * 100) : 0

      return {
        type: 'file' as const,
        file,
        claudeChars,
        humanChars,
        percent,
        surface: fileSurface,
      }
    }),
  )

  for (const result of fileResults) {
    if (!result) continue

    if (result.type === 'generated') {
      excludedGenerated.push(result.file)
      continue
    }

    files[result.file] = {
      claudeChars: result.claudeChars,
      humanChars: result.humanChars,
      percent: result.percent,
      surface: result.surface,
    }

    totalClaudeChars += result.claudeChars
    totalHumanChars += result.humanChars

    surfaceCounts[result.surface] =
      (surfaceCounts[result.surface] ?? 0) + result.claudeChars
  }

  const totalChars = totalClaudeChars + totalHumanChars
  const claudePercent =
    totalChars > 0 ? Math.round((totalClaudeChars / totalChars) * 100) : 0

  const surfaceBreakdown: Record<
    string,
    { claudeChars: number; percent: number }
  > = {}
  for (const [surface, chars] of Object.entries(surfaceCounts)) {
    // El porcentaje es sobre el TOTAL, no sobre lo de esa superficie: asi las
    // superficies suman entre si en vez de dar cien cada una.
    const percent = totalChars > 0 ? Math.round((chars / totalChars) * 100) : 0
    surfaceBreakdown[surface] = { claudeChars: chars, percent }
  }

  return {
    version: 1,
    summary: {
      claudePercent,
      claudeChars: totalClaudeChars,
      humanChars: totalHumanChars,
      surfaces: Array.from(surfaces),
    },
    files,
    surfaceBreakdown,
    excludedGenerated,
    sessions: [sessionId],
  }
}

/**
 * El tamano del cambio de un archivo segun git, en caracteres aproximados.
 *
 * `--stat` da LINEAS, no caracteres, asi que se multiplica por una media
 * declarada. Es una aproximacion a proposito: la alternativa —leer el diff
 * entero— cuesta el orden de magnitud que este camino existe para evitar.
 */
const AVERAGE_CHARS_PER_LINE = 40

export async function getGitDiffSize(filePath: string): Promise<number> {
  const cwd = getAttributionRepoRoot()

  try {
    const result = await execFileNoThrowWithCwd(
      gitExe(),
      ['diff', '--cached', '--stat', '--', filePath],
      { cwd, timeout: 5000 },
    )

    if (result.code !== 0 || !result.stdout) {
      return 0
    }

    const lines = result.stdout.split('\n').filter(Boolean)
    let totalChanges = 0

    for (const line of lines) {
      if (line.includes('file changed') || line.includes('files changed')) {
        const insertMatch = line.match(/(\d+) insertions?/)
        const deleteMatch = line.match(/(\d+) deletions?/)

        const insertions = insertMatch ? parseInt(insertMatch[1]!, 10) : 0
        const deletions = deleteMatch ? parseInt(deleteMatch[1]!, 10) : 0
        totalChanges += (insertions + deletions) * AVERAGE_CHARS_PER_LINE
      }
    }

    return totalChanges
  } catch {
    return 0
  }
}

/** ¿El archivo esta marcado como eliminado en el indice? */
export async function isFileDeleted(filePath: string): Promise<boolean> {
  const cwd = getAttributionRepoRoot()

  try {
    const result = await execFileNoThrowWithCwd(
      gitExe(),
      ['diff', '--cached', '--name-status', '--', filePath],
      { cwd, timeout: 5000 },
    )

    if (result.code === 0 && result.stdout) {
      // La forma es `D\tarchivo`.
      return result.stdout.trim().startsWith('D\t')
    }
  } catch {
    // Se ignora: la duda responde `false`, que no reatribuye nada.
  }

  return false
}

/** Los archivos que hay en el indice. */
export async function getStagedFiles(): Promise<string[]> {
  const cwd = getAttributionRepoRoot()

  try {
    const result = await execFileNoThrowWithCwd(
      gitExe(),
      ['diff', '--cached', '--name-only'],
      { cwd, timeout: 5000 },
    )

    if (result.code === 0 && result.stdout) {
      return result.stdout.split('\n').filter(Boolean)
    }
  } catch (error) {
    logError(error as Error)
  }

  return []
}

/**
 * ¿Hay un rebase, una fusion, un cherry-pick o una biseccion a medias?
 *
 * Se mira la PRESENCIA de los ficheros indicadores, sin lanzar proceso: es
 * mas barato, y esto se consulta antes de cada atribucion.
 */
export async function isGitTransientState(): Promise<boolean> {
  const gitDir = await resolveGitDir(getAttributionRepoRoot())
  if (!gitDir) return false

  const indicators = [
    'rebase-merge',
    'rebase-apply',
    'MERGE_HEAD',
    'CHERRY_PICK_HEAD',
    'BISECT_LOG',
  ]

  const results = await Promise.all(
    indicators.map(async indicator => {
      try {
        await stat(join(gitDir, indicator))
        return true
      } catch {
        return false
      }
    }),
  )

  return results.some(exists => exists)
}

/** Restaura el estado de atribucion desde el registro, al reanudar. */
export function attributionRestoreStateFromLog(
  attributionSnapshots: AttributionSnapshotMessage[],
  onUpdateState: (newState: AttributionState) => void,
): void {
  const state = restoreAttributionStateFromSnapshots(attributionSnapshots)
  onUpdateState(state)
}
