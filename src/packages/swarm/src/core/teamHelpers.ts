/**
 * Helpers de equipo — porte PARCIAL DECLARADO de
 * `ccnmt: packages/swarm/src/core/teamHelpers.ts` (735 líneas en la
 * fuente, 21 símbolos exportados).
 *
 * Se portan los DOS únicos símbolos puros del archivo —
 * `sanitizeName`/`sanitizeAgentName` (sin dependencia externa, tests
 * `__tests__/teamSanitizers.test.ts` +
 * `core/__tests__/sanitizeNames.test.ts`)— más el CONTRATO DE TIPOS del
 * archivo de equipo (`TeamFile`, `TeamAllowedPath`, `SpawnTeamOutput`,
 * `CleanupOutput`, `Input`, `Output`, `inputSchema`), que no tiene
 * dependencia de E/S — sólo describe la forma del `config.json` por
 * equipo.
 *
 * BLOQUEADOS, con su razón — los 15 restantes exigen, todos, alguno de
 * estos tres primitivos ausentes en este árbol (medido: ningún paquete
 * de `src/packages/` los expone):
 *
 *   - `getTeamsDir()` / `getSessionCreatedTeams()` / `getTasksDir()` /
 *     `notifyTasksUpdated()` — bindings de host de
 *     `adapters/appRuntime.ts` sin equivalente aquí (dónde vive el
 *     directorio de equipos y el registro de equipos creados esta
 *     sesión son decisiones del host, no de este paquete).
 *   - `lock()` (con `TEAM_FILE_LOCK_OPTIONS`) — la fuente lo enruta por
 *     appRuntime hacia `proper-lockfile` (SÍ está disponible como
 *     dependencia real, medido en `storage/package.json`, pero
 *     `updateTeamFileAsync` es el único punto de entrada de escritura y
 *     está bloqueado por las dos razones de arriba también).
 *   - `execFileNoThrowWithCwd()` / `gitExe()` — usados por
 *     `destroyWorktree` (invocación de `git worktree remove`). Medido
 *     (`api: storage/git.ts`, que declara la MISMA ausencia para su
 *     propio `gitExe`): `execFileNoThrow` no existe en NINGÚN paquete de
 *     `src/packages/` todavía — es un primitivo de `shell` pendiente de
 *     portar, no un defecto de este archivo.
 *
 * Símbolos bloqueados, nombrados: `getTeamDir`, `getTeamFilePath`,
 * `readTeamFile`, `readTeamFileAsync`, `writeTeamFileAsync`,
 * `updateTeamFileAsync`, `removeTeammateFromTeamFile`, `addHiddenPaneId`,
 * `removeHiddenPaneId`, `removeMemberFromTeam`, `removeMemberByAgentId`,
 * `setMemberMode`, `syncTeammateMode`, `setMultipleMemberModes`,
 * `setMemberActive`, `registerTeamForSessionCleanup`,
 * `unregisterTeamForSessionCleanup`, `cleanupSessionTeams`,
 * `cleanupTeamDirectories`, `destroyWorktree` (privado),
 * `killOrphanedTeammatePanes` (privado) — 21 en total con los 2
 * portados, coincide con la cuenta de la fuente.
 *
 * `teamDiscovery.ts` (que consume `readTeamFile`) queda BLOQUEADO en
 * cascada por esta misma razón — ver su propio hallazgo.
 *
 * NOTA DE SOLAPE (para el hallazgo de la iniciativa): `TeamFile` es un
 * archivo JSON por equipo con lista de miembros y estado — un mecanismo
 * de coordinación compartida de forma similar, en espíritu, al ledger de
 * `src/coordination/ledger.ts` y a la vivacidad de trabajos de
 * `src/roster/`. NO son el mismo mecanismo: el ledger reserva rutas de
 * archivo entre agentes de UNA tanda (formato JSONL append-only, se
 * fusiona por git); `TeamFile` es el ROSTER de una sesión de swarm
 * (quién es miembro, su pane, su modo de permiso), reemplazado
 * completo en cada escritura. Ninguno de los dos sustituye al otro; se
 * declara la existencia de ambos para que una futura decisión de diseño
 * no los redescubra por separado.
 */

import { z } from 'zod/v4'

import type { BackendType } from '../backends/types.js'
import { lazySchema } from '../internal/lazySchema.js'

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
