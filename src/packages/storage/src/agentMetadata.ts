/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/agentMetadata.ts` (166
 * líneas fuente). Módulo hoja: I/O de metadata de agente y de
 * remote-agent. Cada archivo de metadata es un sidecar JSON hermano del
 * `.jsonl` del agente (subagent_type, worktreePath, description para
 * AgentMetadata; sessionId de CCR, title, command etc. para
 * RemoteAgentMetadata).
 *
 * Los archivos sidecar sobreviven al borrado de `.jsonl` de
 * hydrateSessionFromRemote — el status siempre se trae fresco de CCR al
 * restaurar; sólo la identidad se persiste localmente.
 *
 * Tres dependencias hermanas ausentes:
 *
 *  - `getOriginalCwd`/`getSessionId`/`getSessionProjectDir`
 *    (`app-host/bootstrap/state.js`) — se importan de `./sessionPaths.js`
 *    (uno de mis 14 módulos, ya porta estas mismas funciones), NO se
 *    reimplementan aquí — así comparten el mismo id de sesión dentro del
 *    mismo proceso que `sessionEnvironment.ts` y `task/diskOutput.ts`.
 *  - `AgentId` (`agent/idTypes`) — alias local `type AgentId = string`
 *    (agent ya importa de storage; la dirección inversa reabriría el
 *    ciclo, mismo razonamiento que `sessionPaths.ts`).
 *  - `isFsInaccessible` (`local-observability/errorHelpers.js`) — fiel,
 *    tres líneas (ENOENT/EACCES/EPERM/ENOTDIR/ELOOP).
 *
 * `logForDebugging` SÍ se reusa de verdad: se importa de
 * `./internal/pendingCrossPackageDeps.js`, sustituto ya presente en este
 * paquete — no se duplica.
 */
import type { Dirent } from 'fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { logForDebugging } from './internal/pendingCrossPackageDeps.js'
import {
  getAgentTranscriptPath,
  getOriginalCwd,
  getProjectDir,
  getSessionId,
  getSessionProjectDir,
} from './sessionPaths.js'

type AgentId = string

function isFsInaccessible(e: unknown): e is NodeJS.ErrnoException {
  const code =
    e && typeof e === 'object' && 'code' in e && typeof e.code === 'string'
      ? e.code
      : undefined
  return (
    code === 'ENOENT' ||
    code === 'EACCES' ||
    code === 'EPERM' ||
    code === 'ENOTDIR' ||
    code === 'ELOOP'
  )
}

function getAgentMetadataPath(agentId: AgentId): string {
  return getAgentTranscriptPath(agentId).replace(/\.jsonl$/, '.meta.json')
}

export type AgentMetadata = {
  agentType: string
  /** Ruta de worktree si el agente se lanzó con isolation: "worktree" */
  worktreePath?: string
  /** Descripción original de la tarea del input de AgentTool. Se persiste
   * para que la notificación de un agente reanudado muestre la
   * descripción original en vez de un placeholder. Opcional — los
   * archivos de metadata más viejos no tienen este campo. */
  description?: string
  /** Nombre-slug (p. ej. "find-bug") para que el agente reanudado pueda
   * dirigirse por su nombre simbólico. */
  name?: string
}

/**
 * Persiste el agentType usado para lanzar un subagente. Lo lee resume
 * para enrutar correctamente cuando subagent_type viene omitido — sin
 * esto, reanudar un fork degrada en silencio a general-purpose (system
 * prompt de 4KB, sin historial heredado). El archivo sidecar evita
 * cambios de esquema en el JSONL.
 *
 * También guarda el worktreePath cuando el agente se lanzó con
 * aislamiento de worktree, lo que permite a resume restaurar el cwd
 * correcto.
 */
export async function writeAgentMetadata(
  agentId: AgentId,
  metadata: AgentMetadata,
): Promise<void> {
  const path = getAgentMetadataPath(agentId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(metadata))
}

export async function readAgentMetadata(
  agentId: AgentId,
): Promise<AgentMetadata | null> {
  const path = getAgentMetadataPath(agentId)
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as AgentMetadata
  } catch (e) {
    if (isFsInaccessible(e)) return null
    throw e
  }
}

export type RemoteAgentMetadata = {
  taskId: string
  remoteTaskType: string
  /** Session ID de CCR — para traer el estado en vivo de la Sessions API
   * al reanudar. */
  sessionId: string
  title: string
  command: string
  spawnedAt: number
  toolUseId?: string
  isLongRunning?: boolean
  isUltraplan?: boolean
  isRemoteReview?: boolean
  remoteTaskMetadata?: Record<string, unknown>
}

function getRemoteAgentsDir(): string {
  // Mismo fallback de sessionProjectDir que getAgentTranscriptPath — el
  // directorio de PROYECTO (que contiene el .jsonl), no el de sesión, así
  // que sessionId se une a continuación.
  const projectDir = getSessionProjectDir() ?? getProjectDir(getOriginalCwd())
  return join(projectDir, getSessionId(), 'remote-agents')
}

function getRemoteAgentMetadataPath(taskId: string): string {
  return join(getRemoteAgentsDir(), `remote-agent-${taskId}.meta.json`)
}

/**
 * Persiste metadata de una tarea remote-agent para restaurarla al
 * reanudar la sesión. Archivo sidecar por-tarea (directorio hermano de
 * subagents/) que sobrevive al borrado de .jsonl de
 * hydrateSessionFromRemote; el status siempre se trae fresco de CCR al
 * restaurar — sólo la identidad se persiste localmente.
 */
export async function writeRemoteAgentMetadata(
  taskId: string,
  metadata: RemoteAgentMetadata,
): Promise<void> {
  const path = getRemoteAgentMetadataPath(taskId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(metadata))
}

export async function readRemoteAgentMetadata(
  taskId: string,
): Promise<RemoteAgentMetadata | null> {
  const path = getRemoteAgentMetadataPath(taskId)
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as RemoteAgentMetadata
  } catch (e) {
    if (isFsInaccessible(e)) return null
    throw e
  }
}

export async function deleteRemoteAgentMetadata(taskId: string): Promise<void> {
  const path = getRemoteAgentMetadataPath(taskId)
  try {
    await unlink(path)
  } catch (e) {
    if (isFsInaccessible(e)) return
    throw e
  }
}

/**
 * Escanea el directorio remote-agents/ en busca de todos los archivos de
 * metadata persistidos. Lo usa restoreRemoteAgentTasks para reconectar a
 * sesiones de CCR que todavía siguen corriendo.
 */
export async function listRemoteAgentMetadata(): Promise<
  RemoteAgentMetadata[]
> {
  const dir = getRemoteAgentsDir()
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (e) {
    if (isFsInaccessible(e)) return []
    throw e
  }
  const results: RemoteAgentMetadata[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.meta.json')) continue
    try {
      const raw = await readFile(join(dir, entry.name), 'utf-8')
      results.push(JSON.parse(raw) as RemoteAgentMetadata)
    } catch (e) {
      // Salta archivos ilegibles o corruptos — una escritura parcial de
      // un persist fire-and-forget que se cayó no debería tumbar toda la
      // restauración.
      logForDebugging(
        `listRemoteAgentMetadata: skipping ${entry.name}: ${String(e)}`,
      )
    }
  }
  return results
}
