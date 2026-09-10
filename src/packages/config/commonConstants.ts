/**
 * Puerto de `ccnmt: packages/config/commonConstants.ts` (32 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * `lodash-es` SÍ resuelve en este árbol (dependencia real de
 * `package.json`, verificado con `require.resolve` antes de escribir este
 * archivo) — se importa estático, sin envoltorio diferido.
 */
import memoize from 'lodash-es/memoize.js'
import { readEnv } from './env/utils.ts'

// Garantiza obtener la fecha LOCAL en formato ISO.
export function getLocalISODate(): string {
  // Comprueba el override de fecha (sólo para uso interno de ant).
  const override = readEnv('CLAUDE_CODE_OVERRIDE_DATE')
  if (override) return override

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Memoizado para la estabilidad del prompt-cache — captura la fecha una
// sola vez al inicio de la sesión. La ruta interactiva principal obtiene
// este comportamiento vía `memoize(getUserContext)` en `context.ts`; el
// modo simple (`--bare`) llama a `getSystemPrompt` por request y necesita
// una fecha memoizada explícita para no romper el prefijo cacheado a
// medianoche. Cuando la medianoche pasa, `getDateChangeAttachments` añade
// la nueva fecha al final (aunque el modo simple deshabilita attachments,
// así que el trade-off ahí es: fecha vieja tras medianoche vs. reventar la
// caché de la conversación entera — gana la fecha vieja).
export const getSessionStartDate = memoize(getLocalISODate)

// Devuelve "Mes AAAA" (p. ej. "February 2026") en la zona horaria local del
// usuario. Cambia mensualmente, no diariamente — se usa en prompts de
// herramientas para minimizar la invalidación de caché.
export function getLocalMonthYear(): string {
  const override = readEnv('CLAUDE_CODE_OVERRIDE_DATE')
  const date = override ? new Date(override) : new Date()
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
