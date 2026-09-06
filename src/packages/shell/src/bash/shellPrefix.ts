import { quote } from './shellQuote.js'

/**
 * Compone un prefijo de shell (ejecutable + flags opcionales) con el
 * comando a ejecutar, citando cada parte por separado.
 *
 * Ejemplos:
 * - "bash" → cita como 'bash'
 * - "/usr/bin/bash -c" → cita como '/usr/bin/bash' -c
 * - "C:\Program Files\Git\bin\bash.exe -c" → cita el ejecutable, deja -c
 *
 * @param prefix El prefijo de shell — ejecutable y, opcionalmente, flags
 * @param command El comando a ejecutar
 * @returns El comando compuesto, con cada componente citado
 */
export function formatShellPrefixCommand(
  prefix: string,
  command: string,
): string {
  // Divide en el último espacio-antes-de-guion para separar el ejecutable
  // de sus argumentos.
  const spaceBeforeDash = prefix.lastIndexOf(' -')
  if (spaceBeforeDash > 0) {
    const execPath = prefix.substring(0, spaceBeforeDash)
    const args = prefix.substring(spaceBeforeDash + 1)
    return `${quote([execPath])} ${args} ${quote([command])}`
  }
  return `${quote([prefix])} ${quote([command])}`
}
