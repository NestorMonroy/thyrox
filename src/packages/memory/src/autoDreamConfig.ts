/**
 * Puerto de `ccnmt: packages/memory/src/autoDreamConfig.ts`, con
 * `getInitialSettings` desde el sustituto local
 * `./internal/pendingCrossPackageDeps.js` (`config/settings` no está
 * portado en `@thyrox/config`).
 *
 * Recordado como un flag de settings — controla el toggle visible al
 * usuario en la fila "Auto-dream: on/off" de `/memory`. Con `/dream`
 * disparado por cron (subsistema 1 del porte de KAIROS, mayo 2026), este
 * flag es puramente un hint de UI: le dice al modelo si el usuario quiere
 * consolidación nocturna. La programación real vive en
 * `.claude/scheduled_tasks.json` vía el flujo `/dream nightly`.
 */

import { getInitialSettings } from './internal/pendingCrossPackageDeps.js'

export function isAutoDreamEnabled(): boolean {
  // Default true — los usuarios de auto-memoria quieren consolidación
  // salvo que digan lo contrario. Mismo default que la implementación
  // legado del stop-hook.
  return getInitialSettings().autoDreamEnabled !== false
}
