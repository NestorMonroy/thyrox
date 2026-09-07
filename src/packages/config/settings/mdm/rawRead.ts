/**
 * Puerto de `ccnmt: packages/config/settings/mdm/rawRead.ts` (129 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * Módulo mínimo para disparar lecturas de subproceso MDM sin bloquear el
 * event loop. Imports mínimos — sólo child_process, fs y mdm/constants
 * (que sólo importa os).
 *
 * Dos patrones de uso:
 * 1. Arranque: `startMdmRawRead()` dispara en la evaluación del módulo de
 *    entrada, los resultados se consumen después vía
 *    `getMdmRawReadPromise()`.
 * 2. Poll/fallback: `fireRawRead()` crea una lectura fresca a demanda
 *    (usada por `changeDetector` y el entrypoint del SDK).
 *
 * El stdout crudo lo consume `settings.ts` (mdm) vía
 * `consumeRawReadResult()`.
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  getMacOSPlistPaths,
  MDM_SUBPROCESS_TIMEOUT_MS,
  PLUTIL_ARGS_PREFIX,
  PLUTIL_PATH,
  WINDOWS_REGISTRY_KEY_PATH_HKCU,
  WINDOWS_REGISTRY_KEY_PATH_HKLM,
  WINDOWS_REGISTRY_VALUE_NAME,
} from './constants.ts'

export type RawReadResult = {
  plistStdouts: Array<{ stdout: string; label: string }> | null
  hklmStdout: string | null
  hkcuStdout: string | null
}

let rawReadPromise: Promise<RawReadResult> | null = null

function execFilePromise(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; code: number | null }> {
  return new Promise(resolve => {
    execFile(
      cmd,
      args,
      { encoding: 'utf-8', timeout: MDM_SUBPROCESS_TIMEOUT_MS },
      (err, stdout) => {
        resolve({ stdout: stdout ?? '', code: err ? 1 : 0 })
      },
    )
  })
}

/**
 * Dispara lecturas de subproceso frescas para settings MDM y devuelve el
 * stdout crudo.
 * En macOS: lanza plutil para cada ruta de plist en paralelo, gana el
 * primero.
 * En Windows: lanza reg query para HKLM y HKCU en paralelo.
 * En Linux: devuelve vacío (sin equivalente de MDM).
 */
export function fireRawRead(): Promise<RawReadResult> {
  return (async (): Promise<RawReadResult> => {
    if (process.platform === 'darwin') {
      const plistPaths = getMacOSPlistPaths()

      const allResults = await Promise.all(
        plistPaths.map(async ({ path, label }) => {
          // Ruta rápida: se salta el subproceso plutil si el archivo plist
          // no existe. Lanzar plutil toma ~5ms incluso para un ENOENT
          // inmediato, y las máquinas sin MDM nunca tienen estos archivos.
          // Usa `existsSync` sincrónico para preservar el invariante de
          // "lanzar durante los imports": `execFilePromise` debe ser el
          // primer await para que plutil arranque antes de que el event
          // loop haga polling (ver `main.tsx:3-4`).
          if (!existsSync(path)) {
            return { stdout: '', label, ok: false }
          }
          const { stdout, code } = await execFilePromise(PLUTIL_PATH, [
            ...PLUTIL_ARGS_PREFIX,
            path,
          ])
          return { stdout, label, ok: code === 0 && !!stdout }
        }),
      )

      // Gana la primera fuente (el array está en orden de prioridad).
      const winner = allResults.find(r => r.ok)
      return {
        plistStdouts: winner
          ? [{ stdout: winner.stdout, label: winner.label }]
          : [],
        hklmStdout: null,
        hkcuStdout: null,
      }
    }

    if (process.platform === 'win32') {
      const [hklm, hkcu] = await Promise.all([
        execFilePromise('reg', [
          'query',
          WINDOWS_REGISTRY_KEY_PATH_HKLM,
          '/v',
          WINDOWS_REGISTRY_VALUE_NAME,
        ]),
        execFilePromise('reg', [
          'query',
          WINDOWS_REGISTRY_KEY_PATH_HKCU,
          '/v',
          WINDOWS_REGISTRY_VALUE_NAME,
        ]),
      ])
      return {
        plistStdouts: null,
        hklmStdout: hklm.code === 0 ? hklm.stdout : null,
        hkcuStdout: hkcu.code === 0 ? hkcu.stdout : null,
      }
    }

    return { plistStdouts: null, hklmStdout: null, hkcuStdout: null }
  })()
}

/**
 * Dispara lecturas de subproceso crudas una vez, para el arranque. Se
 * llama en la evaluación del módulo `main.tsx`. Los resultados se
 * consumen vía `getMdmRawReadPromise()`.
 */
export function startMdmRawRead(): void {
  if (rawReadPromise) return
  rawReadPromise = fireRawRead()
}

/**
 * Obtiene la promesa de arranque. Devuelve `null` si
 * `startMdmRawRead()` no fue llamada.
 */
export function getMdmRawReadPromise(): Promise<RawReadResult> | null {
  return rawReadPromise
}
