/**
 * Porte fiel de `ccnmt: packages/shell/src/types.ts` — los tipos
 * transversales del paquete: qué es un shell soportado
 * (`ShellType`/`SHELL_TYPES`), el contrato que implementa cada proveedor
 * (`ShellProvider`), las opciones y el resultado de una ejecución
 * (`ExecOptions`/`ExecResult`) y el asa que el llamador recibe para
 * seguir un comando en curso (`ShellCommand`).
 *
 * Porte COMPLETO: los siete símbolos exportados de la fuente están
 * presentes con la misma forma.
 *
 * @module
 */

export const SHELL_TYPES = ['bash', 'powershell'] as const
export type ShellType = (typeof SHELL_TYPES)[number]
export const DEFAULT_HOOK_SHELL: ShellType = 'bash'

export type ShellProvider = {
  type: ShellType
  shellPath: string
  detached: boolean

  /**
   * Construye la cadena de comando completa, con toda la preparación
   * propia del shell. Para bash: fuente del snapshot, entorno de sesión,
   * deshabilitar extglob, envolver en eval, seguimiento de pwd.
   */
  buildExecCommand(
    command: string,
    opts: {
      id: number | string
      sandboxTmpDir?: string
      useSandbox: boolean
    },
  ): Promise<{ commandString: string; cwdFilePath: string }>

  /**
   * Argumentos de shell para el spawn (p. ej. `['-c', '-l', cmd]` en bash).
   */
  getSpawnArgs(commandString: string): string[]

  /**
   * Variables de entorno adicionales para este tipo de shell. Puede
   * hacer inicialización asíncrona (p. ej. el socket de tmux en bash).
   */
  getEnvironmentOverrides(command: string): Promise<Record<string, string>>
}

export type ShellConfig = {
  provider: ShellProvider
}

export type ExecOptions = {
  timeout?: number
  onProgress?: (
    lastLines: string,
    allLines: string,
    totalLines: number,
    totalBytes: number,
    isIncomplete: boolean,
  ) => void
  preventCwdChanges?: boolean
  shouldUseSandbox?: boolean
  shouldAutoBackground?: boolean
  /** Cuando está presente, stdout se canaliza (no va a archivo) y este callback se dispara por cada trozo de datos. */
  onStdout?: (data: string) => void
  /**
   * Variables de entorno adicionales a mezclar en el subproceso lanzado.
   * Hoy la usa `BashTool` para reenviar `CLAUDE_EFFORT=<nivel>`, así los
   * scripts de shell definidos por el usuario y los generadores de la
   * status-line pueden ramificar según el nivel de esfuerzo activo.
   */
  extraEnv?: Record<string, string>
}

export type ExecResult = {
  stdout: string
  stderr: string
  code: number
  interrupted: boolean
  backgroundTaskId?: string
  backgroundedByUser?: boolean
  /** Se fija cuando el modo asistente puso en background automáticamente un comando bloqueante de larga duración. */
  assistantAutoBackgrounded?: boolean
  /** Se fija cuando stdout era demasiado grande para caber inline — apunta al archivo de salida en disco. */
  outputFilePath?: string
  /** Tamaño total del archivo de salida en bytes (se fija junto con outputFilePath). */
  outputFileSize?: number
  /** El id de tarea del archivo de salida (se fija junto con outputFilePath). */
  outputTaskId?: string
  /** Mensaje de error cuando el comando falló antes de lanzarse (p. ej. cwd borrado). */
  preSpawnError?: string
}

export type ShellCommand = {
  background: (backgroundTaskId: string) => boolean
  result: Promise<ExecResult>
  kill: () => void
  status: 'running' | 'backgrounded' | 'completed' | 'killed'
  /**
   * Limpia los recursos del stream (event listeners). Debe llamarse tras
   * completar o matar el comando para evitar fugas de memoria.
   */
  cleanup: () => void
  onTimeout?: (
    callback: (backgroundFn: (taskId: string) => boolean) => void,
  ) => void
}
