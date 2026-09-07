/**
 * Puerto de `ccnmt: packages/ide/src/idePathConversion.ts` (verbatim — sin
 * dependencias de paquete hermano, sólo `child_process`).
 *
 * Utilidades de conversión de rutas para la comunicación con el IDE.
 * Maneja las conversiones entre el entorno de Claude y el entorno del IDE.
 */

import { execFileSync } from 'child_process'

interface IDEPathConverter {
  /**
   * Convierte una ruta del formato del IDE al formato local de Claude.
   * Se usa al leer los workspace folders del lockfile del IDE.
   */
  toLocalPath(idePath: string): string

  /**
   * Convierte una ruta del formato local de Claude al formato del IDE.
   * Se usa al enviar rutas al IDE (showDiffInIDE, etc.).
   */
  toIDEPath(localPath: string): string
}

/**
 * Conversor para el escenario IDE en Windows + Claude en WSL.
 */
export class WindowsToWSLConverter implements IDEPathConverter {
  constructor(private wslDistroName: string | undefined) {}

  toLocalPath(windowsPath: string): string {
    if (!windowsPath) return windowsPath

    // Comprueba si esta ruta viene de una distro de WSL distinta.
    if (this.wslDistroName) {
      const wslUncMatch = windowsPath.match(
        /^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/,
      )
      if (wslUncMatch && wslUncMatch[1] !== this.wslDistroName) {
        // Distro distinta - wslpath fallará, así que se devuelve la ruta original.
        return windowsPath
      }
    }

    try {
      // Usa wslpath para convertir rutas de Windows a rutas de WSL.
      const result = execFileSync('wslpath', ['-u', windowsPath], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'], // wslpath escribe "wslpath: <errortext>" a stderr
      }).trim()

      return result
    } catch {
      // Si wslpath falla, se recurre a la conversión manual.
      return windowsPath
        .replace(/\\/g, '/') // Convierte backslashes a forward slashes
        .replace(/^([A-Z]):/i, (_, letter) => `/mnt/${letter.toLowerCase()}`)
    }
  }

  toIDEPath(wslPath: string): string {
    if (!wslPath) return wslPath

    try {
      // Usa wslpath para convertir rutas de WSL a rutas de Windows.
      const result = execFileSync('wslpath', ['-w', wslPath], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'], // wslpath escribe "wslpath: <errortext>" a stderr
      }).trim()

      return result
    } catch {
      // Si wslpath falla, se devuelve la ruta original.
      return wslPath
    }
  }
}

/**
 * Comprueba si los nombres de distro coinciden para rutas UNC de WSL.
 */
export function checkWSLDistroMatch(
  windowsPath: string,
  wslDistroName: string,
): boolean {
  const wslUncMatch = windowsPath.match(
    /^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/,
  )
  if (wslUncMatch) {
    return wslUncMatch[1] === wslDistroName
  }
  return true // No es una ruta UNC de WSL, así que no hay mismatch de distro.
}
