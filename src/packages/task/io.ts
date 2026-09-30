/**
 * El `PremiseIo` real: lo único de la verificación de premisas que toca el
 * mundo (T-056).
 *
 * Vive aparte de `premises.ts` por la misma razón que `testing/io.ts` vive
 * aparte de `testing/impact.ts`: el evaluador no toca disco a propósito, y esa
 * separación es lo que permite probarlo sin fabricar un árbol.
 *
 * **`run` ejecuta lo que el archivo de premisas declare.** El archivo es
 * configuración del proyecto, con el mismo nivel de confianza que
 * `.claude/settings.json`; no se acepta de una fuente que el proyecto no
 * controle. Y un comando que no se puede ejecutar devuelve `null`, no un
 * código: un `1` inventado se leería como «se midió y no se cumple».
 */
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import type { PremiseIo } from './premises.ts'

/** Resuelve contra el árbol del proyecto: una premisa declara rutas relativas. */
function resolve(cwd: string, path: string): string {
  return isAbsolute(path) ? path : join(cwd, path)
}

export function fsPremiseIo(cwd: string): PremiseIo {
  const cache = new Map<string, string[]>()
  return {
    list: (scope) => {
      const previo = cache.get(scope)
      if (previo) return previo
      // Un alcance que termina en `/` es un directorio; el resto es un glob.
      const patron = scope.endsWith('/') ? `${scope}**/*` : scope
      const encontrados = [...new Bun.Glob(patron).scanSync({ cwd })].sort()
      cache.set(scope, encontrados)
      return encontrados
    },
    read: (path) => {
      try {
        return readFileSync(resolve(cwd, path), 'utf8')
      } catch {
        return ''
      }
    },
    exists: (path) => existsSync(resolve(cwd, path)),
    env: (name) => process.env[name],
    run: (command) => {
      try {
        const p = Bun.spawnSync(['bash', '-lc', command], { cwd })
        return p.exitCode
      } catch {
        return null   // no se pudo ejecutar: NO es un código de salida
      }
    },
  }
}

/** Lee las premisas declaradas. Lanza con la ruta en el mensaje si no se puede. */
export function readPremises(path: string): unknown {
  let crudo: string
  try {
    crudo = readFileSync(path, 'utf8')
  } catch (e) {
    throw new Error(`No se pudo leer ${path}: ${(e as Error).message}`)
  }
  try {
    return JSON.parse(crudo)
  } catch (e) {
    throw new Error(`${path} no es JSON válido: ${(e as Error).message}`)
  }
}
