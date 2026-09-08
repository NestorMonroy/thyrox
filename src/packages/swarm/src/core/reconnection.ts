/**
 * El contexto de equipo al arrancar: en un lanzamiento nuevo y al reanudar.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/reconnection.ts` (119 líneas,
 * 2 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * DOS CAMINOS DE ENTRADA, y por eso son dos funciones:
 *
 * - **Lanzamiento nuevo** — el equipo y el nombre llegan por la línea de
 *   comandos, y el contexto se calcula de forma SÍNCRONA antes del primer
 *   render. Calcularlo después obligaría a pintar una vez sin él y a
 *   corregirlo luego, que es la clase de parche que este cómputo elimina.
 * - **Reanudación** — el equipo y el nombre viven en el transcript. El
 *   identificador de agente NO: se recupera del roster, buscándolo por nombre.
 *
 * DIVERGENCIA DECLARADA: la forma del contexto de equipo se declara AQUÍ
 * (`TeamContext`) y no se indexa desde el estado del anfitrión. `AppState` es
 * `unknown` en el adaptador —es del anfitrión y no de este paquete—, así que
 * `AppState['teamContext']` no tiene sentido de tipo. Y la forma es de swarm:
 * el anfitrión sólo la transporta.
 */
import {
  getDynamicTeamContext,
  logError,
  logForDebugging,
} from '../adapters/appRuntime.js'
import { getTeamFilePath, readTeamFile } from './teamHelpers.js'

/** Lo que una sesión sabe del equipo al que pertenece. */
export type TeamContext = {
  teamName: string
  teamFilePath: string
  leadAgentId: string
  selfAgentId: string | undefined
  selfAgentName: string
  isLeader: boolean
  teammates: Record<string, unknown>
}

/**
 * Calcula el contexto inicial, o `undefined` si esta sesión no es de un equipo.
 *
 * No pertenecer a ningún equipo es el caso normal de una sesión cualquiera: se
 * registra como traza, no como error.
 */
export function computeInitialTeamContext(): TeamContext | undefined {
  const context = getDynamicTeamContext()

  if (!context?.teamName || !context?.agentName) {
    logForDebugging(
      '[Reconnection] computeInitialTeamContext: No teammate context set (not a teammate)',
    )
    return undefined
  }

  const { teamName, agentId, agentName } = context

  const teamFile = readTeamFile(teamName)
  if (!teamFile) {
    // Aquí SÍ es un defecto: nos dijeron que somos de un equipo cuyo archivo
    // no existe, así que o se borró o el nombre está mal.
    logError(
      new Error(
        `[computeInitialTeamContext] Could not read team file for ${teamName}`,
      ),
    )
    return undefined
  }

  // El líder es quien NO trae identificador de agente: los compañeros lo
  // reciben al ser lanzados, y a él no lo lanzó nadie.
  const isLeader = !agentId

  logForDebugging(
    `[Reconnection] Computed initial team context for ${isLeader ? 'leader' : `teammate ${agentName}`} in team ${teamName}`,
  )

  return {
    teamName,
    teamFilePath: getTeamFilePath(teamName),
    leadAgentId: teamFile.leadAgentId,
    selfAgentId: agentId,
    selfAgentName: agentName,
    isLeader,
    teammates: {},
  }
}

/**
 * Fija el contexto de equipo al reanudar una sesión de compañero.
 *
 * El identificador se busca en el ROSTER por nombre: el transcript guarda
 * equipo y nombre, que es lo que sobrevive a una reanudación.
 *
 * Que el compañero ya no esté en el roster no derriba la sesión: se fija el
 * contexto sin identificador. Lo quitaron del equipo, no del mundo, y sigue
 * necesitando saber de dónde venía.
 */
export function initializeTeammateContextFromSession(
  setAppState: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
  teamName: string,
  agentName: string,
): void {
  const teamFile = readTeamFile(teamName)
  if (!teamFile) {
    logError(
      new Error(
        `[initializeTeammateContextFromSession] Could not read team file for ${teamName} (agent: ${agentName})`,
      ),
    )
    return
  }

  const member = teamFile.members.find(m => m.name === agentName)
  if (!member) {
    logForDebugging(
      `[Reconnection] Member ${agentName} not found in team ${teamName} - may have been removed`,
    )
  }

  const teamContext: TeamContext = {
    teamName,
    teamFilePath: getTeamFilePath(teamName),
    leadAgentId: teamFile.leadAgentId,
    selfAgentId: member?.agentId,
    selfAgentName: agentName,
    isLeader: false,
    teammates: {},
  }

  setAppState(prev => ({ ...prev, teamContext }))

  logForDebugging(
    `[Reconnection] Initialized agent context from session for ${agentName} in team ${teamName}`,
  )
}
