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
import type {
  AttributionSnapshotMessage,
  FileAttributionState,
} from './logsTypes.js'

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
 * AMPLIACION (TASK closure de `__tests__/attributionSnapshotHelpers.test.ts`):
 * el estado de atribucion de una sesion y sus helpers de serializacion/
 * restauracion a traves de la compactacion y la reanudacion.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente declara `AttributionState`
 * con DOS campos mas — `sessionBaselines` (para el calculo de cambio neto de
 * `calculateCommitAttribution`) y `startingHeadSha` (para detectar commits
 * externos) — y una decena de funciones de tracking
 * (`trackFileModification`, `trackFileCreation`, `trackFileDeletion`,
 * `trackBulkFileChanges`, `calculateCommitAttribution`, ...) que dependen de
 * `@claude-code-how-works/storage/fsOperations.js`,
 * `@claude-code-how-works/tool-registry/generatedFiles.js` y
 * `@claude-code-how-works/config/gitFilesystem.js` — paquetes hermanos
 * ausentes en este arbol y sin consumidor en el cierre de este test. Se
 * portan aqui solo los CUATRO simbolos que
 * `__tests__/attributionSnapshotHelpers.test.ts` ejercita:
 * `createEmptyAttributionState`, `stateToSnapshotMessage`,
 * `restoreAttributionStateFromSnapshots`, `incrementPromptCount`. El resto
 * se extrae cuando aparezca su primer consumidor real.
 */

/** El subconjunto de `AttributionState` que este cierre necesita. */
export type AttributionState = {
  /** Estados de archivo, indexados por ruta relativa al cwd. */
  fileStates: Map<string, FileAttributionState>
  /** Superficie desde la que se hicieron las ediciones. */
  surface: string
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
function getClientSurfaceFromEnv(): string {
  return process.env.CLAUDE_CODE_ENTRYPOINT ?? 'cli'
}

/** Crea un `AttributionState` vacio para una sesion nueva. */
export function createEmptyAttributionState(): AttributionState {
  return {
    fileStates: new Map(),
    surface: getClientSurfaceFromEnv(),
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
