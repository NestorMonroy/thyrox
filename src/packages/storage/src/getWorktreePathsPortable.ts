/**
 * Puerto COMPLETO de
 * `ccnmt: packages/storage/src/getWorktreePathsPortable.ts` (27 líneas
 * fuente). Cero dependencias hermanas ausentes — sólo `child_process` y
 * `util` de Node. Porte verbatim.
 *
 * Reconciliación (tarea #208): este archivo YA estaba reimplementado como
 * una función PRIVADA dentro de `./projectPurge.ts` (idéntica, ver su
 * docstring), porque otro agente no podía crear este archivo fuera de su
 * propiedad en aquel pase. Con el módulo real aquí, `projectPurge.ts` pasa
 * a IMPORTAR desde este archivo y su copia privada se retira — ver el
 * commit de reconciliación.
 */
import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFileCb)

/**
 * Detección portable de worktrees usando sólo `child_process` — sin
 * analytics, sin dependencias de bootstrap, sin execa. La usan
 * `listSessionsImpl.ts` (SDK) y cualquier consumidor que necesite las
 * rutas de worktree sin arrastrar la cadena de dependencias del CLI
 * (execa → cross-spawn → which).
 */
export async function getWorktreePathsPortable(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      { cwd, timeout: 5000 },
    )
    if (!stdout) return []
    return stdout
      .split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.slice('worktree '.length).normalize('NFC'))
  } catch {
    return []
  }
}
