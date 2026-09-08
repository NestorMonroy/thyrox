/**
 * Helpers de equipo: el `config.json` por equipo y todo lo que lo lee y lo
 * escribe.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teamHelpers.ts` (735 líneas,
 * 28 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que los cuerpos se **reimplementan** y no se copian.
 *
 * CIERRE DEL PORTE. El tramo anterior traía 9 de los 28 —los dos saneadores
 * y el contrato de tipos— y declaraba su recorte con tres bloqueos: los
 * bindings de host de `appRuntime`, `lock()`, y `execFileNoThrow`/`gitExe`.
 * Los tres nombraban su propia caducidad, y hoy no se sostienen: `appRuntime`
 * está portado con sus 105 bindings, y las otras dos son tres de ellos. Los
 * avisos SE RETIRAN en vez de dejarlos pudrirse — un bloqueo caducado que
 * nadie borra se lee como vigente, y quien llegue lo vuelve a rodear.
 *
 * EL SANEADO ES LA DEFENSA, no una cortesía de formato. El nombre del equipo
 * viene de la herramienta, o sea del modelo, y se concatena a una ruta que
 * luego se borra entera. `sanitizeName` colapsa todo lo que no sea
 * alfanumérico a guiones, así que ningún nombre puede escapar del directorio
 * de equipos.
 *
 * TODA ESCRITURA PASA POR `updateTeamFileAsync`, y por su cerrojo. El archivo
 * se reemplaza completo en cada escritura, así que dos escritores sin cerrojo
 * pierden uno de los dos cambios sin que nadie se entere.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 *
 * NOTA DE SOLAPE: `TeamFile` es el ROSTER de una sesión de swarm —quién es
 * miembro, su panel, su modo de permiso—, reemplazado completo en cada
 * escritura. NO es el ledger de `src/coordination/ledger.ts`, que reserva
 * rutas de archivo entre agentes de una tanda y es un JSONL que se fusiona
 * por git. Se declaran los dos para que una decisión futura no los
 * redescubra por separado.
 */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { atomicWriteFile } from '@thyrox/storage/file.js'

import {
  errorMessage,
  execFileNoThrowWithCwd,
  getAgentName,
  getErrnoCode,
  getSessionCreatedTeams,
  getTasksDir,
  getTeamName,
  getTeamsDir,
  gitExe,
  isTeammate,
  jsonParse,
  jsonStringify,
  lock,
  logForDebugging,
  notifyTasksUpdated,
} from '../adapters/appRuntime.js'
import type { PermissionMode } from '../adapters/appRuntime.js'
import type { BackendType } from '../backends/types.js'
import { isPaneBackend } from '../backends/types.js'
import { lazySchema } from '../internal/lazySchema.js'
import { TEAM_LEAD_NAME } from './constants.js'

/**
 * Cómo se espera al cerrojo del archivo de equipo.
 *
 * Muchos reintentos muy cortos y sin crecimiento: la sección crítica es leer,
 * transformar y escribir un JSON pequeño, así que quien espera lo hace
 * milisegundos. Un respaldo exponencial aquí haría esperar cientos de
 * milisegundos por una contención que ya se resolvió.
 */
const TEAM_FILE_LOCK_OPTIONS = {
  retries: {
    retries: 200,
    factor: 1,
    minTimeout: 5,
    maxTimeout: 25,
  },
}

export const inputSchema = lazySchema(() =>
  z.strictObject({
    operation: z
      .enum(['spawnTeam', 'cleanup'])
      .describe(
        'Operation: spawnTeam to create a team, cleanup to remove team and task directories.',
      ),
    agent_type: z
      .string()
      .optional()
      .describe(
        'Type/role of the team lead (e.g., "researcher", "test-runner"). ' +
          'Used for team file and inter-agent coordination.',
      ),
    team_name: z
      .string()
      .optional()
      .describe('Name for the new team to create (required for spawnTeam).'),
    description: z
      .string()
      .optional()
      .describe('Team description/purpose (only used with spawnTeam).'),
  }),
)

// Tipos de salida para las distintas operaciones
export type SpawnTeamOutput = {
  team_name: string
  team_file_path: string
  lead_agent_id: string
}

export type CleanupOutput = {
  success: boolean
  message: string
  team_name?: string
}

export type TeamAllowedPath = {
  path: string // Path del directorio (absoluto)
  toolName: string // La herramienta a la que aplica (p.ej. "Edit", "Write")
  addedBy: string // Nombre del agente que añadió esta regla
  addedAt: number // Timestamp de cuándo se añadió
}

export type TeamFile = {
  name: string
  description?: string
  createdAt: number
  leadAgentId: string
  leadSessionId?: string // UUID de sesión real del líder (para discovery)
  hiddenPaneIds?: string[] // Pane IDs actualmente ocultos de la UI
  teamAllowedPaths?: TeamAllowedPath[] // Paths que todos los teammates pueden editar sin preguntar
  members: Array<{
    agentId: string
    name: string
    agentType?: string
    model?: string
    prompt?: string
    color?: string
    planModeRequired?: boolean
    joinedAt: number
    tmuxPaneId: string
    cwd: string
    worktreePath?: string
    sessionId?: string
    subscriptions: string[]
    backendType?: BackendType
    isActive?: boolean // false cuando está idle, undefined/true cuando activo
    mode?: string // Modo de permiso actual de este teammate
  }>
}

export type Input = z.infer<ReturnType<typeof inputSchema>>
// Se exporta SpawnTeamOutput como Output por compatibilidad hacia atrás
export type Output = SpawnTeamOutput

/**
 * Sanitiza un nombre para usarlo en nombres de ventana tmux, paths de
 * worktree y paths de archivo. Reemplaza todo carácter no alfanumérico
 * por un guion y pasa a minúsculas.
 */
export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
}

/**
 * Sanitiza un nombre de agente para usarlo en agent IDs determinísticos.
 * Reemplaza `@` por `-` para evitar ambigüedad en el formato
 * `agentName@teamName`.
 */
export function sanitizeAgentName(name: string): string {
  return name.replace(/@/g, '-')
}

/** El directorio de un equipo, bajo el de equipos del anfitrión. */
export function getTeamDir(teamName: string): string {
  return join(getTeamsDir(), sanitizeName(teamName))
}

/** La ruta del `config.json` de un equipo. */
export function getTeamFilePath(teamName: string): string {
  return join(getTeamDir(teamName), 'config.json')
}

/**
 * Lee el archivo de un equipo, de forma síncrona.
 *
 * La versión síncrona existe para los contextos que no pueden esperar —el
 * cómputo del contexto inicial antes del primer render, por ejemplo—.
 *
 * Que el archivo NO exista es el caso normal —se pregunta antes de crear—, así
 * que devuelve `null` sin registrar nada. Cualquier otro fallo sí se registra:
 * ahí «no hay equipo» y «el equipo está corrupto» son cosas distintas.
 */
export function readTeamFile(teamName: string): TeamFile | null {
  try {
    const content = readFileSync(getTeamFilePath(teamName), 'utf-8')
    return jsonParse(content) as TeamFile
  } catch (e) {
    if (getErrnoCode(e) === 'ENOENT') return null
    logForDebugging(
      `[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(e)}`,
    )
    return null
  }
}

/** Lee el archivo de un equipo. Mismo criterio de ausencia que el síncrono. */
export async function readTeamFileAsync(
  teamName: string,
): Promise<TeamFile | null> {
  try {
    const content = await readFile(getTeamFilePath(teamName), 'utf-8')
    return jsonParse(content) as TeamFile
  } catch (e) {
    if (getErrnoCode(e) === 'ENOENT') return null
    logForDebugging(
      `[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(e)}`,
    )
    return null
  }
}

/**
 * Escribe el archivo de un equipo, creando su directorio si falta.
 *
 * La escritura es atómica: un archivo de equipo a medio escribir se lee como
 * corrupto, y quien lo lea perderá el roster entero.
 */
export async function writeTeamFileAsync(
  teamName: string,
  teamFile: TeamFile,
): Promise<void> {
  await mkdir(getTeamDir(teamName), { recursive: true })
  await atomicWriteFile(
    getTeamFilePath(teamName),
    jsonStringify(teamFile, null, 2),
  )
}

/**
 * Lee, transforma y escribe el archivo de un equipo bajo cerrojo.
 *
 * Es el ÚNICO camino de escritura: el archivo se reemplaza completo, así que
 * dos escritores concurrentes sin cerrojo pierden uno de los dos cambios en
 * silencio.
 *
 * Si el transformador devuelve `null`, no se escribe nada — así un cambio que
 * resulta ser un no-op no reescribe el archivo ni despierta a quien lo vigile.
 *
 * El cerrojo se suelta en `finally`: un transformador que lanza dejaría si no
 * el archivo bloqueado para el resto de la sesión, y el siguiente escritor
 * giraría sus reintentos hasta rendirse.
 */
export async function updateTeamFileAsync(
  teamName: string,
  updater: (
    teamFile: TeamFile | null,
  ) => TeamFile | null | Promise<TeamFile | null>,
): Promise<TeamFile | null> {
  const teamDir = getTeamDir(teamName)
  await mkdir(teamDir, { recursive: true })

  const lockFilePath = join(teamDir, 'config.json.lock')
  await writeFile(lockFilePath, '', 'utf-8')

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(lockFilePath, TEAM_FILE_LOCK_OPTIONS)
    const current = await readTeamFileAsync(teamName)
    const next = await updater(current)
    if (!next) return null

    await atomicWriteFile(
      getTeamFilePath(teamName),
      jsonStringify(next, null, 2),
    )
    return next
  } finally {
    if (release) await release()
  }
}

/**
 * Quita a un compañero del archivo, por identificador de agente o por nombre.
 *
 * Sin identificador NO toca el archivo: una llamada así es un defecto de quien
 * llama, y borrar «el primero» sería peor que no hacer nada.
 */
export async function removeTeammateFromTeamFile(
  teamName: string,
  identifier: { agentId?: string; name?: string },
): Promise<boolean> {
  const identifierStr = identifier.agentId || identifier.name
  if (!identifierStr) {
    logForDebugging(
      '[TeammateTool] removeTeammateFromTeamFile called with no identifier',
    )
    return false
  }

  let removed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) {
      logForDebugging(
        `[TeammateTool] Cannot remove teammate ${identifierStr}: failed to read team file for "${teamName}"`,
      )
      return null
    }

    const members = teamFile.members.filter(m => {
      if (identifier.agentId && m.agentId === identifier.agentId) return false
      if (identifier.name && m.name === identifier.name) return false
      return true
    })

    if (members.length === teamFile.members.length) {
      logForDebugging(
        `[TeammateTool] Teammate ${identifierStr} not found in team file for "${teamName}"`,
      )
      return null
    }

    removed = true
    return { ...teamFile, members }
  })

  if (removed) {
    logForDebugging(
      `[TeammateTool] Removed teammate from team file: ${identifierStr}`,
    )
  }
  return removed
}

/**
 * Añade un panel a la lista de ocultos.
 *
 * El retorno responde «¿existe el equipo?», NO «¿cambió algo?»: quien llama
 * decide si seguir, y un `false` por «ya estaba oculto» le haría creer que el
 * equipo desapareció.
 */
export async function addHiddenPaneId(
  teamName: string,
  paneId: string,
): Promise<boolean> {
  let found = false
  let added = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null
    found = true

    const hiddenPaneIds = teamFile.hiddenPaneIds ?? []
    if (hiddenPaneIds.includes(paneId)) return null

    added = true
    return { ...teamFile, hiddenPaneIds: [...hiddenPaneIds, paneId] }
  })

  if (added) {
    logForDebugging(
      `[TeammateTool] Added ${paneId} to hidden panes for team ${teamName}`,
    )
  }
  return found
}

/** Quita un panel de la lista de ocultos. Mismo criterio de retorno. */
export async function removeHiddenPaneId(
  teamName: string,
  paneId: string,
): Promise<boolean> {
  let found = false
  let removed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null
    found = true

    const hiddenPaneIds = teamFile.hiddenPaneIds ?? []
    if (!hiddenPaneIds.includes(paneId)) return null

    removed = true
    return {
      ...teamFile,
      hiddenPaneIds: hiddenPaneIds.filter(id => id !== paneId),
    }
  })

  if (removed) {
    logForDebugging(
      `[TeammateTool] Removed ${paneId} from hidden panes for team ${teamName}`,
    )
  }
  return found
}

/**
 * Quita a un miembro por su panel, y PURGA ese panel de la lista de ocultos.
 *
 * La lista sólo se poda aquí: dejar el panel de alguien que ya no está deja
 * basura que nadie vuelve a limpiar.
 */
export async function removeMemberFromTeam(
  teamName: string,
  tmuxPaneId: string,
): Promise<boolean> {
  let removed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null

    const members = teamFile.members.filter(m => m.tmuxPaneId !== tmuxPaneId)
    if (members.length === teamFile.members.length) return null

    removed = true
    return {
      ...teamFile,
      members,
      hiddenPaneIds: teamFile.hiddenPaneIds?.filter(id => id !== tmuxPaneId),
    }
  })

  if (removed) {
    logForDebugging(
      `[TeammateTool] Removed member with pane ${tmuxPaneId} from team ${teamName}`,
    )
  }
  return removed
}

/**
 * Quita a un miembro por su identificador de agente.
 *
 * Es la vía para los compañeros EN PROCESO, que comparten un mismo panel:
 * quitarlos por panel se los llevaría a todos de una vez.
 */
export async function removeMemberByAgentId(
  teamName: string,
  agentId: string,
): Promise<boolean> {
  let removed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null

    const members = teamFile.members.filter(m => m.agentId !== agentId)
    if (members.length === teamFile.members.length) return null

    removed = true
    return { ...teamFile, members }
  })

  if (removed) {
    logForDebugging(
      `[TeammateTool] Removed member ${agentId} from team ${teamName}`,
    )
  }
  return removed
}

/**
 * Fija el modo de permiso de un miembro.
 *
 * Devuelve si el miembro EXISTE, no si cambió: fijar el modo que ya tenía es
 * un éxito, y quien llama no tiene por qué distinguirlo.
 */
export async function setMemberMode(
  teamName: string,
  memberName: string,
  mode: PermissionMode,
): Promise<boolean> {
  let found = false
  let changed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null

    const member = teamFile.members.find(m => m.name === memberName)
    if (!member) {
      logForDebugging(
        `[TeammateTool] Cannot set member mode: member ${memberName} not found in team ${teamName}`,
      )
      return null
    }

    found = true
    if (member.mode === mode) return null

    changed = true
    return {
      ...teamFile,
      members: teamFile.members.map(m =>
        m.name === memberName ? { ...m, mode } : m,
      ),
    }
  })

  if (changed) {
    logForDebugging(
      `[TeammateTool] Set member ${memberName} in team ${teamName} to mode: ${mode}`,
    )
  }
  return found
}

/**
 * Publica el modo propio en el archivo del equipo, para que el líder lo vea.
 *
 * No-op si no corremos como compañero: un líder no es miembro de su propio
 * roster por esta vía.
 */
export function syncTeammateMode(
  mode: PermissionMode,
  teamNameOverride?: string,
): void {
  if (!isTeammate()) return
  const teamName = teamNameOverride ?? getTeamName()
  const agentName = getAgentName()
  if (teamName && agentName) {
    void setMemberMode(teamName, agentName, mode)
  }
}

/**
 * Fija el modo de VARIOS miembros en UNA sola escritura.
 *
 * Una escritura por miembro abriría entre ellas una ventana en la que el
 * archivo describe un estado que nadie pidió, y cualquiera que lo lea ahí verá
 * medio cambio aplicado.
 */
export async function setMultipleMemberModes(
  teamName: string,
  modeUpdates: Array<{ memberName: string; mode: PermissionMode }>,
): Promise<boolean> {
  let found = false
  let anyChanged = false
  const updateMap = new Map(modeUpdates.map(u => [u.memberName, u.mode]))

  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) return null
    found = true

    const updatedMembers = teamFile.members.map(member => {
      const newMode = updateMap.get(member.name)
      if (newMode !== undefined && member.mode !== newMode) {
        anyChanged = true
        return { ...member, mode: newMode }
      }
      return member
    })

    if (!anyChanged) return null
    return { ...teamFile, members: updatedMembers }
  })

  if (anyChanged) {
    logForDebugging(
      `[TeammateTool] Set ${modeUpdates.length} member modes in team ${teamName}`,
    )
  }
  return found
}

/**
 * Marca a un miembro como activo o inactivo.
 *
 * Se llama en cada arranque y cada parada de turno, así que sólo escribe
 * cuando el valor CAMBIA: si no, el archivo se reescribiría en cada latido.
 */
export async function setMemberActive(
  teamName: string,
  memberName: string,
  isActive: boolean,
): Promise<void> {
  let changed = false
  await updateTeamFileAsync(teamName, teamFile => {
    if (!teamFile) {
      logForDebugging(
        `[TeammateTool] Cannot set member active: team ${teamName} not found`,
      )
      return null
    }

    const member = teamFile.members.find(m => m.name === memberName)
    if (!member) {
      logForDebugging(
        `[TeammateTool] Cannot set member active: member ${memberName} not found in team ${teamName}`,
      )
      return null
    }

    if (member.isActive === isActive) return null

    changed = true
    return {
      ...teamFile,
      members: teamFile.members.map(m =>
        m.name === memberName ? { ...m, isActive } : m,
      ),
    }
  })

  if (changed) {
    logForDebugging(
      `[TeammateTool] Set member ${memberName} in team ${teamName} to ${isActive ? 'active' : 'idle'}`,
    )
  }
}

/**
 * Destruye el worktree de un compañero.
 *
 * Primero se lo pide a git, que sabe desengancharlo del repositorio; si git
 * rehúsa —un repositorio en un estado que no entiende— se borra el directorio
 * a mano. Sin ese plan B, el worktree se queda en disco para siempre.
 */
async function destroyWorktree(worktreePath: string): Promise<void> {
  const gitFilePath = join(worktreePath, '.git')
  let mainRepoPath: string | null = null

  try {
    const gitFileContent = (await readFile(gitFilePath, 'utf-8')).trim()
    // El `.git` de un worktree es un archivo, no un directorio, y apunta al
    // repositorio principal: `gitdir: <repo>/.git/worktrees/<nombre>`.
    const match = gitFileContent.match(/^gitdir:\s*(.+)$/)
    if (match?.[1]) {
      const mainGitDir = join(match[1], '..', '..')
      mainRepoPath = join(mainGitDir, '..')
    }
  } catch {
    // El `.git` puede no existir: se cae al plan B.
  }

  if (mainRepoPath) {
    const result = await execFileNoThrowWithCwd(
      gitExe(),
      ['worktree', 'remove', '--force', worktreePath],
      { cwd: mainRepoPath },
    )

    if (result.code === 0) {
      logForDebugging(`[TeammateTool] Removed worktree via git: ${worktreePath}`)
      return
    }

    // Que ya no sea un árbol de trabajo es éxito, no fallo: alguien se
    // adelantó.
    if (result.stderr?.includes('not a working tree')) {
      logForDebugging(`[TeammateTool] Worktree already removed: ${worktreePath}`)
      return
    }

    logForDebugging(
      `[TeammateTool] git worktree remove failed, falling back to rm: ${result.stderr}`,
    )
  }

  try {
    await rm(worktreePath, { recursive: true, force: true })
    logForDebugging(
      `[TeammateTool] Removed worktree directory manually: ${worktreePath}`,
    )
  } catch (error) {
    logForDebugging(
      `[TeammateTool] Failed to remove worktree ${worktreePath}: ${errorMessage(error)}`,
    )
  }
}

/**
 * Apunta un equipo para que se limpie al terminar la sesión.
 *
 * El conjunto vive en el anfitrión y no aquí: así se reinicia entre pruebas
 * sin que este módulo tenga estado propio que se filtre de una a otra.
 */
export function registerTeamForSessionCleanup(teamName: string): void {
  getSessionCreatedTeams().add(teamName)
}

/** Retira un equipo del apuntado — ya se limpió por la vía explícita. */
export function unregisterTeamForSessionCleanup(teamName: string): void {
  getSessionCreatedTeams().delete(teamName)
}

/**
 * Limpia los equipos creados en esta sesión que nadie borró.
 *
 * Los paneles se matan ANTES de borrar los directorios: en una salida abrupta
 * los procesos de los compañeros siguen vivos, y borrar sólo los directorios
 * los dejaría huérfanos en paneles abiertos que nadie sabe cerrar.
 */
export async function cleanupSessionTeams(): Promise<void> {
  const sessionCreatedTeams = getSessionCreatedTeams()
  if (sessionCreatedTeams.size === 0) return
  const teams = Array.from(sessionCreatedTeams) as string[]
  logForDebugging(
    `cleanupSessionTeams: removing ${teams.length} orphan team dir(s): ${teams.join(', ')}`,
  )
  await Promise.allSettled(teams.map(name => killOrphanedTeammatePanes(name)))
  await Promise.allSettled(teams.map(name => cleanupTeamDirectories(name)))
  sessionCreatedTeams.clear()
}

/**
 * Mata, con la mano abierta, los paneles de los compañeros de un equipo.
 *
 * BLOQUEADO — la fuente resuelve el respaldo con dos imports DINÁMICOS, a
 * `backends/registry.js` y `backends/detection.js`. El segundo está portado; el
 * primero no, y su porte arrastra los cuatro respaldos concretos
 * (`TmuxBackend` 764 L, `ITermBackend` 370 L, `InProcessBackend` 339 L,
 * `PaneBackendExecutor` 359 L). Medido: `registry.ts` no tiene un solo import
 * externo al paquete, así que el bloqueo es de VOLUMEN, no de dependencia
 * ausente — es el siguiente tramo, no una imposibilidad.
 *
 * Qué se pierde mientras tanto: en una salida abrupta los directorios SÍ se
 * borran, pero los paneles de los compañeros quedan abiertos con sus procesos
 * dentro. Se registra para que quien lo vea sepa que no es un fallo silencioso.
 *
 * Sucesor: TASK-THYROX-0001.
 */
async function killOrphanedTeammatePanes(teamName: string): Promise<void> {
  const teamFile = readTeamFile(teamName)
  if (!teamFile) return

  const paneMembers = teamFile.members.filter(
    m =>
      m.name !== TEAM_LEAD_NAME &&
      m.tmuxPaneId &&
      m.backendType &&
      isPaneBackend(m.backendType),
  )
  if (paneMembers.length === 0) return

  logForDebugging(
    `cleanupSessionTeams: ${paneMembers.length} pane(s) of team ${teamName} left open — ` +
      'backends/registry.ts is not ported yet (TASK-THYROX-0001)',
  )
}

/**
 * Borra el directorio de un equipo y el de sus tareas.
 *
 * Los worktrees se destruyen PRIMERO, y no es un detalle de orden: sus rutas
 * viven en el archivo del equipo, así que borrarlo antes dejaría los worktrees
 * en disco sin que nadie sepa ya dónde están.
 */
export async function cleanupTeamDirectories(teamName: string): Promise<void> {
  const sanitizedName = sanitizeName(teamName)

  const teamFile = readTeamFile(teamName)
  const worktreePaths: string[] = []
  if (teamFile) {
    for (const member of teamFile.members) {
      if (member.worktreePath) worktreePaths.push(member.worktreePath)
    }
  }

  for (const worktreePath of worktreePaths) {
    await destroyWorktree(worktreePath)
  }

  const teamDir = getTeamDir(teamName)
  try {
    await rm(teamDir, { recursive: true, force: true })
    logForDebugging(`[TeammateTool] Cleaned up team directory: ${teamDir}`)
  } catch (error) {
    logForDebugging(
      `[TeammateTool] Failed to clean up team directory ${teamDir}: ${errorMessage(error)}`,
    )
  }

  // El líder y los compañeros guardan sus tareas bajo el nombre saneado del
  // equipo, así que el directorio de tareas se localiza igual.
  const tasksDir = getTasksDir(sanitizedName)
  try {
    await rm(tasksDir, { recursive: true, force: true })
    logForDebugging(`[TeammateTool] Cleaned up tasks directory: ${tasksDir}`)
    notifyTasksUpdated()
  } catch (error) {
    logForDebugging(
      `[TeammateTool] Failed to clean up tasks directory ${tasksDir}: ${errorMessage(error)}`,
    )
  }
}
