/**
 * Porte fiel de `ccnmt: packages/shell/src/taskOutputPort.ts` — el
 * contrato que implementa el destino de la salida de una tarea en
 * background: acumula stdout/stderr, decide cuándo derramar a disco
 * (`spillToDisk`) y expone el archivo resultante.
 *
 * Porte COMPLETO: la única interfaz exportada de la fuente está
 * presente, con todos sus miembros.
 *
 * @module
 */
export interface TaskOutputPort {
  readonly taskId: string
  readonly path: string
  readonly stdoutToFile: boolean
  readonly outputFileRedundant: boolean
  readonly outputFileSize: number

  writeStdout(data: string): void
  writeStderr(data: string): void

  getStdout(): Promise<string>
  getStderr(): string

  clear(): void
  spillToDisk(): void
  deleteOutputFile(): Promise<void>
  flush(): Promise<void>
}
