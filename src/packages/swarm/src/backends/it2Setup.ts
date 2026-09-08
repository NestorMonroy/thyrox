/**
 * La puesta a punto de `it2`: el puente de línea de comandos hacia iTerm2.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/it2Setup.ts` (245 líneas,
 * 7 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * iTerm2 no admite que un proceso ajeno le abra paneles por sí solo: hay que
 * hablarle por su API de Python, y `it2` es el cliente que la expone como
 * comando. Este módulo descubre con qué gestor de paquetes instalarlo, lo
 * instala, comprueba que la API esté encendida, y recuerda las dos banderas
 * que evitan volver a preguntar.
 *
 * DIVERGENCIA DECLARADA: ninguna en la conducta. Sobre el nombre, ver la nota
 * de `isIt2CliAvailable` más abajo — hay un homónimo en `detection.ts` que
 * mide otra cosa, y los dos se conservan como en la fuente.
 */
import { homedir } from 'node:os'

import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
  getGlobalConfig,
  logError,
  logForDebugging,
  saveGlobalConfig,
} from '../adapters/appRuntime.js'

/**
 * Los gestores de paquetes de Python que este módulo sabe usar, en orden de
 * preferencia.
 *
 * `uvx` nombra la familia de `uv`, no el ejecutable: se descubre con `which
 * uv` y se instala con `uv tool install`. El nombre se conserva de la fuente
 * porque es el valor que la configuración persistida ya lleva.
 */
export type PythonPackageManager = 'uvx' | 'pipx' | 'pip'

/** El desenlace de un intento de instalación. */
export type It2InstallResult = {
  success: boolean
  error?: string
  packageManager?: PythonPackageManager
}

/**
 * El desenlace de una verificación.
 *
 * `needsPythonApiEnabled` separa el único fallo que el usuario puede resolver
 * él mismo —encender la API en las preferencias— del resto, que no.
 */
export type It2VerifyResult = {
  success: boolean
  error?: string
  needsPythonApiEnabled?: boolean
}

/**
 * Descubre qué gestor de paquetes de Python hay en el sistema.
 *
 * El orden ES la preferencia, y CORTA al primer acierto: `uv` y `pipx`
 * instalan en entornos aislados, así que ninguno de los dos puede romper el
 * Python del sistema. `pip` queda de último recurso.
 */
export async function detectPythonPackageManager(): Promise<PythonPackageManager | null> {
  const uv = await execFileNoThrow('which', ['uv'])
  if (uv.code === 0) {
    logForDebugging('[it2Setup] Found uv (will use uv tool install)')
    return 'uvx'
  }

  const pipx = await execFileNoThrow('which', ['pipx'])
  if (pipx.code === 0) {
    logForDebugging('[it2Setup] Found pipx package manager')
    return 'pipx'
  }

  const pip = await execFileNoThrow('which', ['pip'])
  if (pip.code === 0) {
    logForDebugging('[it2Setup] Found pip package manager')
    return 'pip'
  }

  const pip3 = await execFileNoThrow('which', ['pip3'])
  if (pip3.code === 0) {
    logForDebugging('[it2Setup] Found pip3 package manager')
    // Se devuelve `pip`, no `pip3`: el `switch` de `installIt2` no tiene rama
    // para el segundo nombre, y la rama de `pip` ya reintenta con `pip3`.
    return 'pip'
  }

  logForDebugging('[it2Setup] No Python package manager found')
  return null
}

/**
 * ¿Está `it2` en el PATH?
 *
 * HOMÓNIMO DELIBERADO: `detection.ts` exporta una función con este mismo
 * nombre que mide otra cosa —si `it2 session list` responde, o sea si además
 * la API de iTerm2 está encendida—. Las dos existen en la fuente y las dos se
 * conservan: ésta es privada del módulo, como allá, y es la barata que
 * `verifyIt2Setup` usa antes de intentar hablar con iTerm2.
 */
async function isIt2CliAvailable(): Promise<boolean> {
  const result = await execFileNoThrow('which', ['it2'])
  return result.code === 0
}

/**
 * Instala `it2` con el gestor indicado.
 *
 * TODA instalación corre desde el directorio del usuario. No es cosmética: un
 * `pip.conf` o un `uv.toml` en el árbol de trabajo puede redirigir el índice
 * de paquetes a un servidor ajeno, y ese archivo lo escribe quien controle el
 * repositorio que estamos visitando, no el usuario.
 */
export async function installIt2(
  packageManager: PythonPackageManager,
): Promise<It2InstallResult> {
  logForDebugging(`[it2Setup] Installing it2 using ${packageManager}`)

  const cwd = homedir()
  let result: { code: number; stdout: string; stderr: string }

  switch (packageManager) {
    case 'uvx':
      // `uvx` ejecuta; quien instala es `uv tool install`.
      result = await execFileNoThrowWithCwd('uv', ['tool', 'install', 'it2'], {
        cwd,
      })
      break
    case 'pipx':
      result = await execFileNoThrowWithCwd('pipx', ['install', 'it2'], { cwd })
      break
    case 'pip':
      // `--user` instala sin sudo: pedir privilegio para una herramienta de
      // conveniencia es desproporcionado.
      result = await execFileNoThrowWithCwd(
        'pip',
        ['install', '--user', 'it2'],
        { cwd },
      )
      if (result.code !== 0) {
        result = await execFileNoThrowWithCwd(
          'pip3',
          ['install', '--user', 'it2'],
          { cwd },
        )
      }
      break
  }

  if (result.code !== 0) {
    const error = result.stderr || 'Unknown installation error'
    logError(new Error(`[it2Setup] Failed to install it2: ${error}`))
    return { success: false, error, packageManager }
  }

  logForDebugging('[it2Setup] it2 installed successfully')
  return { success: true, packageManager }
}

/**
 * Comprueba que `it2` esté instalado y que iTerm2 le responda.
 *
 * Listar sesiones es la prueba más barata que ejercita la API de Python de
 * verdad: comprobar sólo que el comando existe no distingue «instalado» de
 * «instalado y utilizable».
 */
export async function verifyIt2Setup(): Promise<It2VerifyResult> {
  logForDebugging('[it2Setup] Verifying it2 setup...')

  if (!(await isIt2CliAvailable())) {
    return { success: false, error: 'it2 CLI is not installed or not in PATH' }
  }

  const result = await execFileNoThrow('it2', ['session', 'list'])

  if (result.code !== 0) {
    // El mensaje lo escribe iTerm2, no nosotros, y su caja no es un contrato:
    // comparar sin normalizarla convierte el único diagnóstico accionable en
    // un fallo genérico.
    const stderr = result.stderr.toLowerCase()

    if (
      stderr.includes('api') ||
      stderr.includes('python') ||
      stderr.includes('connection refused') ||
      stderr.includes('not enabled')
    ) {
      logForDebugging('[it2Setup] Python API not enabled in iTerm2')
      return {
        success: false,
        error: 'Python API not enabled in iTerm2 preferences',
        needsPythonApiEnabled: true,
      }
    }

    return {
      success: false,
      error: result.stderr || 'Failed to communicate with iTerm2',
    }
  }

  logForDebugging('[it2Setup] it2 setup verified successfully')
  return { success: true }
}

/** Las instrucciones para encender la API de Python en iTerm2. */
export function getPythonApiInstructions(): string[] {
  return [
    'Almost done! Enable the Python API in iTerm2:',
    '',
    '  iTerm2 → Settings → General → Magic → Enable Python API',
    '',
    'After enabling, you may need to restart iTerm2.',
  ]
}

/**
 * Deja constancia de que la puesta a punto terminó, para no volver a
 * preguntar.
 *
 * NO se escribe si la marca ya está. Guardar sin cambio no es inocuo:
 * `saveGlobalConfig` reemplaza el archivo global entero, y hacerlo en cada
 * arranque multiplica la ventana en que otro proceso pierde su escritura.
 */
export function markIt2SetupComplete(): void {
  if (getGlobalConfig().iterm2It2SetupComplete !== true) {
    saveGlobalConfig((current: Record<string, unknown>) => ({
      ...current,
      iterm2It2SetupComplete: true,
    }))
    logForDebugging('[it2Setup] Marked it2 setup as complete')
  }
}

/**
 * Registra que el usuario prefiere tmux a los paneles de iTerm2.
 *
 * Mismo criterio que arriba: sólo escribe cuando el valor cambia.
 */
export function setPreferTmuxOverIterm2(prefer: boolean): void {
  if (getGlobalConfig().preferTmuxOverIterm2 !== prefer) {
    saveGlobalConfig((current: Record<string, unknown>) => ({
      ...current,
      preferTmuxOverIterm2: prefer,
    }))
    logForDebugging(`[it2Setup] Set preferTmuxOverIterm2 = ${prefer}`)
  }
}

/**
 * ¿Prefiere el usuario tmux?
 *
 * La comparación es ESTRICTA: una cadena `'true'` leída de una configuración
 * corrompida no debe encender una preferencia que nadie fijó.
 */
export function getPreferTmuxOverIterm2(): boolean {
  return getGlobalConfig().preferTmuxOverIterm2 === true
}
