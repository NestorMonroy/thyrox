/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/clear/index.ts`.
 * Porte COMPLETO — sólo cita `../../runtime.js` (hermano ya portado).
 *
 * El comando clear sólo trae metadata mínima aquí; la implementación se
 * carga en diferido desde `clear.ts` para reducir el tiempo de arranque.
 * Funciones utilitarias: `clearSessionCaches` (en `caches.ts`) y
 * `clearConversation` (en `conversation.ts`) — ninguna de las dos se porta
 * en este pase (ver el reporte final: bloqueadas por `repl`/`agent`
 * ausentes o en construcción concurrente).
 */
import type { Command } from '../../runtime.js'

const clear = {
  type: 'local',
  name: 'clear',
  description: 'Clear conversation history and free up context',
  aliases: ['reset', 'new'],
  supportsNonInteractive: false, // Debe sólo crear una sesión nueva
  load: () => import('./clear.js'),
} satisfies Command

export default clear
