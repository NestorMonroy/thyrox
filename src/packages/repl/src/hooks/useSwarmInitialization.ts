/**
 * Swarm Initialization Hook
 *
 * Initializes swarm features: teammate hooks and context.
 * Handles both fresh spawns and resumed teammate sessions.
 *
 * This hook is conditionally loaded to allow dead code elimination when swarms are disabled.
 */

import { useEffect } from 'react'
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import type { AppState } from '../appStateHooks.js'
import type { Message } from '@thyrox/agent/messageShapes'
import { isAgentSwarmsEnabled } from '@thyrox/agent/agentSwarmsEnabled.js'
import { initializeTeammateContextFromSession } from '@thyrox/swarm'
import { readTeamFile } from '@thyrox/swarm'
import { initializeTeammateHooks } from '@thyrox/swarm'
import { getDynamicTeamContext } from '@thyrox/swarm/teammateState.js'

type SetAppState = (f: (prevState: AppState) => AppState) => void

/**
 * Hook that initializes swarm features when ENABLE_AGENT_SWARMS is true.
 *
 * Handles both:
 * - Resumed teammate sessions (from --resume or /resume) where teamName/agentName
 *   are stored in transcript messages
 * - Fresh spawns where context is read from environment variables
 */
export function useSwarmInitialization(
  setAppState: SetAppState,
  initialMessages: Message[] | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  useEffect(() => {
    if (!enabled) return
    if (isAgentSwarmsEnabled()) {
      // `initializeTeammateHooks` declara su propio tipo de estado
      // (`PermissionCarryingState`, no exportado por @thyrox/swarm) en vez
      // de indexar el `AppState` real del anfitrión. El adaptador traduce
      // entre los dos sin cambiar el valor: `prev` es el `AppState` real
      // (estructuralmente asignable a la forma más amplia que el updater
      // exige) y lo que el updater devuelve YA es ese mismo `AppState` en
      // tiempo de ejecución -- el propio módulo sólo hace `{...prev, ...}`.
      const setTeammateHooksState: (
        updater: (
          prev: Record<string, unknown> & { toolPermissionContext?: unknown },
        ) => Record<string, unknown> & { toolPermissionContext?: unknown },
      ) => void = updater => setAppState(prev => updater(prev) as AppState)

      // Check if this is a resumed agent session (from --resume or /resume)
      // Resumed sessions have teamName/agentName stored in transcript messages
      const firstMessage = initialMessages?.[0]
      const teamName =
        firstMessage && 'teamName' in firstMessage
          ? (firstMessage.teamName as string | undefined)
          : undefined
      const agentName =
        firstMessage && 'agentName' in firstMessage
          ? (firstMessage.agentName as string | undefined)
          : undefined

      if (teamName && agentName) {
        // Resumed agent session - set up team context from stored info
        initializeTeammateContextFromSession(setAppState, teamName, agentName)

        // Get agentId from team file for hook initialization
        const teamFile = readTeamFile(teamName)
        const member = teamFile?.members.find(
          (m: { name: string }) => m.name === agentName,
        )
        if (member) {
          initializeTeammateHooks(setTeammateHooksState, getSessionId(), {
            teamName,
            agentId: member.agentId,
            agentName,
          })
        }
      } else {
        // Fresh spawn or standalone session
        // teamContext is already computed in main.tsx via computeInitialTeamContext()
        // and included in initialState, so we only need to initialize hooks here
        const context = getDynamicTeamContext?.()
        if (context?.teamName && context?.agentId && context?.agentName) {
          initializeTeammateHooks(setTeammateHooksState, getSessionId(), {
            teamName: context.teamName,
            agentId: context.agentId,
            agentName: context.agentName,
          })
        }
      }
    }
  }, [setAppState, initialMessages, enabled])
}
