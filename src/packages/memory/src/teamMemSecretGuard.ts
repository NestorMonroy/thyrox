/**
 * Puerto de `ccnmt: packages/memory/src/teamMemSecretGuard.ts`. La fuente
 * usa `require()` perezoso guardado por `feature('TEAMMEM')` para dos
 * imports internos — un truco de bundler sin necesidad aquí (no hay ciclo
 * de import entre `teamMemPaths.ts`/`teamMemSecretScanner.ts` y este
 * archivo): se portan como imports estáticos normales.
 */
import { feature } from 'bun:bundle'
import { isTeamMemPath } from './teamMemPaths.js'
import { scanForSecrets } from './teamMemSecretScanner.js'

/**
 * Verifica si una escritura/edición a una ruta de memoria de equipo
 * contiene secretos. Devuelve un mensaje de error si se detectan secretos,
 * o null si es segura.
 *
 * Se llama desde `validateInput` de FileWriteTool y FileEditTool para
 * evitar que el modelo escriba secretos en archivos de memoria de equipo,
 * que se sincronizarían con todos los colaboradores del repositorio.
 *
 * Los llamadores pueden importar y llamar esto incondicionalmente — la
 * guarda interna `feature('TEAMMEM')` lo deja inerte cuando el flag de
 * build está apagado. `secretScanner` ensambla los prefijos sensibles en
 * tiempo de ejecución (`ANT_KEY_PFX`).
 */
export function checkTeamMemSecrets(
  filePath: string,
  content: string,
): string | null {
  if (feature('TEAMMEM')) {
    if (!isTeamMemPath(filePath)) {
      return null
    }

    const matches = scanForSecrets(content)
    if (matches.length === 0) {
      return null
    }

    const labels = matches.map(m => m.label).join(', ')
    return (
      `Content contains potential secrets (${labels}) and cannot be written to team memory. ` +
      'Team memory is shared with all repository collaborators. ' +
      'Remove the sensitive content and try again.'
    )
  }
  return null
}
