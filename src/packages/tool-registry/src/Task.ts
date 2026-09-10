/**
 * Puerto de `ccnmt: packages/tool-registry/src/Task.ts` (128 líneas,
 * 12 símbolos). La identidad de un trabajo en curso y su estado inicial.
 *
 * TRES DECISIONES QUE NO SE LEEN SOLAS:
 *
 *   El id lleva PREFIJO de tipo. Se lee en logs, en rutas de archivo y en
 *   mensajes al usuario; sin él habría que consultar el estado para saber
 *   si `x9k…` es un shell o un agente.
 *
 *   El alfabeto es dígitos y minúsculas. El id viaja por el sistema de
 *   archivos, y en uno que no distingue caja dos ids que sólo difirieran
 *   en mayúsculas serían el MISMO archivo. Con 36 símbolos y ocho
 *   posiciones quedan 36^8 ≈ 2.8 billones de combinaciones, suficientes
 *   para que no se pueda apuntar por fuerza bruta al archivo de salida de
 *   otro trabajo.
 *
 *   `paused` NO es terminal. Un workflow pausado se reanuda; tratarlo como
 *   terminal desalojaría del estado un trabajo que va a volver.
 */
import { randomBytes } from 'crypto'
import type { AgentId } from '@thyrox/agent/idTypes'
import { getTaskOutputPath } from '@thyrox/storage/task/diskOutput.js'
import type { AppState } from './appStateTypes.ts'

export type TaskType =
  | 'local_bash'
  | 'local_agent'
  | 'remote_agent'
  | 'in_process_teammate'
  | 'local_workflow'
  | 'monitor_mcp'
  | 'dream'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
  /** Sólo de workflow y NO terminal: un workflow pausado se reanuda. */
  | 'paused'

/**
 * Cierto cuando el trabajo no va a transicionar más. Lo consultan la
 * inyección de mensajes (no se le habla a un compañero muerto), el
 * desalojo del estado y la limpieza de huérfanos.
 */
export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}

export type TaskHandle = {
  taskId: string
  cleanup?: () => void
}

export type SetAppState = (f: (prev: AppState) => AppState) => void

export type TaskContext = {
  abortController: AbortController
  getAppState: () => AppState
  setAppState: SetAppState
}

/** Los campos que todo estado de trabajo comparte. */
export type TaskStateBase = {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  toolUseId?: string
  startTime: number
  endTime?: number
  totalPausedMs?: number
  outputFile: string
  outputOffset: number
  notified: boolean
}

export type LocalShellSpawnInput = {
  command: string
  description: string
  timeout?: number
  toolUseId?: string
  agentId?: AgentId
  /** Variante de presentación: etiqueta, título de diálogo, píldora de estado. */
  kind?: 'bash' | 'monitor'
}

/**
 * Lo único que se despacha polimórficamente es `kill`. Las seis
 * implementaciones usan sólo `setAppState`; `getAppState` y el
 * `abortController` eran peso muerto en la firma.
 */
export type Task = {
  name: string
  type: TaskType
  kill(taskId: string, setAppState: SetAppState): Promise<void>
}

const TASK_ID_PREFIXES: Record<string, string> = {
  local_bash: 'b', // 'b' por compatibilidad hacia atrás
  local_agent: 'a',
  remote_agent: 'r',
  in_process_teammate: 't',
  local_workflow: 'w',
  monitor_mcp: 'm',
  dream: 'd',
}

/**
 * El respaldo `'x'` no es decorativo: el id se usa como nombre de archivo,
 * y un `undefined` ahí produciría `undefinedabc…` en disco en vez de
 * fallar.
 */
function getTaskIdPrefix(type: TaskType): string {
  return TASK_ID_PREFIXES[type] ?? 'x'
}

/** Dígitos y minúsculas — seguro ante un sistema de archivos sin caja. */
const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export function generateTaskId(type: TaskType): string {
  const prefix = getTaskIdPrefix(type)
  const bytes = randomBytes(8)
  let id = prefix
  for (let i = 0; i < 8; i++) {
    id += TASK_ID_ALPHABET[bytes[i]! % TASK_ID_ALPHABET.length]
  }
  return id
}

/**
 * El estado con que nace un trabajo. `outputFile` se DERIVA del id: es el
 * enlace entre el trabajo y su salida en disco, y si no coincidiera con lo
 * que el lector consulta, la salida existiría y nadie la encontraría.
 */
export function createTaskStateBase(
  id: string,
  type: TaskType,
  description: string,
  toolUseId?: string,
): TaskStateBase {
  return {
    id,
    type,
    status: 'pending',
    description,
    toolUseId,
    startTime: Date.now(),
    outputFile: getTaskOutputPath(id),
    outputOffset: 0,
    notified: false,
  }
}
