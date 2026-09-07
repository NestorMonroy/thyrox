/**
 * Puerto de `ccnmt: packages/updater/src/binaryCheck.ts` (53 líneas
 * fuente, 100% portado). Chequeo de binario instalado, con cache de
 * sesión (Map en memoria) para no repetir el `which` en cada llamada.
 */

import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { which } from '@thyrox/shell/which.js'

// Cache de sesion para evitar chequeos repetidos
const binaryCache = new Map<string, boolean>()

/**
 * Comprueba si un binario/comando esta instalado y disponible en el
 * sistema. Usa 'which' en sistemas Unix (macOS, Linux, WSL) y 'where' en
 * Windows.
 *
 * @param command - El nombre del comando a chequear (p.ej. 'gopls', 'rust-analyzer')
 * @returns Promise<boolean> - true si el comando existe, false en otro caso
 */
export async function isBinaryInstalled(command: string): Promise<boolean> {
  // Caso borde: comando vacio o solo espacios
  if (!command || !command.trim()) {
    logForDebugging('[binaryCheck] Empty command provided, returning false')
    return false
  }

  // Recorta el comando para manejar espacios
  const trimmedCommand = command.trim()

  // Chequea la cache primero
  const cached = binaryCache.get(trimmedCommand)
  if (cached !== undefined) {
    logForDebugging(
      `[binaryCheck] Cache hit for '${trimmedCommand}': ${cached}`,
    )
    return cached
  }

  let exists = false
  if (await which(trimmedCommand).catch(() => null)) {
    exists = true
  }

  // Cachea el resultado
  binaryCache.set(trimmedCommand, exists)

  logForDebugging(
    `[binaryCheck] Binary '${trimmedCommand}' ${exists ? 'found' : 'not found'}`,
  )

  return exists
}

/**
 * Limpia la cache de chequeo de binarios (util para testing)
 */
export function clearBinaryCache(): void {
  binaryCache.clear()
}
