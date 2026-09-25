/**
 * Attachment-cadence config + system-directories path walker — porte
 * PARCIAL DECLARADO de `ccnmt: packages/agent/attachments.ts` (124 029
 * bytes en la fuente).
 *
 * La fuente es el orquestador completo de "system-reminder" attachments:
 * memorias relevantes, recordatorios de plan-mode/auto-mode, TODO
 * reminders, selección de líneas en el IDE, archivos anidados CLAUDE.md
 * por directorio, etc. Este puerto sólo trae los símbolos que sus tests
 * ejercitan hasta ahora — dos ejes independientes, sin cruce entre sí:
 *
 *  1. Las cinco constantes de cadencia/memoria (`TODO_REMINDER_CONFIG`,
 *     `PLAN_MODE_ATTACHMENT_CONFIG`, `AUTO_MODE_ATTACHMENT_CONFIG`,
 *     `RELEVANT_MEMORIES_CONFIG`, `VERIFY_PLAN_REMINDER_CONFIG`) — sus
 *     valores literales SON su contrato (gobiernan cadencia real de
 *     re-inyección), se reproducen verbatim.
 *  2. `getDirectoriesToProcess` — el recorrido puro de directorios que
 *     decide qué `CLAUDE.md`/`.claude/rules/*.md` se cargan por archivo
 *     tocado. Reimplementado (no copiado) a partir del algoritmo de la
 *     fuente: mismo comportamiento observable, escrito de cero.
 *
 *  3. `createAttachmentMessage` — el mensaje de transcripción que envuelve
 *     un adjunto: contrato de `Kd` en 2.1.275 (`chunk-mdt3sxrw.js`).
 *
 *  4. Lo que `compaction/compact.ts` consume al re-anunciar el estado tras
 *     una compactación: `generateFileAttachment` (:3121, con
 *     `tryGetPDFReference`), `getAgentListingDeltaAttachment` (:1592),
 *     `getMcpInstructionsDeltaAttachment` (:1661) y
 *     `getDeferredToolsDeltaAttachment` (:1557). Los tipos de adjunto que
 *     devuelven (`FileAttachment`, `PDFReferenceAttachment`, …) viven en la
 *     fuente en `repl/replTypes/message.js`; aquí `AttachmentMessage` sólo
 *     exige `{ type: string }`, así que se declaran localmente con los
 *     campos que la fuente construye.
 *
 *     Dos de ellas quedan PARCIALES, declaradas, porque su dependencia
 *     vive en un archivo fuera del alcance de este porte:
 *
 *     - `getDeferredToolsDeltaAttachment`: su cálculo
 *       (`getDeferredToolsDelta`, `modelSupportsToolReference`,
 *       `isDeferredToolsDeltaEnabled`, `DeferredToolsDeltaScanContext`)
 *       vive en `toolSearch.ts`, y el gate que este árbol publica
 *       (`provider/src/internal/legacyRuntimeSupport.ts`) devuelve `false`.
 *       Se conserva su firma y las dos guardas que sí existen; hasta que
 *       `toolSearch.ts` porte el resto devuelve `[]`, que es exactamente lo
 *       que la fuente devuelve con el gate cerrado.
 *     - `getAgentListingDeltaAttachment`: su gate
 *       (`shouldInjectAgentListInMessages`) y el formato de cada línea
 *       (`formatAgentLine`) viven en
 *       `tool-registry/src/tools/AgentTool/prompt.ts`, que el mapa de
 *       exports de `@thyrox/tool-registry` NO publica (sí publica
 *       `AgentTool.js`, `constants.js`, `loadAgentsDir.js`…). Hasta que ese
 *       mapa lo exponga, la función conserva su firma y devuelve `[]` —
 *       lo que la fuente devuelve con el gate cerrado—. Por la misma razón
 *       `generateFileAttachment` omite la comprobación previa de tamaño en
 *       modo `at-mention` (`getDefaultFileReadingLimits`, de
 *       `FileReadTool/limits.ts`, tampoco publicado): un archivo demasiado
 *       grande sigue llegando a `FileReadTool`, que lanza
 *       `FileTooLargeError`, y de ahí a la lectura truncada; lo que se
 *       pierde es el corte temprano y su evento de telemetría.
 *
 * NO se portan (sin consumidor en este árbol todavía): el resto del
 * orquestador — `getIdeSelectionAttachment`, `memoryFilesToAttachments`,
 * los builders de plan-mode/auto-mode/TODO reminder que consumen estas
 * constantes, el surfacer de memorias relevantes. Cada uno se trae
 * cuando un test lo ejercite, no antes (mismo criterio que
 * `attachments/mailbox.ts` aplica a su propio recorte).
 */
import { randomUUID } from 'node:crypto'
import { dirname, parse, relative, resolve } from 'node:path'
import type { AttachmentMessage, Message } from './messageShapes.js'
import { logEvent } from '@thyrox/local-observability'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import type { Tools, ToolPermissionContext, ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import {
  FileReadTool,
  MaxFileReadTokenExceededError,
  type Output as FileReadToolOutput,
} from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import { MAX_LINES_TO_READ } from '@thyrox/tool-registry/tools/FileReadTool/prompt.js'
import { getPDFPageCount } from '@thyrox/tool-registry/pdf.js'
import { FileTooLargeError } from '@thyrox/repl/readFileInRange.js'
import { getFileModificationTimeAsync } from '@thyrox/storage/file.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { isPDFExtension } from '@thyrox/storage/pdfUtils.js'
import { PDF_AT_MENTION_INLINE_THRESHOLD } from '@thyrox/provider/apiLimits.js'
import { countCharInString } from '@thyrox/output/utils/stringUtils.js'
import { matchingRuleForInput } from '@thyrox/permission/filesystem'
import type { MCPServerConnection } from '@thyrox/mcp-runtime/types.js'
import {
  type ClientSideInstruction,
  getMcpInstructionsDelta,
  isMcpInstructionsDeltaEnabled,
} from '@thyrox/mcp-runtime/mcpInstructionsDelta'
import { isToolSearchEnabledOptimistic, isToolSearchToolAvailable } from './toolSearch.js'
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from './claudeInChromeCommon.js'
import { CHROME_TOOL_SEARCH_INSTRUCTIONS } from './claudeInChrome/prompt.js'

export const TODO_REMINDER_CONFIG = {
  TURNS_SINCE_WRITE: 10,
  TURNS_BETWEEN_REMINDERS: 10,
} as const

export const PLAN_MODE_ATTACHMENT_CONFIG = {
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
} as const

export const AUTO_MODE_ATTACHMENT_CONFIG = {
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
} as const

export const RELEVANT_MEMORIES_CONFIG = {
  // Presupuesto por turno: 5 archivos × 4KB = 20KB. El tope de sesión es
  // ~3 inyecciones completas (60KB); pasado eso, las memorias más
  // relevantes ya están en contexto y seguir buscando no aporta.
  MAX_SESSION_BYTES: 60 * 1024,
} as const

export const VERIFY_PLAN_REMINDER_CONFIG = {
  TURNS_BETWEEN_REMINDERS: 10,
} as const

/**
 * Directorios a recorrer para cargar memoria anidada (CLAUDE.md +
 * `.claude/rules/*.md`) al tocar `targetPath` desde `originalCwd`.
 *
 * Devuelve dos listas, ambas ordenadas de padre a hijo:
 *  - `nestedDirs`: directorios ENTRE `originalCwd` y el directorio de
 *    `targetPath` (se procesan para CLAUDE.md + TODAS las reglas).
 *  - `cwdLevelDirs`: directorios desde la raíz del filesystem hasta
 *    `originalCwd` (se procesan sólo para reglas condicionales).
 *
 * `targetPath` se resuelve con `resolve()` — un path relativo se
 * resuelve contra `process.cwd()`, no contra `originalCwd`.
 */
export function getDirectoriesToProcess(
  targetPath: string,
  originalCwd: string,
): { nestedDirs: string[]; cwdLevelDirs: string[] } {
  const targetDir = dirname(resolve(targetPath))

  const nestedDirs: string[] = []
  let cursor = targetDir
  while (cursor !== originalCwd && cursor !== parse(cursor).root) {
    if (cursor.startsWith(originalCwd)) {
      nestedDirs.push(cursor)
    }
    cursor = dirname(cursor)
  }
  nestedDirs.reverse()

  const cwdLevelDirs: string[] = []
  cursor = originalCwd
  while (cursor !== parse(cursor).root) {
    cwdLevelDirs.push(cursor)
    cursor = dirname(cursor)
  }
  cwdLevelDirs.reverse()

  return { nestedDirs, cwdLevelDirs }
}

/**
 * Envuelve un adjunto en un mensaje de transcripción con su propio uuid y
 * la marca de tiempo ISO de su creación (≙ `Kd` de 2.1.275).
 */
export function createAttachmentMessage<T extends { type: string }>(attachment: T): AttachmentMessage<T> {
  return {
    type: 'attachment',
    attachment,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  } as AttachmentMessage<T>
}

// ---------------------------------------------------------------------------
// Estado del listado de skills — porte de 2.1.275 (2026-09-24): la clase
// `xJn` por sesión y `VB`, `I1r`, `P1r`, `M6n`, `O6n`, `eCs`
// (`chunk-q2gh92k2.js`). Recuerda qué skills se anunciaron a cada agente
// (clave vacía = hilo principal) para anunciar sólo las nuevas.
// ---------------------------------------------------------------------------

type SkillListingState = {
  sentSkillNames: Map<string, Set<string>>
  suppressNext: boolean
  resumeSeedNames: Set<string> | null
}

const skillListingBySession = new Map<string, SkillListingState>()

// `c7`: el estado de la sesión actual; sin estado de app, una sesión única.
function skillListingState(): SkillListingState {
  let session = 'default'
  try {
    session = require('@thyrox/app-host/bootstrap/state.js').getSessionId() ?? session
  } catch {}
  let state = skillListingBySession.get(session)
  if (!state) {
    state = { sentSkillNames: new Map(), suppressNext: false, resumeSeedNames: null }
    skillListingBySession.set(session, state)
  }
  return state
}

/** `VB`: olvida todo lo anunciado, la supresión y la semilla. */
export function resetSentSkillNames(): void {
  const state = skillListingState()
  state.sentSkillNames.clear()
  state.suppressNext = false
  state.resumeSeedNames = null
}

/** `I1r`: el próximo listado del hilo principal se da por visto (p. ej. al reanudar). */
export function suppressNextSkillListing(): void {
  skillListingState().suppressNext = true
}

/** `P1r`: nombres que la transcripción reanudada ya anunció. */
export function seedSentSkillNames(names: Iterable<string>): void {
  const state = skillListingState()
  if (state.resumeSeedNames === null) state.resumeSeedNames = new Set()
  for (const name of names) state.resumeSeedNames.add(name)
}

/** `M6n`: olvida lo anunciado a un agente. */
export function forgetSentSkillsForAgent(agentId: string): void {
  skillListingState().sentSkillNames.delete(agentId)
}

/** `O6n`: olvida unos nombres en todos los agentes, y en la semilla. */
export function forgetSentSkillNames(names: Iterable<string>): void {
  const state = skillListingState()
  const list = [...names]
  for (const sent of state.sentSkillNames.values()) for (const name of list) sent.delete(name)
  if (state.resumeSeedNames !== null) for (const name of list) state.resumeSeedNames.delete(name)
}

/**
 * `eCs`: las skills que faltan por anunciar a ese agente, y si es el primer
 * anuncio; `null` si no hay nada nuevo. La semilla y la supresión sólo
 * valen para el hilo principal y se consumen al usarse.
 */
export function getSkillListingDelta<S extends { name: string }>(
  agentId: string | undefined,
  skills: S[],
): { newSkills: S[]; isInitial: boolean } | null {
  const state = skillListingState()
  const key = agentId ?? ''
  let sent = state.sentSkillNames.get(key)
  if (!sent) state.sentSkillNames.set(key, (sent = new Set()))
  if (state.resumeSeedNames !== null && agentId === undefined) {
    for (const skill of skills) if (state.resumeSeedNames.has(skill.name)) sent.add(skill.name)
    state.resumeSeedNames = null
  }
  if (state.suppressNext && agentId === undefined) {
    state.suppressNext = false
    for (const skill of skills) sent.add(skill.name)
    return null
  }
  const newSkills = skills.filter(skill => !sent!.has(skill.name))
  if (newSkills.length === 0) return null
  const isInitial = sent.size === 0
  for (const skill of newSkills) sent.add(skill.name)
  return { newSkills, isInitial }
}

// ---------------------------------------------------------------------------
// Adjuntos de archivo y re-anuncio de estado tras compactación — porte de
// `ccnmt: packages/agent/attachments.ts` (:1557-1688, :3087-3300, :3813).
// ---------------------------------------------------------------------------

/**
 * Un adjunto de estado: lo único que `AttachmentMessage` exige es su `type`.
 * NO se exporta: `repl/components/messages/AttachmentMessage.tsx` importa un
 * `Attachment` de este módulo esperando la unión discriminada de la fuente
 * (`repl/replTypes/message.js`), y publicar aquí esta forma laxa le
 * volvería `unknown` cada campo (medido: 8 → 78 errores en ese archivo).
 */
type StateAttachment = { type: string; [key: string]: unknown }

export type FileAttachment = {
  type: 'file'
  filename: string
  content: FileReadToolOutput
  truncated?: boolean
  displayPath: string
}

export type CompactFileReferenceAttachment = {
  type: 'compact_file_reference'
  filename: string
  displayPath: string
}

export type PDFReferenceAttachment = {
  type: 'pdf_reference'
  filename: string
  pageCount: number
  fileSize: number
  displayPath: string
}

export type AlreadyReadFileAttachment = {
  type: 'already_read_file'
  filename: string
  displayPath: string
  content: {
    type: 'text'
    file: {
      filePath: string
      content: string
      numLines: number
      startLine: number
      totalLines: number
    }
  }
}

/**
 * Sitio de llamada del escaneo de herramientas diferidas
 * (`ccnmt: packages/agent/toolSearch.ts:618`). Su hogar es `toolSearch.ts`;
 * se declara aquí porque ese archivo queda fuera de este porte y la firma de
 * `getDeferredToolsDeltaAttachment` lo necesita.
 */
export type DeferredToolsDeltaScanContext = {
  callSite: 'attachments_main' | 'attachments_subagent' | 'compact_full' | 'compact_partial' | 'reactive_compact'
  querySource?: string
}

/**
 * Diferencia entre el pool de herramientas diferidas y lo ya anunciado en
 * la conversación (`ccnmt: attachments.ts:1557`).
 *
 * PARCIAL, declarado en la cabecera: el gate y el cálculo del delta viven en
 * `toolSearch.ts`, fuera de este porte. Las dos guardas que sí existen se
 * conservan en su orden; el resto devuelve `[]`, que es lo que la fuente
 * devuelve con `isDeferredToolsDeltaEnabled()` cerrado — el valor que este
 * árbol publica hoy.
 */
export function getDeferredToolsDeltaAttachment(
  tools: Tools,
  model: string,
  messages: Message[] | undefined,
  scanContext?: DeferredToolsDeltaScanContext,
): StateAttachment[] {
  // pendiente: `isDeferredToolsDeltaEnabled()` (toolSearch.ts:639) — el gate
  // de este árbol devuelve false, así que la fuente cortaría aquí.
  if (!isToolSearchEnabledOptimistic()) return []
  if (!isToolSearchToolAvailable(tools)) return []
  // pendiente: `modelSupportsToolReference(model)` (toolSearch.ts:239) y
  // `getDeferredToolsDelta(tools, messages ?? [], scanContext)`
  // (toolSearch.ts:653) — sin ellos no hay delta que anunciar.
  void model
  void messages
  void scanContext
  return []
}

/**
 * Diferencia entre el pool de agentes filtrado y lo ya anunciado en la
 * conversación, reconstruido de los `agent_listing_delta` previos
 * (`ccnmt: attachments.ts:1592`). Exportada para `compact.ts`: tras
 * compactar, re-anuncia el pool entero.
 *
 * PARCIAL, declarado en la cabecera: devuelve `[]` hasta que
 * `@thyrox/tool-registry` publique `tools/AgentTool/prompt.js`.
 */
export function getAgentListingDeltaAttachment(
  toolUseContext: ToolUseContext,
  messages: Message[] | undefined,
): StateAttachment[] {
  // pendiente: `shouldInjectAgentListInMessages()` (AgentTool/prompt.ts:59)
  // es el gate de la fuente, y `formatAgentLine` (:43) el formato de cada
  // línea anunciada; el filtrado (requisitos MCP → reglas de denegación →
  // `allowedAgentTypes`) y la reconstrucción de lo ya anunciado a partir
  // de los `agent_listing_delta` del historial van detrás de ese gate.
  void toolUseContext
  void messages
  return []
}

/**
 * Exportada para `compact.ts` / `reactiveCompact.ts` — única fuente del gate
 * (`ccnmt: attachments.ts:1661`).
 */
export function getMcpInstructionsDeltaAttachment(
  mcpClients: MCPServerConnection[],
  tools: Tools,
  model: string,
  messages: Message[] | undefined,
): StateAttachment[] {
  if (!isMcpInstructionsDeltaEnabled()) return []

  // La pista de ToolSearch para Chrome la redacta el cliente y depende de
  // ToolSearch; las `instructions` reales del servidor son incondicionales.
  // La parte del cliente se decide aquí y entra al diff como una entrada
  // sintetizada.
  // pendiente: `modelSupportsToolReference(model)` (toolSearch.ts:239) — la
  // tercera condición de la fuente para la pista de Chrome; sin ella la
  // pista se anuncia sólo con las dos guardas que este árbol tiene.
  void model
  const clientSide: ClientSideInstruction[] = []
  if (isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(tools)) {
    clientSide.push({
      serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
      block: CHROME_TOOL_SEARCH_INSTRUCTIONS,
    })
  }

  const delta = getMcpInstructionsDelta(mcpClients, messages ?? [], clientSide)
  if (!delta) return []
  return [{ type: 'mcp_instructions_delta', ...delta }]
}

export async function tryGetPDFReference(filename: string): Promise<PDFReferenceAttachment | null> {
  const ext = parse(filename).ext.toLowerCase()
  if (!isPDFExtension(ext)) {
    return null
  }
  try {
    const [stats, pageCount] = await Promise.all([getFsImplementation().stat(filename), getPDFPageCount(filename)])
    // Con conteo de páginas se usa; si no, heurística de tamaño (~100KB por página).
    const effectivePageCount = pageCount ?? Math.ceil(stats.size / (100 * 1024))
    if (effectivePageCount > PDF_AT_MENTION_INLINE_THRESHOLD) {
      logEvent('tengu_pdf_reference_attachment', {
        pageCount: effectivePageCount,
        fileSize: stats.size,
        hadPdfinfo: pageCount !== null,
      })
      return {
        type: 'pdf_reference',
        filename,
        pageCount: effectivePageCount,
        fileSize: stats.size,
        displayPath: relative(getCwd(), filename),
      }
    }
  } catch {
    // Si no se puede hacer stat, null: sigue la lectura normal.
  }
  return null
}

/**
 * Lee un archivo con FileReadTool (contenido fresco, validación propia) y lo
 * envuelve como adjunto (`ccnmt: attachments.ts:3121`). En modo `compact` un
 * archivo demasiado grande se reduce a una referencia; en `at-mention` a su
 * cabecera.
 */
export async function generateFileAttachment(
  filename: string,
  toolUseContext: ToolUseContext,
  successEventName: string,
  errorEventName: string,
  mode: 'compact' | 'at-mention',
  options?: {
    offset?: number
    limit?: number
  },
): Promise<FileAttachment | CompactFileReferenceAttachment | PDFReferenceAttachment | AlreadyReadFileAttachment | null> {
  const { offset, limit } = options ?? {}

  // ¿Hay una regla de denegación para este archivo?
  const appState = toolUseContext.getAppState()
  if (isFileReadDenied(filename, appState.toolPermissionContext)) {
    return null
  }

  // pendiente: en modo `at-mention` la fuente corta antes de leer si el
  // archivo supera `getDefaultFileReadingLimits().maxSizeBytes`
  // (`FileReadTool/limits.ts`, no publicado por `@thyrox/tool-registry`) y
  // emite `tengu_attachment_file_too_large`; aquí el archivo grande llega a
  // `FileReadTool`, que lanza `FileTooLargeError`, y cae a la lectura
  // truncada de más abajo.

  // Un PDF grande mencionado con @ se devuelve como referencia ligera.
  if (mode === 'at-mention') {
    const pdfRef = await tryGetPDFReference(filename)
    if (pdfRef) {
      return pdfRef
    }
  }

  // ¿El archivo ya está en contexto con su versión más reciente?
  const existingFileState = toolUseContext.readFileState.get(filename)
  if (existingFileState && mode === 'at-mention') {
    try {
      const mtimeMs = await getFileModificationTimeAsync(filename)

      // FileReadTool guarda Date.now() al leer; FileEdit/Write guardan el
      // mtimeMs del archivo. Sólo con un timestamp que coincida con el
      // mtime se puede afirmar que el archivo no cambió.
      if (existingFileState.timestamp <= mtimeMs && mtimeMs === existingFileState.timestamp) {
        logEvent(successEventName, {})
        return {
          type: 'already_read_file',
          filename,
          displayPath: relative(getCwd(), filename),
          content: {
            type: 'text',
            file: {
              filePath: filename,
              content: existingFileState.content,
              numLines: countCharInString(existingFileState.content, '\n') + 1,
              startLine: offset ?? 1,
              totalLines: countCharInString(existingFileState.content, '\n') + 1,
            },
          },
        }
      }
    } catch {
      // Sin stat, sigue la lectura normal.
    }
  }

  try {
    const fileInput = {
      file_path: filename,
      offset,
      limit,
    }

    const readTruncatedFile = async (): Promise<FileAttachment | CompactFileReferenceAttachment | null> => {
      if (mode === 'compact') {
        return {
          type: 'compact_file_reference',
          filename,
          displayPath: relative(getCwd(), filename),
        }
      }

      // Reglas de denegación también antes de la lectura truncada.
      const appState = toolUseContext.getAppState()
      if (isFileReadDenied(filename, appState.toolPermissionContext)) {
        return null
      }

      try {
        // Sólo las primeras MAX_LINES_TO_READ líneas de un archivo demasiado grande.
        const truncatedInput = {
          file_path: filename,
          offset: offset ?? 1,
          limit: MAX_LINES_TO_READ,
        }
        const result = await FileReadTool.call(truncatedInput, toolUseContext)
        logEvent(successEventName, {})

        return {
          type: 'file',
          filename,
          content: result.data,
          truncated: true,
          displayPath: relative(getCwd(), filename),
        }
      } catch {
        logEvent(errorEventName, {})
        return null
      }
    }

    // ¿La ruta es válida?
    const isValid = await FileReadTool.validateInput(fileInput, toolUseContext)
    if (!isValid.result) {
      return null
    }

    try {
      const result = await FileReadTool.call(fileInput, toolUseContext)
      logEvent(successEventName, {})
      return {
        type: 'file',
        filename,
        content: result.data,
        displayPath: relative(getCwd(), filename),
      }
    } catch (error) {
      if (error instanceof MaxFileReadTokenExceededError || error instanceof FileTooLargeError) {
        return await readTruncatedFile()
      }
      throw error
    }
  } catch {
    logEvent(errorEventName, {})
    return null
  }
}

function isFileReadDenied(filePath: string, toolPermissionContext: ToolPermissionContext): boolean {
  const denyRule = matchingRuleForInput(filePath, toolPermissionContext, 'read', 'deny')
  return denyRule !== null
}
