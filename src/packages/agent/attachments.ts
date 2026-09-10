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
 * NO se portan (sin consumidor en este árbol todavía): el resto del
 * orquestador — `getIdeSelectionAttachment`, `memoryFilesToAttachments`,
 * los builders de plan-mode/auto-mode/TODO reminder que consumen estas
 * constantes, el surfacer de memorias relevantes. Cada uno se trae
 * cuando un test lo ejercite, no antes (mismo criterio que
 * `attachments/mailbox.ts` aplica a su propio recorte).
 */
import { dirname, parse, resolve } from 'node:path'

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
