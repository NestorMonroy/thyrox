/**
 * Permisos sincronizados entre los agentes de una tanda.
 *
 * Procedencia: `ccnmt: packages/swarm/src/permissions/index.ts` (919 líneas,
 * 23 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** y no se copia.
 *
 * EL PROBLEMA: un compañero que se topa con una petición de permiso no tiene
 * a quién preguntarle — el usuario está delante del líder, no de él. Así que
 * la reenvía, el líder decide, y la respuesta vuelve.
 *
 * DOS TRANSPORTES, y los dos siguen vivos en la fuente:
 *
 * - **Por archivos** — `permissions/pending/` y `permissions/resolved/` bajo
 *   el directorio del equipo. El líder lee la bandeja de pendientes; al
 *   resolver, la petición se MUEVE de una carpeta a la otra.
 * - **Por buzón** — el mismo mensajero que usan los compañeros para hablar
 *   entre sí, con mensajes de protocolo de petición y respuesta.
 *
 * DIVERGENCIA DECLARADA: no se importan `PermissionUpdate` como tipo de
 * anfitrión (se usa `unknown[]` en su lugar, que es lo que el esquema ya
 * declara) ni el `generateRequestId` del adaptador. El segundo es una
 * COLISIÓN de nombre: este módulo exporta el suyo, sin argumentos y con
 * prefijo propio, y traer el del anfitrión lo taparía.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '@thyrox/storage/file.js'
import { z } from 'zod/v4'

import {
  getAgentId,
  getAgentName,
  getErrnoCode,
  getTeammateColor,
  getTeamName,
  jsonParse,
  jsonStringify,
  lock,
  logError,
  logForDebugging,
} from '../adapters/appRuntime.js'
import { getTeamDir, readTeamFileAsync } from '../core/teamHelpers.js'
import { lazySchema } from '../internal/lazySchema.js'
import {
  createPermissionRequestMessage,
  createPermissionResponseMessage,
  createSandboxPermissionRequestMessage,
  createSandboxPermissionResponseMessage,
  writeToMailbox,
} from '../mailbox/index.js'

/** La forma completa de una petición de permiso de un compañero al líder. */
export const SwarmPermissionRequestSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    workerId: z.string(),
    workerName: z.string(),
    workerColor: z.string().optional(),
    teamName: z.string(),
    toolName: z.string(),
    toolUseId: z.string(),
    description: z.string(),
    input: z.record(z.string(), z.unknown()),
    permissionSuggestions: z.array(z.unknown()),
    status: z.enum(['pending', 'approved', 'rejected']),
    resolvedBy: z.enum(['worker', 'leader']).optional(),
    resolvedAt: z.number().optional(),
    feedback: z.string().optional(),
    updatedInput: z.record(z.string(), z.unknown()).optional(),
    permissionUpdates: z.array(z.unknown()).optional(),
    createdAt: z.number(),
  }),
)

export type SwarmPermissionRequest = z.infer<
  ReturnType<typeof SwarmPermissionRequestSchema>
>

/** Lo que quien resuelve una petición decide sobre ella. */
export type PermissionResolution = {
  decision: 'approved' | 'rejected'
  resolvedBy: 'worker' | 'leader'
  feedback?: string
  updatedInput?: Record<string, unknown>
  permissionUpdates?: unknown[]
}

/** El directorio de permisos de un equipo. */
export function getPermissionDir(teamName: string): string {
  return join(getTeamDir(teamName), 'permissions')
}

function getPendingDir(teamName: string): string {
  return join(getPermissionDir(teamName), 'pending')
}

function getResolvedDir(teamName: string): string {
  return join(getPermissionDir(teamName), 'resolved')
}

async function ensurePermissionDirsAsync(teamName: string): Promise<void> {
  for (const dir of [
    getPermissionDir(teamName),
    getPendingDir(teamName),
    getResolvedDir(teamName),
  ]) {
    await mkdir(dir, { recursive: true })
  }
}

function getPendingRequestPath(teamName: string, requestId: string): string {
  return join(getPendingDir(teamName), `${requestId}.json`)
}

function getResolvedRequestPath(teamName: string, requestId: string): string {
  return join(getResolvedDir(teamName), `${requestId}.json`)
}

/** Un identificador de petición, con su prefijo propio. */
export function generateRequestId(): string {
  return `perm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Arma una petición de permiso desde la identidad de quien la hace.
 *
 * La identidad es OBLIGATORIA y su ausencia lanza: una petición sin remitente
 * no se puede enrutar de vuelta — el líder la aprobaría y la respuesta no
 * tendría a dónde ir. Fallar aquí cuesta menos que un compañero esperando
 * para siempre.
 */
export function createPermissionRequest(params: {
  toolName: string
  toolUseId: string
  input: Record<string, unknown>
  description: string
  permissionSuggestions?: unknown[]
  teamName?: string
  workerId?: string
  workerName?: string
  workerColor?: string
}): SwarmPermissionRequest {
  const teamName = params.teamName || getTeamName()
  const workerId = params.workerId || getAgentId()
  const workerName = params.workerName || getAgentName()
  const workerColor = params.workerColor || getTeammateColor()

  if (!teamName) throw new Error('Team name is required for permission requests')
  if (!workerId) throw new Error('Worker ID is required for permission requests')
  if (!workerName) {
    throw new Error('Worker name is required for permission requests')
  }

  return {
    id: generateRequestId(),
    workerId,
    workerName,
    workerColor,
    teamName,
    toolName: params.toolName,
    toolUseId: params.toolUseId,
    description: params.description,
    input: params.input,
    permissionSuggestions: params.permissionSuggestions || [],
    status: 'pending',
    createdAt: Date.now(),
  }
}

/**
 * Deja una petición en la bandeja de pendientes.
 *
 * A diferencia de casi todo lo demás de este módulo, RELANZA el error: quien
 * pide un permiso tiene que enterarse de que su petición no llegó, porque si
 * no se quedaría esperando una respuesta que nadie va a dar.
 */
export async function writePermissionRequest(
  request: SwarmPermissionRequest,
): Promise<SwarmPermissionRequest> {
  await ensurePermissionDirsAsync(request.teamName)

  const pendingPath = getPendingRequestPath(request.teamName, request.id)
  // El cerrojo es del DIRECTORIO y no del archivo: lo que se protege es la
  // bandeja, que varios compañeros escriben a la vez.
  const lockFilePath = join(getPendingDir(request.teamName), '.lock')
  await writeFile(lockFilePath, '', 'utf-8')

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(lockFilePath)
    await atomicWriteFile(pendingPath, jsonStringify(request, null, 2))
    logForDebugging(
      `[PermissionSync] Wrote pending request ${request.id} from ${request.workerName} for ${request.toolName}`,
    )
    return request
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to write permission request: ${error}`)
    logError(error)
    throw error
  } finally {
    if (release) await release()
  }
}

/**
 * La bandeja de pendientes del líder, de la más VIEJA a la más nueva.
 *
 * Un archivo que no valida se descarta y los demás siguen: uno corrupto no
 * puede tumbar la bandeja entera.
 */
export async function readPendingPermissions(
  teamName?: string,
): Promise<SwarmPermissionRequest[]> {
  const team = teamName || getTeamName()
  if (!team) {
    logForDebugging('[PermissionSync] No team name available')
    return []
  }

  const pendingDir = getPendingDir(team)

  let files: string[]
  try {
    files = await readdir(pendingDir)
  } catch (e: unknown) {
    if (getErrnoCode(e) === 'ENOENT') return []
    logForDebugging(`[PermissionSync] Failed to read pending requests: ${e}`)
    logError(e)
    return []
  }

  // El filtro de extensión es el que manda: excluye el cerrojo y también los
  // temporales que una escritura atómica deja al vuelo. La segunda cláusula es
  // REDUNDANTE —`.lock` no termina en `.json`— y se conserva por fidelidad a
  // la fuente; medido con anulación, retirarla sola no cambia ningún veredicto.
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== '.lock')

  const results = await Promise.all(
    jsonFiles.map(async file => {
      const filePath = join(pendingDir, file)
      try {
        const content = await readFile(filePath, 'utf-8')
        const parsed = SwarmPermissionRequestSchema().safeParse(jsonParse(content))
        if (parsed.success) return parsed.data
        logForDebugging(
          `[PermissionSync] Invalid request file ${file}: ${parsed.error.message}`,
        )
        return null
      } catch (err) {
        logForDebugging(
          `[PermissionSync] Failed to read request file ${file}: ${err}`,
        )
        return null
      }
    }),
  )

  const requests = results.filter(r => r !== null)
  // El orden es el de llegada: quien lleva más esperando se atiende antes.
  requests.sort((a, b) => a.createdAt - b.createdAt)
  return requests
}

/** La resolución de una petición, o `null` si aún no la hay. */
export async function readResolvedPermission(
  requestId: string,
  teamName?: string,
): Promise<SwarmPermissionRequest | null> {
  const team = teamName || getTeamName()
  if (!team) return null

  const resolvedPath = getResolvedRequestPath(team, requestId)

  try {
    const content = await readFile(resolvedPath, 'utf-8')
    const parsed = SwarmPermissionRequestSchema().safeParse(jsonParse(content))
    if (parsed.success) return parsed.data
    logForDebugging(
      `[PermissionSync] Invalid resolved request ${requestId}: ${parsed.error.message}`,
    )
    return null
  } catch (e: unknown) {
    // Que no esté resuelta todavía es el caso normal del sondeo.
    if (getErrnoCode(e) === 'ENOENT') return null
    logForDebugging(
      `[PermissionSync] Failed to read resolved request ${requestId}: ${e}`,
    )
    logError(e)
    return null
  }
}

/**
 * Resuelve una petición: la MUEVE de pendientes a resueltas.
 *
 * Mover y no copiar es lo que impide que el líder vuelva a ver en su bandeja
 * algo que ya decidió.
 */
export async function resolvePermission(
  requestId: string,
  resolution: PermissionResolution,
  teamName?: string,
): Promise<boolean> {
  const team = teamName || getTeamName()
  if (!team) {
    logForDebugging('[PermissionSync] No team name available')
    return false
  }

  await ensurePermissionDirsAsync(team)

  const pendingPath = getPendingRequestPath(team, requestId)
  const resolvedPath = getResolvedRequestPath(team, requestId)
  const lockFilePath = join(getPendingDir(team), '.lock')

  await writeFile(lockFilePath, '', 'utf-8')

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(lockFilePath)

    let content: string
    try {
      content = await readFile(pendingPath, 'utf-8')
    } catch (e: unknown) {
      if (getErrnoCode(e) === 'ENOENT') {
        logForDebugging(`[PermissionSync] Pending request not found: ${requestId}`)
        return false
      }
      throw e
    }

    const parsed = SwarmPermissionRequestSchema().safeParse(jsonParse(content))
    if (!parsed.success) {
      logForDebugging(
        `[PermissionSync] Invalid pending request ${requestId}: ${parsed.error.message}`,
      )
      return false
    }

    const resolvedRequest: SwarmPermissionRequest = {
      ...parsed.data,
      status: resolution.decision === 'approved' ? 'approved' : 'rejected',
      resolvedBy: resolution.resolvedBy,
      resolvedAt: Date.now(),
      feedback: resolution.feedback,
      updatedInput: resolution.updatedInput,
      permissionUpdates: resolution.permissionUpdates,
    }

    await atomicWriteFile(resolvedPath, jsonStringify(resolvedRequest, null, 2))
    await unlink(pendingPath)

    logForDebugging(
      `[PermissionSync] Resolved request ${requestId} with ${resolution.decision}`,
    )
    return true
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to resolve request: ${error}`)
    logError(error)
    return false
  } finally {
    if (release) await release()
  }
}

/**
 * Borra las resoluciones viejas.
 *
 * La comparación es «mayor o igual» a propósito: con edad máxima cero, una
 * resolución de este mismo instante también entra — si fuera estricta, pedir
 * «límpialo todo» no limpiaría nada.
 *
 * Un archivo que no se puede leer se borra igualmente: si no se puede saber su
 * edad, dejarlo lo haría eterno.
 */
export async function cleanupOldResolutions(
  teamName?: string,
  maxAgeMs = 3600000,
): Promise<number> {
  const team = teamName || getTeamName()
  if (!team) return 0

  const resolvedDir = getResolvedDir(team)

  let files: string[]
  try {
    files = await readdir(resolvedDir)
  } catch (e: unknown) {
    if (getErrnoCode(e) === 'ENOENT') return 0
    logForDebugging(`[PermissionSync] Failed to cleanup resolutions: ${e}`)
    logError(e)
    return 0
  }

  const now = Date.now()
  const jsonFiles = files.filter(f => f.endsWith('.json'))

  const cleanupResults = await Promise.all(
    jsonFiles.map(async file => {
      const filePath = join(resolvedDir, file)
      try {
        const content = await readFile(filePath, 'utf-8')
        const request = jsonParse(content) as SwarmPermissionRequest
        const resolvedAt = request.resolvedAt || request.createdAt
        if (now - resolvedAt >= maxAgeMs) {
          await unlink(filePath)
          logForDebugging(`[PermissionSync] Cleaned up old resolution: ${file}`)
          return 1
        }
        return 0
      } catch {
        try {
          await unlink(filePath)
          return 1
        } catch {
          return 0
        }
      }
    }),
  )

  const cleanedCount = cleanupResults.reduce<number>((sum, n) => sum + n, 0)
  if (cleanedCount > 0) {
    logForDebugging(`[PermissionSync] Cleaned up ${cleanedCount} old resolutions`)
  }
  return cleanedCount
}

/** La forma con la que el compañero lee la respuesta a su petición. */
export type PermissionResponse = {
  requestId: string
  decision: 'approved' | 'denied'
  timestamp: string
  feedback?: string
  updatedInput?: Record<string, unknown>
  permissionUpdates?: unknown[]
}

/**
 * Sondea la respuesta a una petición.
 *
 * TODO lo que no es «aprobado» sale como «denegado»: el compañero sólo puede
 * continuar si le dijeron que sí, y un estado que no reconozca tiene que
 * frenarlo igual que un rechazo.
 */
export async function pollForResponse(
  requestId: string,
  _agentName?: string,
  teamName?: string,
): Promise<PermissionResponse | null> {
  const resolved = await readResolvedPermission(requestId, teamName)
  if (!resolved) return null

  return {
    requestId: resolved.id,
    decision: resolved.status === 'approved' ? 'approved' : 'denied',
    timestamp: resolved.resolvedAt
      ? new Date(resolved.resolvedAt).toISOString()
      : new Date(resolved.createdAt).toISOString(),
    feedback: resolved.feedback,
    updatedInput: resolved.updatedInput,
    permissionUpdates: resolved.permissionUpdates,
  }
}

/** Retira la respuesta ya procesada. Alias de `deleteResolvedPermission`. */
export async function removeWorkerResponse(
  requestId: string,
  _agentName?: string,
  teamName?: string,
): Promise<void> {
  await deleteResolvedPermission(requestId, teamName)
}

/**
 * Si esta sesión es el líder del equipo.
 *
 * Sin equipo la pregunta no tiene sentido, y contestar que sí daría a una
 * sesión suelta autoridad sobre un equipo que no existe.
 */
export function isTeamLeader(teamName?: string): boolean {
  const team = teamName || getTeamName()
  if (!team) return false

  // El líder no recibe identificador de agente al arrancar; el reservado se
  // acepta por las sesiones que sí lo declaran.
  const agentId = getAgentId()
  return !agentId || agentId === 'team-lead'
}

/** Si esta sesión es un compañero dentro de un equipo. */
export function isSwarmWorker(): boolean {
  const teamName = getTeamName()
  const agentId = getAgentId()
  return !!teamName && !!agentId && !isTeamLeader()
}

/** Borra el archivo de una resolución ya consumida. */
export async function deleteResolvedPermission(
  requestId: string,
  teamName?: string,
): Promise<boolean> {
  const team = teamName || getTeamName()
  if (!team) return false

  const resolvedPath = getResolvedRequestPath(team, requestId)

  try {
    await unlink(resolvedPath)
    logForDebugging(`[PermissionSync] Deleted resolved permission: ${requestId}`)
    return true
  } catch (e: unknown) {
    if (getErrnoCode(e) === 'ENOENT') return false
    logForDebugging(`[PermissionSync] Failed to delete resolved permission: ${e}`)
    logError(e)
    return false
  }
}

/**
 * El NOMBRE del líder, que es lo que el buzón necesita.
 *
 * El roster guarda identificadores, y los buzones se indexan por nombre. Si el
 * líder no aparece en el roster se cae al nombre reservado: sin ese respaldo
 * la petición iría a un buzón llamado `undefined`.
 */
export async function getLeaderName(teamName?: string): Promise<string | null> {
  const team = teamName || getTeamName()
  if (!team) return null

  const teamFile = await readTeamFileAsync(team)
  if (!teamFile) {
    logForDebugging(`[PermissionSync] Team file not found for team: ${team}`)
    return null
  }

  const leadMember = teamFile.members.find(m => m.agentId === teamFile.leadAgentId)
  return leadMember?.name || 'team-lead'
}

/** Manda la petición de permiso al buzón del líder. */
export async function sendPermissionRequestViaMailbox(
  request: SwarmPermissionRequest,
): Promise<boolean> {
  const leaderName = await getLeaderName(request.teamName)
  if (!leaderName) {
    logForDebugging(
      '[PermissionSync] Cannot send permission request: leader name not found',
    )
    return false
  }

  try {
    const message = createPermissionRequestMessage({
      request_id: request.id,
      agent_id: request.workerName,
      tool_name: request.toolName,
      tool_use_id: request.toolUseId,
      description: request.description,
      input: request.input,
      permission_suggestions: request.permissionSuggestions,
    })

    await writeToMailbox(
      leaderName,
      {
        from: request.workerName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
        color: request.workerColor,
      },
      request.teamName,
    )

    logForDebugging(
      `[PermissionSync] Sent permission request ${request.id} to leader ${leaderName} via mailbox`,
    )
    return true
  } catch (error) {
    logForDebugging(
      `[PermissionSync] Failed to send permission request via mailbox: ${error}`,
    )
    logError(error)
    return false
  }
}

/**
 * Manda la respuesta al buzón del compañero.
 *
 * Lo aprobado viaja como éxito y lo rechazado como error: es el vocabulario
 * del protocolo, y el compañero decide por él sin volver a leer el estado.
 */
export async function sendPermissionResponseViaMailbox(
  workerName: string,
  resolution: PermissionResolution,
  requestId: string,
  teamName?: string,
): Promise<boolean> {
  const team = teamName || getTeamName()
  if (!team) {
    logForDebugging(
      '[PermissionSync] Cannot send permission response: team name not found',
    )
    return false
  }

  try {
    const message = createPermissionResponseMessage({
      request_id: requestId,
      subtype: resolution.decision === 'approved' ? 'success' : 'error',
      error: resolution.feedback,
      updated_input: resolution.updatedInput,
      permission_updates: resolution.permissionUpdates,
    })

    const senderName = getAgentName() || 'team-lead'

    await writeToMailbox(
      workerName,
      {
        from: senderName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
      },
      team,
    )

    logForDebugging(
      `[PermissionSync] Sent permission response for ${requestId} to worker ${workerName} via mailbox`,
    )
    return true
  } catch (error) {
    logForDebugging(
      `[PermissionSync] Failed to send permission response via mailbox: ${error}`,
    )
    logError(error)
    return false
  }
}

/** Un identificador de petición de red, con su prefijo propio. */
export function generateSandboxRequestId(): string {
  return `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Pide al líder permiso para alcanzar un anfitrión desde el confinamiento.
 *
 * Exige identidad completa del compañero: sin nombre, la respuesta no tendría
 * buzón al que volver.
 */
export async function sendSandboxPermissionRequestViaMailbox(
  host: string,
  requestId: string,
  teamName?: string,
): Promise<boolean> {
  const team = teamName || getTeamName()
  if (!team) {
    logForDebugging(
      '[PermissionSync] Cannot send sandbox permission request: team name not found',
    )
    return false
  }

  const leaderName = await getLeaderName(team)
  if (!leaderName) {
    logForDebugging(
      '[PermissionSync] Cannot send sandbox permission request: leader name not found',
    )
    return false
  }

  const workerId = getAgentId()
  const workerName = getAgentName()
  const workerColor = getTeammateColor()

  if (!workerId || !workerName) {
    logForDebugging(
      '[PermissionSync] Cannot send sandbox permission request: worker ID or name not found',
    )
    return false
  }

  try {
    const message = createSandboxPermissionRequestMessage({
      requestId,
      workerId,
      workerName,
      workerColor,
      host,
    })

    await writeToMailbox(
      leaderName,
      {
        from: workerName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
        color: workerColor,
      },
      team,
    )

    logForDebugging(
      `[PermissionSync] Sent sandbox permission request ${requestId} for host ${host} to leader ${leaderName} via mailbox`,
    )
    return true
  } catch (error) {
    logForDebugging(
      `[PermissionSync] Failed to send sandbox permission request via mailbox: ${error}`,
    )
    logError(error)
    return false
  }
}

/** Contesta la petición de red de un compañero. */
export async function sendSandboxPermissionResponseViaMailbox(
  workerName: string,
  requestId: string,
  host: string,
  allow: boolean,
  teamName?: string,
): Promise<boolean> {
  const team = teamName || getTeamName()
  if (!team) {
    logForDebugging(
      '[PermissionSync] Cannot send sandbox permission response: team name not found',
    )
    return false
  }

  try {
    const message = createSandboxPermissionResponseMessage({
      requestId,
      host,
      allow,
    })

    const senderName = getAgentName() || 'team-lead'

    await writeToMailbox(
      workerName,
      {
        from: senderName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
      },
      team,
    )

    logForDebugging(
      `[PermissionSync] Sent sandbox permission response for ${requestId} (host: ${host}, allow: ${allow}) to worker ${workerName} via mailbox`,
    )
    return true
  } catch (error) {
    logForDebugging(
      `[PermissionSync] Failed to send sandbox permission response via mailbox: ${error}`,
    )
    logError(error)
    return false
  }
}
