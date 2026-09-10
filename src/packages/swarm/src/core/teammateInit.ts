/**
 * Lo que un compañero enchufa al arrancar.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teammateInit.ts` (129 líneas,
 * 1 símbolo exportado). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * DOS COSAS, en este orden y no en el otro:
 *
 * 1. **Los permisos que el equipo concede a todos.** Se aplican ANTES del
 *    corte por liderazgo, porque son del EQUIPO y no del rol: el líder
 *    trabaja sobre las mismas rutas que sus compañeros.
 * 2. **El hook de parada que avisa al líder.** Sólo para quien NO es el
 *    líder: avisarse a sí mismo llenaría su propio buzón de mensajes que él
 *    mismo tendría que atender.
 *
 * Sin ese aviso, el líder no se entera de que un compañero terminó y lo
 * espera indefinidamente.
 *
 * DIVERGENCIA DECLARADA: la parte del estado que este módulo toca se declara
 * aquí (`PermissionCarryingState`) en vez de indexar el `AppState` del
 * anfitrión, que es `unknown` en el adaptador — es del anfitrión y no de este
 * paquete, así que indexarlo no tiene sentido de tipo.
 */
import {
  addFunctionHook,
  applyPermissionUpdate,
  getTeammateColor,
  jsonStringify,
  logForDebugging,
} from '../adapters/appRuntime.js'
import {
  createIdleNotification,
  getLastPeerDmSummary,
  writeToMailbox,
} from '../mailbox/index.js'
import { readTeamFile, setMemberActive } from './teamHelpers.js'

/** Lo único del estado del anfitrión que este módulo lee y escribe. */
type PermissionCarryingState = Record<string, unknown> & {
  toolPermissionContext?: unknown
}

/**
 * Registra lo que un compañero necesita al arrancar.
 *
 * Se llama temprano, en cuanto el estado de la aplicación está disponible.
 */
export function initializeTeammateHooks(
  setAppState: (
    updater: (prev: PermissionCarryingState) => PermissionCarryingState,
  ) => void,
  sessionId: string,
  teamInfo: { teamName: string; agentId: string; agentName: string },
): void {
  const { teamName, agentId, agentName } = teamInfo

  const teamFile = readTeamFile(teamName)
  if (!teamFile) {
    logForDebugging(`[TeammateInit] Team file not found for team: ${teamName}`)
    return
  }

  const leadAgentId = teamFile.leadAgentId

  if (teamFile.teamAllowedPaths && teamFile.teamAllowedPaths.length > 0) {
    logForDebugging(
      `[TeammateInit] Found ${teamFile.teamAllowedPaths.length} team-wide allowed path(s)`,
    )

    for (const allowedPath of teamFile.teamAllowedPaths) {
      // La barra de más es lo que distingue una ruta absoluta de una relativa
      // en el lenguaje de reglas. Sin ella, `/srv/datos` se leería como
      // relativa al directorio de trabajo de cada compañero — y ése no es el
      // mismo para todos.
      const ruleContent = allowedPath.path.startsWith('/')
        ? `/${allowedPath.path}/**`
        : `${allowedPath.path}/**`

      logForDebugging(
        `[TeammateInit] Applying team permission: ${allowedPath.toolName} allowed in ${allowedPath.path} (rule: ${ruleContent})`,
      )

      setAppState(prev => ({
        ...prev,
        toolPermissionContext: applyPermissionUpdate(
          prev.toolPermissionContext,
          {
            type: 'addRules',
            rules: [{ toolName: allowedPath.toolName, ruleContent }],
            behavior: 'allow',
            destination: 'session',
          },
        ),
      }))
    }
  }

  // El buzón se indexa por NOMBRE, no por identificador, así que hay que
  // traducirlo. Si el líder no está en el roster se cae al nombre reservado:
  // sin ese respaldo el aviso iría a un buzón llamado `undefined` y nadie lo
  // leería nunca.
  const leadMember = teamFile.members.find(m => m.agentId === leadAgentId)
  const leadAgentName = leadMember?.name || 'team-lead'

  if (agentId === leadAgentId) {
    logForDebugging(
      '[TeammateInit] This agent is the team leader - skipping idle notification hook',
    )
    return
  }

  logForDebugging(
    `[TeammateInit] Registering Stop hook for teammate ${agentName} to notify leader ${leadAgentName}`,
  )

  addFunctionHook(
    setAppState,
    sessionId,
    'Stop',
    // Sin matcher: el aviso vale para toda parada, no para una clase de ellas.
    '',
    async (messages: never[], _signal: unknown) => {
      // Marcar la ociosidad no se espera: si tarda, lo que importa es que el
      // aviso llegue.
      void setMemberActive(teamName, agentName, false)

      // La escritura SÍ se espera: el proceso está apagándose, y una escritura
      // en vuelo cuando el proceso muere es un aviso que nunca llegó.
      const notification = createIdleNotification(agentName, {
        idleReason: 'available',
        summary: getLastPeerDmSummary(messages),
      })
      await writeToMailbox(leadAgentName, {
        from: agentName,
        text: jsonStringify(notification),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      })
      logForDebugging(
        `[TeammateInit] Sent idle notification to leader ${leadAgentName}`,
      )
      // El aviso es cortesía hacia el líder, no una condición para apagarse:
      // devolver falso dejaría al compañero sin poder terminar.
      return true
    },
    'Failed to send idle notification to team leader',
    { timeout: 10000 },
  )
}
