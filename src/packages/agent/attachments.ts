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
 * NO se portan (sin consumidor en este árbol todavía): el resto del
 * orquestador — `getIdeSelectionAttachment`, `memoryFilesToAttachments`,
 * los builders de plan-mode/auto-mode/TODO reminder que consumen estas
 * constantes, el surfacer de memorias relevantes. Cada uno se trae
 * cuando un test lo ejercite, no antes (mismo criterio que
 * `attachments/mailbox.ts` aplica a su propio recorte).
 */
import { randomUUID } from 'node:crypto'
import { dirname, parse, resolve } from 'node:path'
import type { AttachmentMessage } from './messageShapes.js'

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
