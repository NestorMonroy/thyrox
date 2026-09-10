/**
 * Persistencia de resultados grandes de herramienta a disco en vez de
 * truncarlos, y el presupuesto agregado por mensaje que los mantiene dentro
 * de la ventana sin romper la caché de prompt.
 *
 * Procedencia: `ccnmt: packages/storage/src/toolResultStorage.ts` (1040
 * líneas, 29 exports). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** —mismo nombre de módulo, mismo sitio en el
 * paquete, mismos nombres y firmas— y no se copia.
 *
 * Sustituye al porte parcial anterior, que declaraba cinco símbolos puros y
 * dejaba fuera todo lo que toca disco. Sus dos sustitutos ya no tienen razón:
 *
 * - `setFeatureFlagOverrideFn` — un inyector de módulo inventado aquí, cuya
 *   razón declarada era que `config/feature-flags` no estaba portado. Ya lo
 *   está, con `setGrowthBookConfigOverride` para las pruebas, así que el
 *   inyector se retira. No tenía consumidor fuera de este archivo.
 * - `formatFileSize` local — reimplementación cuya razón era que `output` no
 *   estaba en el árbol. Ya está, y es un paquete sin dependencias `@thyrox`.
 *
 * DIVERGENCIAS DECLARADAS
 *
 * 1. `getOriginalCwd` / `getSessionId` — la fuente los toma de
 *    `app-host/bootstrap/state.js`. Aquí se toman de `./sessionPaths.js`,
 *    que es el asiento de esos accesores en este paquete, porque `app-host`
 *    depende de `storage`: importarlo desde aquí cerraría el ciclo en el
 *    manifiesto y —lo que importa de verdad— partiría el identificador de
 *    sesión en dos fuentes, con los resultados aterrizando en un directorio
 *    distinto del que usa el transcript.
 * 2. `getProjectDir` — la fuente lo toma de `./sessionStorage.js`; aquí vive
 *    en `./sessionPaths.ts`. Sólo cambia el archivo, no el símbolo.
 * 3. `ToolResultBlockParam` — la fuente lo toma del SDK de Anthropic, ausente
 *    de este árbol. Se usa el alias estructural de `@thyrox/agent`, cuyo
 *    `content` es `unknown`; por eso este módulo declara `ToolResultContent`
 *    y estrecha con guardas explícitas donde la fuente confía en el tipo.
 *
 * El ciclo entre paquetes (`storage` → `local-observability` → `storage`) es
 * de GRANULARIDAD DE PAQUETE, no de módulo: lo que `local-observability`
 * importa de aquí es `cache-paths.ts`, que no vuelve a este archivo. El grafo
 * de módulos sigue siendo acíclico.
 */
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  Message,
  ToolResultBlockParam,
} from '@thyrox/agent/messageShapes'
import { sanitizeToolNameForAnalytics } from '@thyrox/agent/eventMetadata.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import {
  getErrnoCode,
  toError,
} from '@thyrox/local-observability/errorHelpers.js'
import { logError } from '@thyrox/local-observability/logging'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { formatFileSize } from '@thyrox/output/formatters'
import {
  BYTES_PER_TOKEN,
  DEFAULT_MAX_RESULT_SIZE_CHARS,
  MAX_TOOL_RESULT_BYTES,
  MAX_TOOL_RESULTS_PER_MESSAGE_CHARS,
} from '@thyrox/tool-registry/toolLimits'
import { getOriginalCwd, getProjectDir, getSessionId } from './sessionPaths.js'

/** Subdirectorio de los resultados dentro de la sesión. */
export const TOOL_RESULTS_SUBDIR = 'tool-results'

/** Etiqueta XML que envuelve el mensaje de salida persistida. */
export const PERSISTED_OUTPUT_TAG = '<persisted-output>'
export const PERSISTED_OUTPUT_CLOSING_TAG = '</persisted-output>'

/** Mensaje cuando el contenido se limpió sin persistirlo a un archivo. */
export const TOOL_RESULT_CLEARED_MESSAGE = '[Old tool result content cleared]'

/** Tamaño del preview, en bytes, para el mensaje de referencia. */
export const PREVIEW_SIZE_BYTES = 2000

/**
 * Mapa de override: nombre de herramienta → umbral de persistencia (chars).
 * Cuando el nombre está en el mapa ese valor se usa TAL CUAL, sin el acote
 * contra el default de 50k — es su razón de ser, poder subir una herramienta
 * por encima del default sin recompilar. Las ausentes usan el fallback.
 */
const PERSIST_THRESHOLD_OVERRIDE_FLAG = 'tengu_satin_quoll'

// ---------------------------------------------------------------------------
// Estrechamiento del contenido — ver divergencia 3 del docstring.
// ---------------------------------------------------------------------------

type ToolResultTextBlock = { type: 'text'; text?: string }
type ToolResultAnyBlock = ToolResultTextBlock | { type: string; [key: string]: unknown }

/** El subconjunto de `ToolResultBlockParam['content']` que este módulo lee. */
export type ToolResultContent =
  | string
  | ToolResultAnyBlock[]
  | null
  | undefined

function contentOf(block: ToolResultBlockParam): ToolResultContent {
  return block.content as ToolResultContent
}

/**
 * Resuelve el umbral efectivo para una herramienta.
 *
 * Defensivo: la caché de banderas devuelve el valor servido cuando lo hay,
 * así que una bandera servida como `null`, cadena o número se filtraría. Se
 * comprueba el tipo para que cualquier valor que no sea un número finito
 * positivo caiga al default en vez de reventar al indexar o devolver 0.
 */
export function getPersistenceThreshold(
  toolName: string,
  declaredMaxResultSizeChars: number,
): number {
  // Infinity = opt-out duro. Read acota su propio tamaño por maxTokens;
  // persistir su salida a un archivo que el modelo relee con Read sería
  // circular. Se comprueba ANTES del override para que la bandera no pueda
  // forzarlo de vuelta.
  if (!Number.isFinite(declaredMaxResultSizeChars)) {
    return declaredMaxResultSizeChars
  }
  const overrides = getFeatureValue_CACHED_MAY_BE_STALE<Record<
    string,
    number
  > | null>(PERSIST_THRESHOLD_OVERRIDE_FLAG, {})
  const override = overrides?.[toolName]
  if (
    typeof override === 'number' &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override
  }
  return Math.min(declaredMaxResultSizeChars, DEFAULT_MAX_RESULT_SIZE_CHARS)
}

/** Resultado de persistir un resultado de herramienta a disco. */
export type PersistedToolResult = {
  filepath: string
  originalSize: number
  isJson: boolean
  preview: string
  hasMore: boolean
}

/** Resultado de error cuando la persistencia falla. */
export type PersistToolResultError = {
  error: string
}

/** El directorio de la sesión (projectDir/sessionId). */
function getSessionDir(): string {
  return join(getProjectDir(getOriginalCwd()), getSessionId())
}

/** El directorio de resultados de ESTA sesión. */
export function getToolResultsDir(): string {
  return join(getSessionDir(), TOOL_RESULTS_SUBDIR)
}

/** La ruta donde aterrizaría un resultado dado. */
export function getToolResultPath(id: string, isJson: boolean): string {
  const ext = isJson ? 'json' : 'txt'
  return join(getToolResultsDir(), `${id}.${ext}`)
}

export async function ensureToolResultsDir(): Promise<void> {
  try {
    await mkdir(getToolResultsDir(), { recursive: true })
  } catch {
    // El directorio puede existir ya.
  }
}

/**
 * Persiste un resultado a disco y devuelve la información del archivo.
 */
export async function persistToolResult(
  content: NonNullable<ToolResultContent>,
  toolUseId: string,
): Promise<PersistedToolResult | PersistToolResultError> {
  const isJson = Array.isArray(content)

  // Sólo se pueden persistir bloques de texto.
  if (isJson) {
    const hasNonTextContent = content.some(block => block.type !== 'text')
    if (hasNonTextContent) {
      return {
        error: 'Cannot persist tool results containing non-text content',
      }
    }
  }

  await ensureToolResultsDir()
  const filepath = getToolResultPath(toolUseId, isJson)
  const contentStr = isJson ? jsonStringify(content, null, 2) : content

  // El tool_use_id es único por invocación y el contenido es determinista
  // para un id dado, así que se omite si el archivo ya existe. Eso evita
  // reescribir lo mismo en cada turno cuando la microcompactación reproduce
  // los mensajes originales. La bandera `wx` lo hace sin una carrera entre
  // `stat` y escritura.
  try {
    await writeFile(filepath, contentStr, { encoding: 'utf-8', flag: 'wx' })
    logForDebugging(
      `Persisted tool result to ${filepath} (${formatFileSize(contentStr.length)})`,
    )
  } catch (error) {
    if (getErrnoCode(error) !== 'EEXIST') {
      logError(toError(error))
      return { error: getFileSystemErrorMessage(toError(error)) }
    }
    // EEXIST: ya persistido en un turno previo; se sigue al preview.
  }

  const { preview, hasMore } = generatePreview(contentStr, PREVIEW_SIZE_BYTES)

  return {
    filepath,
    originalSize: contentStr.length,
    isJson,
    preview,
    hasMore,
  }
}

/** Construye el mensaje que ve el modelo para un resultado persistido. */
export function buildLargeToolResultMessage(
  result: PersistedToolResult,
): string {
  let message = `${PERSISTED_OUTPUT_TAG}\n`
  message += `Output too large (${formatFileSize(result.originalSize)}). Full output saved to: ${result.filepath}\n\n`
  message += `Preview (first ${formatFileSize(PREVIEW_SIZE_BYTES)}):\n`
  message += result.preview
  message += result.hasMore ? '\n...\n' : '\n'
  message += PERSISTED_OUTPUT_CLOSING_TAG
  return message
}

/**
 * Procesa el resultado de una herramienta para incluirlo en un mensaje:
 * lo mapea al formato del API y persiste lo grande a disco.
 */
export async function processToolResultBlock<T>(
  tool: {
    name: string
    maxResultSizeChars: number
    mapToolResultToToolResultBlockParam: (
      result: T,
      toolUseID: string,
    ) => ToolResultBlockParam
  },
  toolUseResult: T,
  toolUseID: string,
): Promise<ToolResultBlockParam> {
  const toolResultBlock = tool.mapToolResultToToolResultBlockParam(
    toolUseResult,
    toolUseID,
  )
  return maybePersistLargeToolResult(
    toolResultBlock,
    tool.name,
    getPersistenceThreshold(tool.name, tool.maxResultSizeChars),
  )
}

/**
 * Procesa un bloque YA mapeado, sin volver a llamar al mapeador.
 */
export async function processPreMappedToolResultBlock(
  toolResultBlock: ToolResultBlockParam,
  toolName: string,
  maxResultSizeChars: number,
): Promise<ToolResultBlockParam> {
  return maybePersistLargeToolResult(
    toolResultBlock,
    toolName,
    getPersistenceThreshold(toolName, maxResultSizeChars),
  )
}

/**
 * True cuando el contenido está vacío o efectivamente vacío: undefined/null/'',
 * cadenas sólo de espacios, arreglos vacíos, y arreglos cuyos únicos bloques
 * son de texto con texto vacío. Un bloque que NO es de texto (imagen,
 * tool_reference) cuenta como no-vacío.
 */
export function isToolResultContentEmpty(content: ToolResultContent): boolean {
  if (!content) return true
  if (typeof content === 'string') return content.trim() === ''
  if (!Array.isArray(content)) return false
  if (content.length === 0) return true
  return content.every(
    block =>
      typeof block === 'object' &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block &&
      (typeof (block as ToolResultTextBlock).text !== 'string' ||
        (block as ToolResultTextBlock).text!.trim() === ''),
  )
}

/**
 * Persiste lo grande en vez de truncarlo. Devuelve el bloque original si no
 * hace falta, o uno con el contenido sustituido por la referencia al archivo.
 */
async function maybePersistLargeToolResult(
  toolResultBlock: ToolResultBlockParam,
  toolName: string,
  persistenceThreshold?: number,
): Promise<ToolResultBlockParam> {
  // El tamaño primero, antes de cualquier trabajo asíncrono: la mayoría de
  // los resultados son pequeños.
  const content = contentOf(toolResultBlock)

  // Un tool_result VACÍO en la cola del prompt hace que algunos modelos
  // emitan su secuencia de parada y terminen el turno sin salida: el
  // renderizador del servidor no inserta marcador de asistente tras un
  // resultado, así que un cierre desnudo se parece a una frontera de turno.
  // Varias herramientas producen salida vacía de forma legítima (un comando
  // de shell que calla al acertar, un servidor MCP que devuelve `content:[]`).
  // Se inyecta un marcador corto para que el modelo siempre tenga a qué
  // reaccionar.
  if (isToolResultContentEmpty(content)) {
    logEvent('tengu_tool_empty_result', {
      toolName: sanitizeToolNameForAnalytics(toolName),
    })
    return {
      ...toolResultBlock,
      content: `(${toolName} completed with no output)`,
    }
  }
  // Estrechamiento tras la guarda de vacío: de aquí en adelante no es nulo.
  if (!content) {
    return toolResultBlock
  }

  // Los bloques de imagen viajan tal cual: el modelo los necesita enteros.
  if (hasImageBlock(content)) {
    return toolResultBlock
  }

  const size = contentSize(content)

  const threshold = persistenceThreshold ?? MAX_TOOL_RESULT_BYTES
  if (size <= threshold) {
    return toolResultBlock
  }

  const result = await persistToolResult(content, toolResultBlock.tool_use_id)
  if (isPersistError(result)) {
    // Si la persistencia falla, el bloque original viaja sin cambios.
    return toolResultBlock
  }

  const message = buildLargeToolResultMessage(result)

  logEvent('tengu_tool_result_persisted', {
    toolName: sanitizeToolNameForAnalytics(toolName),
    originalSizeBytes: result.originalSize,
    persistedSizeBytes: message.length,
    estimatedOriginalTokens: Math.ceil(result.originalSize / BYTES_PER_TOKEN),
    estimatedPersistedTokens: Math.ceil(message.length / BYTES_PER_TOKEN),
    thresholdUsed: threshold,
  })

  return { ...toolResultBlock, content: message }
}

/**
 * Genera un preview, cortando en un salto de línea cuando se puede.
 */
export function generatePreview(
  content: string,
  maxBytes: number,
): { preview: string; hasMore: boolean } {
  if (content.length <= maxBytes) {
    return { preview: content, hasMore: false }
  }

  // El último salto de línea dentro del límite, para no cortar a media línea.
  const truncated = content.slice(0, maxBytes)
  const lastNewline = truncated.lastIndexOf('\n')

  // Si el salto está razonablemente cerca del límite se usa; si no, se corta
  // en el límite exacto.
  const cutPoint = lastNewline > maxBytes * 0.5 ? lastNewline : maxBytes

  return { preview: content.slice(0, cutPoint), hasMore: true }
}

/** Guarda de tipo para distinguir el error del resultado. */
export function isPersistError(
  result: PersistedToolResult | PersistToolResultError,
): result is PersistToolResultError {
  return 'error' in result
}

// --- Presupuesto agregado de resultados por mensaje --------------------------
//
// Lleva el estado de reemplazo entre turnos para que el presupuesto tome las
// MISMAS decisiones cada vez, que es lo que preserva el prefijo cacheado.

/**
 * Estado por hilo de conversación. Tiene que ser estable para preservar la
 * caché de prompt:
 *   - `seenIds`: resultados que ya pasaron por el presupuesto —reemplazados o
 *     no—. Una vez vistos, su suerte queda CONGELADA para la conversación.
 *   - `replacements`: el subconjunto de `seenIds` que se persistió y se
 *     reemplazó, mapeado a la cadena EXACTA que vio el modelo. Reaplicarla es
 *     una consulta a un Map: sin I/O, byte a byte idéntica, no puede fallar.
 *
 * Ciclo de vida: una instancia por hilo. El hilo principal la provisiona una
 * vez y no la resetea —las entradas rancias tras un `/clear`, rebobinado o
 * compactación no se consultan nunca (los ids son UUID), así que son inocuas—.
 * Un subagente clona el estado del padre por defecto (una bifurcación que
 * comparte caché necesita decisiones idénticas), o recibe uno reconstruido de
 * los registros de su cadena.
 */
export type ContentReplacementState = {
  seenIds: Set<string>
  replacements: Map<string, string>
}

export function createContentReplacementState(): ContentReplacementState {
  return { seenIds: new Set(), replacements: new Map() }
}

/**
 * Clona el estado para una bifurcación que comparte caché. La copia necesita
 * ser idéntica al origen en el momento de bifurcar para que el presupuesto
 * tome las mismas decisiones → mismo prefijo → acierto de caché. Mutar la
 * copia no toca al origen.
 */
export function cloneContentReplacementState(
  source: ContentReplacementState,
): ContentReplacementState {
  return {
    seenIds: new Set(source.seenIds),
    replacements: new Map(source.replacements),
  }
}

/**
 * Resuelve el límite del presupuesto por mensaje. El override gana cuando es
 * un número finito positivo; si no, cae a la constante. La comprobación de
 * tipo es defensiva por la misma razón que en `getPersistenceThreshold`.
 */
export function getPerMessageBudgetLimit(): number {
  const override = getFeatureValue_CACHED_MAY_BE_STALE<number | null>(
    'tengu_hawthorn_window',
    null,
  )
  if (
    typeof override === 'number' &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override
  }
  return MAX_TOOL_RESULTS_PER_MESSAGE_CHARS
}

/**
 * Provisiona el estado para un hilo nuevo. Encapsula la puerta de la bandera
 * y la elección reconstruir-o-fresco:
 *   - bandera apagada → `undefined` (el bucle omite la aplicación entera);
 *   - sin mensajes iniciales (arranque en frío) → fresco;
 *   - con mensajes iniciales → reconstruido, congelando todo id candidato
 *     para que el presupuesto no reemplace nunca contenido que el modelo ya
 *     vio sin reemplazar.
 */
export function provisionContentReplacementState(
  initialMessages?: Message[],
  initialContentReplacements?: ContentReplacementRecord[],
): ContentReplacementState | undefined {
  const enabled = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_hawthorn_steeple',
    false,
  )
  if (!enabled) return undefined
  if (initialMessages) {
    return reconstructContentReplacementState(
      initialMessages,
      initialContentReplacements ?? [],
    )
  }
  return createContentReplacementState()
}

/**
 * Registro serializable de una decisión de reemplazo. Se escribe al transcript
 * para que la decisión sobreviva a la reanudación. Discriminado por `kind`
 * para que otros mecanismos de reemplazo puedan compartir la entrada.
 *
 * `replacement` es la cadena EXACTA que vio el modelo —se guarda en vez de
 * derivarla al reanudar— para que un cambio en la plantilla del preview, en
 * el formato del tamaño o en la ruta no pueda romper la caché en silencio.
 */
export type ContentReplacementRecord = {
  kind: 'tool-result'
  toolUseId: string
  replacement: string
}

export type ToolResultReplacementRecord = Extract<
  ContentReplacementRecord,
  { kind: 'tool-result' }
>

type ToolResultCandidate = {
  toolUseId: string
  content: NonNullable<ToolResultContent>
  size: number
}

type CandidatePartition = {
  mustReapply: Array<ToolResultCandidate & { replacement: string }>
  frozen: ToolResultCandidate[]
  fresh: ToolResultCandidate[]
}

function isContentAlreadyCompacted(content: ToolResultContent): boolean {
  // Todo contenido que produce el presupuesto empieza por la etiqueta.
  // `startsWith` evita el falso positivo de que la etiqueta aparezca en
  // cualquier otro sitio del contenido (por ejemplo al leer este archivo).
  return typeof content === 'string' && content.startsWith(PERSISTED_OUTPUT_TAG)
}

function hasImageBlock(content: NonNullable<ToolResultContent>): boolean {
  return (
    Array.isArray(content) &&
    content.some(b => typeof b === 'object' && 'type' in b && b.type === 'image')
  )
}

function contentSize(content: NonNullable<ToolResultContent>): number {
  if (typeof content === 'string') return content.length
  // Se suman las longitudes de los bloques de texto directamente. Cuenta un
  // poco por debajo del serializado —no incluye el andamiaje JSON— pero el
  // presupuesto es de todos modos una heurística de tokens, y así se evita
  // reservar una cadena del tamaño del contenido en cada pasada.
  return content.reduce(
    (sum, b) =>
      sum +
      (b.type === 'text' ? ((b as ToolResultTextBlock).text?.length ?? 0) : 0),
    0,
  )
}

/**
 * Recorre los mensajes y construye tool_use_id → nombre de herramienta desde
 * los bloques `tool_use` del asistente. El `tool_use` siempre precede a su
 * `tool_result`, así que cuando el presupuesto ve un resultado su nombre ya
 * se conoce.
 */
function buildToolNameMap(messages: Message[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const message of messages) {
    if (message.type !== 'assistant') continue
    const content = message.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content as Array<{
      type: string
      id?: string
      name?: string
    }>) {
      if (block.type === 'tool_use' && block.id && block.name) {
        map.set(block.id, block.name)
      }
    }
  }
  return map
}

/**
 * Extrae los bloques candidatos de UN mensaje de usuario: los que no están
 * vacíos, no traen imagen y no fueron ya compactados por la etiqueta (sea por
 * el límite por herramienta o por una pasada anterior de esta misma llamada).
 */
function collectCandidatesFromMessage(message: Message): ToolResultCandidate[] {
  if (message.type !== 'user' || !Array.isArray(message.message?.content)) {
    return []
  }
  const content = message.message.content as Array<{
    type: string
    tool_use_id?: string
    content?: unknown
  }>
  return content.flatMap(block => {
    if (block.type !== 'tool_result' || !block.content || !block.tool_use_id) {
      return []
    }
    const inner = block.content as NonNullable<ToolResultContent>
    if (isContentAlreadyCompacted(inner)) return []
    if (hasImageBlock(inner)) return []
    return [
      {
        toolUseId: block.tool_use_id,
        content: inner,
        size: contentSize(inner),
      },
    ]
  })
}

/**
 * Extrae los candidatos AGRUPADOS por mensaje de usuario a nivel de API.
 *
 * La normalización previa al envío funde mensajes de usuario consecutivos en
 * uno solo, así que N resultados paralelos que aquí son N mensajes viajan como
 * UNO. El presupuesto tiene que agrupar igual: si no, vería N mensajes bajo
 * presupuesto en vez de uno por encima, y no aplicaría justo cuando importa.
 *
 * Un «grupo» es una tirada maximal de mensajes de usuario NO separados por un
 * mensaje de asistente. Sólo el asistente crea frontera: el progreso se filtra
 * entero y los adjuntos se funden en el bloque de usuario contiguo, así que
 * ninguno de los dos corta aquí tampoco.
 *
 * Importa en el camino de aborto durante herramientas paralelas: los mensajes
 * de progreso pueden intercalarse entre resultados frescos. Si cortaran, esos
 * resultados se partirían en grupos bajo presupuesto, pasarían sin reemplazo,
 * quedarían congelados, y la normalización los fundiría después en un mensaje
 * por encima del presupuesto — anulando el mecanismo.
 */
function collectCandidatesByMessage(
  messages: Message[],
): ToolResultCandidate[][] {
  const groups: ToolResultCandidate[][] = []
  let current: ToolResultCandidate[] = []

  const flush = () => {
    if (current.length > 0) groups.push(current)
    current = []
  }

  // Se lleva la cuenta de los ids de asistente ya vistos: los fragmentos con
  // el MISMO id los funde la normalización, así que la reaparición de un id ya
  // visto NO puede crear frontera. Ocurre de dos formas: consecutiva —un
  // mensaje por bloque de contenido, con una herramienta rápida drenando en
  // medio— e intercalada, cuando dos respuestas se mezclan en el flujo.
  const seenAsstIds = new Set<string>()
  for (const message of messages) {
    if (message.type === 'user') {
      current.push(...collectCandidatesFromMessage(message))
    } else if (message.type === 'assistant') {
      const id = String(message.message?.id ?? '')
      if (!seenAsstIds.has(id)) {
        flush()
        seenAsstIds.add(id)
      }
    }
    // progress / attachment / system se filtran o se funden: no son frontera.
  }
  flush()

  return groups
}

/**
 * Reparte los candidatos según su decisión previa:
 *  - `mustReapply`: ya reemplazado → se reaplica el reemplazo cacheado;
 *  - `frozen`: ya visto y dejado sin reemplazar → intocable, reemplazarlo
 *    ahora cambiaría un prefijo ya cacheado;
 *  - `fresh`: nunca visto → elegible para una decisión nueva.
 */
function partitionByPriorDecision(
  candidates: ToolResultCandidate[],
  state: ContentReplacementState,
): CandidatePartition {
  return candidates.reduce<CandidatePartition>(
    (acc, c) => {
      const replacement = state.replacements.get(c.toolUseId)
      if (replacement !== undefined) {
        acc.mustReapply.push({ ...c, replacement })
      } else if (state.seenIds.has(c.toolUseId)) {
        acc.frozen.push(c)
      } else {
        acc.fresh.push(c)
      }
      return acc
    },
    { mustReapply: [], frozen: [], fresh: [] },
  )
}

/**
 * Elige los frescos MÁS GRANDES hasta que el total visible para el modelo
 * (congelados + frescos restantes) queda en el presupuesto, o se agotan. Si
 * los congelados por sí solos ya lo exceden, se acepta el exceso: la
 * microcompactación acabará limpiándolos.
 */
function selectFreshToReplace(
  fresh: ToolResultCandidate[],
  frozenSize: number,
  limit: number,
): ToolResultCandidate[] {
  const sorted = [...fresh].sort((a, b) => b.size - a.size)
  const selected: ToolResultCandidate[] = []
  let remaining = frozenSize + fresh.reduce((sum, c) => sum + c.size, 0)
  for (const c of sorted) {
    if (remaining <= limit) break
    selected.push(c)
    // El tamaño del reemplazo no se sabe hasta persistir, pero un preview
    // ronda los 2K y lo que llega aquí es mucho mayor, así que restar el
    // tamaño completo es una aproximación buena para elegir.
    remaining -= c.size
  }
  return selected
}

/**
 * Devuelve un `Message[]` nuevo donde cada bloque cuyo id esté en el mapa
 * lleva su contenido reemplazado. Los mensajes y bloques sin reemplazo se
 * pasan por referencia.
 */
function replaceToolResultContents(
  messages: Message[],
  replacementMap: Map<string, string>,
): Message[] {
  return messages.map(message => {
    if (message.type !== 'user' || !Array.isArray(message.message?.content)) {
      return message
    }
    const content = message.message.content as Array<{
      type: string
      tool_use_id?: string
      [key: string]: unknown
    }>
    const needsReplace = content.some(
      b =>
        b.type === 'tool_result' &&
        b.tool_use_id !== undefined &&
        replacementMap.has(b.tool_use_id),
    )
    if (!needsReplace) return message
    return {
      ...message,
      message: {
        ...message.message,
        content: content.map(block => {
          if (block.type !== 'tool_result' || block.tool_use_id === undefined) {
            return block
          }
          const replacement = replacementMap.get(block.tool_use_id)
          return replacement === undefined
            ? block
            : { ...block, content: replacement }
        }),
      },
    }
  })
}

async function buildReplacement(
  candidate: ToolResultCandidate,
): Promise<{ content: string; originalSize: number } | null> {
  const result = await persistToolResult(candidate.content, candidate.toolUseId)
  if (isPersistError(result)) return null
  return {
    content: buildLargeToolResultMessage(result),
    originalSize: result.originalSize,
  }
}

/**
 * Aplica el presupuesto por mensaje sobre el tamaño agregado de resultados.
 *
 * Para cada mensaje cuyos bloques juntos exceden el límite, los resultados
 * FRESCOS más grandes DE ESE MENSAJE se persisten y se sustituyen por su
 * preview. Los mensajes se evalúan por separado: un resultado de 150K en uno y
 * otro de 150K en otro están ambos bajo presupuesto y no se tocan.
 *
 * El estado va por tool_use_id. Una vez visto un resultado su suerte queda
 * congelada: lo ya reemplazado recibe el MISMO reemplazo cada turno desde la
 * cadena cacheada (cero I/O, byte a byte idéntico), y lo ya visto sin
 * reemplazar no se reemplaza después (rompería la caché).
 *
 * Cada turno añade a lo sumo un mensaje de usuario con resultados, así que el
 * bucle hace la comprobación de presupuesto a lo sumo una vez; los mensajes
 * previos sólo reaplican.
 *
 * @param state MUTADO: `seenIds` y `replacements` se actualizan en el sitio
 *   para registrar lo decidido en esta llamada. Quien llama sostiene una
 *   referencia estable entre turnos; devolver un objeto nuevo obligaría a
 *   actualizar la referencia tras cada consulta, que es fácil de olvidar.
 *
 * Devuelve `{ messages, newlyReplaced }`: `messages` es la MISMA instancia
 * cuando no hace falta reemplazo, y `newlyReplaced` son los reemplazos de
 * ESTA llamada (no las reaplicaciones), que quien llama persiste al
 * transcript para poder reconstruir al reanudar.
 */
export async function enforceToolResultBudget(
  messages: Message[],
  state: ContentReplacementState,
  skipToolNames: ReadonlySet<string> = new Set(),
): Promise<{
  messages: Message[]
  newlyReplaced: ToolResultReplacementRecord[]
}> {
  const candidatesByMessage = collectCandidatesByMessage(messages)
  const nameByToolUseId =
    skipToolNames.size > 0 ? buildToolNameMap(messages) : undefined
  const shouldSkip = (id: string): boolean =>
    nameByToolUseId !== undefined &&
    skipToolNames.has(nameByToolUseId.get(id) ?? '')
  // Se resuelve una vez por llamada. Un cambio de bandera a mitad de sesión
  // sólo afecta a los mensajes FRESCOS —las decisiones previas están
  // congeladas—, así que la caché de lo ya visto se preserva igual.
  const limit = getPerMessageBudgetLimit()

  const replacementMap = new Map<string, string>()
  const toPersist: ToolResultCandidate[] = []
  let reappliedCount = 0
  let messagesOverBudget = 0

  for (const candidates of candidatesByMessage) {
    const { mustReapply, frozen, fresh } = partitionByPriorDecision(
      candidates,
      state,
    )

    // Reaplicar es una consulta pura: sin I/O, idéntica, no puede fallar.
    mustReapply.forEach(c => replacementMap.set(c.toolUseId, c.replacement))
    reappliedCount += mustReapply.length

    // Que haya frescos significa que el mensaje es nuevo. Un mensaje ya
    // procesado tiene `fresh.length === 0` porque todos sus ids entraron en
    // `seenIds` en su primera pasada.
    if (fresh.length === 0) {
      candidates.forEach(c => state.seenIds.add(c.toolUseId))
      continue
    }

    // Las herramientas con `maxResultSizeChars: Infinity` nunca se persisten.
    // Se marcan como vistas para que la decisión se sostenga entre turnos. No
    // cuentan al tamaño fresco; si eso deja al grupo bajo presupuesto y el
    // mensaje sigue siendo grande, ése es el contrato — su propio maxTokens es
    // la cota, no este envoltorio.
    const skipped = fresh.filter(c => shouldSkip(c.toolUseId))
    skipped.forEach(c => state.seenIds.add(c.toolUseId))
    const eligible = fresh.filter(c => !shouldSkip(c.toolUseId))

    const frozenSize = frozen.reduce((sum, c) => sum + c.size, 0)
    const freshSize = eligible.reduce((sum, c) => sum + c.size, 0)

    const selected =
      frozenSize + freshSize > limit
        ? selectFreshToReplace(eligible, frozenSize, limit)
        : []

    // Los candidatos que NO se van a persistir se marcan vistos AHORA, de
    // forma síncrona. Los seleccionados se marcan DESPUÉS del await, junto al
    // `replacements.set` — así el par queda atómico bajo observación y ningún
    // lector concurrente ve un id en `seenIds` y fuera de `replacements`, que
    // lo clasificaría como congelado y mandaría el contenido completo
    // mientras el hilo principal manda el preview.
    const selectedIds = new Set(selected.map(c => c.toolUseId))
    candidates
      .filter(c => !selectedIds.has(c.toolUseId))
      .forEach(c => state.seenIds.add(c.toolUseId))

    if (selected.length === 0) continue
    messagesOverBudget++
    toPersist.push(...selected)
  }

  if (replacementMap.size === 0 && toPersist.length === 0) {
    return { messages, newlyReplaced: [] }
  }

  // Persistencia concurrente de todo lo seleccionado. En la práctica sale de
  // un único mensaje por turno.
  const freshReplacements = await Promise.all(
    toPersist.map(async c => [c, await buildReplacement(c)] as const),
  )
  const newlyReplaced: ToolResultReplacementRecord[] = []
  let replacedSize = 0
  for (const [candidate, replacement] of freshReplacements) {
    // Se marca visto AQUÍ, tras el await, atómicamente con el `set`. Cuando
    // la persistencia falla el id queda visto-sin-reemplazar: el contenido
    // original se mandó al modelo, así que tratarlo como congelado en
    // adelante es lo correcto.
    state.seenIds.add(candidate.toolUseId)
    if (replacement === null) continue
    replacedSize += candidate.size
    replacementMap.set(candidate.toolUseId, replacement.content)
    state.replacements.set(candidate.toolUseId, replacement.content)
    newlyReplaced.push({
      kind: 'tool-result',
      toolUseId: candidate.toolUseId,
      replacement: replacement.content,
    })
    logEvent('tengu_tool_result_persisted_message_budget', {
      originalSizeBytes: replacement.originalSize,
      persistedSizeBytes: replacement.content.length,
      estimatedOriginalTokens: Math.ceil(
        replacement.originalSize / BYTES_PER_TOKEN,
      ),
      estimatedPersistedTokens: Math.ceil(
        replacement.content.length / BYTES_PER_TOKEN,
      ),
    })
  }

  if (replacementMap.size === 0) {
    return { messages, newlyReplaced: [] }
  }

  if (newlyReplaced.length > 0) {
    logForDebugging(
      `Per-message budget: persisted ${newlyReplaced.length} tool results ` +
        `across ${messagesOverBudget} over-budget message(s), ` +
        `shed ~${formatFileSize(replacedSize)}, ${reappliedCount} re-applied`,
    )
    logEvent('tengu_message_level_tool_result_budget_enforced', {
      resultsPersisted: newlyReplaced.length,
      messagesOverBudget,
      replacedSizeBytes: replacedSize,
      reapplied: reappliedCount,
    })
  }

  return {
    messages: replaceToolResultContents(messages, replacementMap),
    newlyReplaced,
  }
}

/**
 * Punto de integración con el bucle de consulta.
 *
 * Se cierra sobre `state` —`undefined` significa mecanismo apagado, y
 * devuelve tal cual—, aplica el presupuesto, y dispara una escritura opcional
 * al transcript para los reemplazos nuevos. Quien llama es dueño de esa
 * puerta: pasa el callback sólo para los orígenes que releen registros al
 * reanudar, y lo omite para las consultas efímeras.
 */
export async function applyToolResultBudget(
  messages: Message[],
  state: ContentReplacementState | undefined,
  writeToTranscript?: (records: ToolResultReplacementRecord[]) => void,
  skipToolNames?: ReadonlySet<string>,
): Promise<Message[]> {
  if (!state) return messages
  const result = await enforceToolResultBudget(messages, state, skipToolNames)
  if (result.newlyReplaced.length > 0) {
    writeToTranscript?.(result.newlyReplaced)
  }
  return result.messages
}

/**
 * Reconstruye el estado desde los registros cargados del transcript, para que
 * al reanudar el presupuesto tome las mismas decisiones que en la sesión
 * original.
 *
 * Admite el `ContentReplacementRecord[]` completo (puede traer clases futuras)
 * y sólo aplica las de resultado de herramienta.
 *
 *   - `replacements` se puebla directo desde las cadenas guardadas. Un
 *     registro cuyo id no está en los mensajes —por ejemplo tras compactar—
 *     se omite: es inerte de todos modos.
 *   - `seenIds` recibe TODO id candidato de los mensajes cargados. Que un
 *     resultado esté en el transcript significa que se le mandó al modelo, o
 *     sea que se vio; eso congela lo no reemplazado contra un reemplazo
 *     futuro.
 *   - `inheritedReplacements` rellena huecos al reanudar una bifurcación. Su
 *     ejecución original aplicó los reemplazos heredados del padre por la vía
 *     de reaplicar —nunca persistidos, nunca `newlyReplaced`—, así que en la
 *     cadena hay contenido original sin registro y los registros solos lo
 *     clasificarían como congelado. El estado vivo del padre aún tiene el
 *     mapeo; se copia para los ids que los registros no cubren. Es un no-op
 *     fuera de ese caso, porque los ids del padre no están en los mensajes
 *     del subagente.
 */
export function reconstructContentReplacementState(
  messages: Message[],
  records: ContentReplacementRecord[],
  inheritedReplacements?: ReadonlyMap<string, string>,
): ContentReplacementState {
  const state = createContentReplacementState()
  const candidateIds = new Set(
    collectCandidatesByMessage(messages)
      .flat()
      .map(c => c.toolUseId),
  )

  for (const id of candidateIds) {
    state.seenIds.add(id)
  }
  for (const r of records) {
    if (r.kind === 'tool-result' && candidateIds.has(r.toolUseId)) {
      state.replacements.set(r.toolUseId, r.replacement)
    }
  }
  if (inheritedReplacements) {
    for (const [id, replacement] of inheritedReplacements) {
      if (candidateIds.has(id) && !state.replacements.has(id)) {
        state.replacements.set(id, replacement)
      }
    }
  }
  return state
}

/**
 * Variante para reanudar un subagente: encapsula la puerta de la bandera y el
 * relleno desde el padre para que las dos vías de reanudación compartan una
 * sola implementación. Devuelve `undefined` cuando no hay estado del padre
 * (mecanismo apagado); si no, reconstruye desde los registros de la cadena con
 * los reemplazos vivos del padre rellenando los huecos de lo heredado.
 */
export function reconstructForSubagentResume(
  parentState: ContentReplacementState | undefined,
  resumedMessages: Message[],
  sidechainRecords: ContentReplacementRecord[],
): ContentReplacementState | undefined {
  if (!parentState) return undefined
  return reconstructContentReplacementState(
    resumedMessages,
    sidechainRecords,
    parentState.replacements,
  )
}

/** Mensaje legible para un error de sistema de archivos. */
function getFileSystemErrorMessage(error: Error): string {
  const nodeError = error as NodeJS.ErrnoException
  if (nodeError.code) {
    switch (nodeError.code) {
      case 'ENOENT':
        return `Directory not found: ${nodeError.path ?? 'unknown path'}`
      case 'EACCES':
        return `Permission denied: ${nodeError.path ?? 'unknown path'}`
      case 'ENOSPC':
        return 'No space left on device'
      case 'EROFS':
        return 'Read-only file system'
      case 'EMFILE':
        return 'Too many open files'
      case 'EEXIST':
        return `File already exists: ${nodeError.path ?? 'unknown path'}`
      default:
        return `${nodeError.code}: ${nodeError.message}`
    }
  }
  return error.message
}
