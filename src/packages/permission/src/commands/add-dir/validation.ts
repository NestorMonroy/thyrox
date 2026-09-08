/**
 * Si un directorio puede sumarse al espacio de trabajo, y qué decirle a quien
 * lo pidió.
 *
 * Procedencia: `ccnmt: packages/permission/src/commands/add-dir/validation.ts`
 * (110 líneas, 3 símbolos). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se reimplementa y no se copia. Porte COMPLETO.
 *
 * LA DECISIÓN QUE NO ES OBVIA: un fallo de `stat` con `ENOENT`, `ENOTDIR`,
 * `EACCES` o `EPERM` se lee como «no está», no se propaga. Un directorio
 * adicional configurado en settings puede volverse inaccesible entre dos
 * arranques —permisos, un montaje que no subió— y propagar ahí tumbaría el
 * arranque entero por una entrada de configuración. Cualquier OTRO errno sí
 * se relanza: sin esa frontera, todo fallo del sistema de archivos quedaría
 * escondido tras un veredicto suave.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import chalk from 'chalk'
import { stat } from 'fs/promises'
import { dirname, resolve } from 'path'
import { getErrnoCode } from '@thyrox/local-observability/errorHelpers.js'
import { expandPath } from '@thyrox/storage/path.js'
import { allWorkingDirectories, pathInWorkingPath } from '../../filesystem.js'

/** El contexto que este módulo necesita: sólo los directorios adicionales. */
type ToolPermissionContext = {
  additionalWorkingDirectories: Map<string, unknown>
  [key: string]: unknown
}

export type AddDirectoryResult =
  | { resultType: 'success'; absolutePath: string }
  | { resultType: 'emptyPath' }
  | {
      resultType: 'pathNotFound' | 'notADirectory'
      directoryPath: string
      absolutePath: string
    }
  | {
      resultType: 'alreadyInWorkingDirectory'
      directoryPath: string
      workingDir: string
    }

export async function validateDirectoryForWorkspace(
  directoryPath: string,
  permissionContext: ToolPermissionContext,
): Promise<AddDirectoryResult> {
  if (!directoryPath) {
    return { resultType: 'emptyPath' }
  }

  // `resolve` quita la barra final que `expandPath` puede dejar en una ruta
  // absoluta, de modo que `/foo` y `/foo/` acaben en la misma clave.
  const absolutePath = resolve(expandPath(directoryPath))

  try {
    const stats = await stat(absolutePath)
    if (!stats.isDirectory()) {
      return { resultType: 'notADirectory', directoryPath, absolutePath }
    }
  } catch (e: unknown) {
    const code = getErrnoCode(e)
    if (
      code === 'ENOENT' ||
      code === 'ENOTDIR' ||
      code === 'EACCES' ||
      code === 'EPERM'
    ) {
      return { resultType: 'pathNotFound', directoryPath, absolutePath }
    }
    throw e
  }

  for (const workingDir of allWorkingDirectories(permissionContext)) {
    if (pathInWorkingPath(absolutePath, workingDir)) {
      return {
        resultType: 'alreadyInWorkingDirectory',
        directoryPath,
        workingDir,
      }
    }
  }

  return { resultType: 'success', absolutePath }
}

export function addDirHelpMessage(result: AddDirectoryResult): string {
  switch (result.resultType) {
    case 'emptyPath':
      return 'Please provide a directory path.'
    case 'pathNotFound':
      return `Path ${chalk.bold(result.absolutePath)} was not found.`
    case 'notADirectory': {
      // Sugiere el padre porque es lo que quien escribió la ruta buscaba casi
      // siempre: apuntó al archivo en vez de a su directorio.
      const parentDir = dirname(result.absolutePath)
      return `${chalk.bold(result.directoryPath)} is not a directory. Did you mean to add the parent directory ${chalk.bold(parentDir)}?`
    }
    case 'alreadyInWorkingDirectory':
      return `${chalk.bold(result.directoryPath)} is already accessible within the existing working directory ${chalk.bold(result.workingDir)}.`
    case 'success':
      return `Added ${chalk.bold(result.absolutePath)} as a working directory.`
  }
}
