import * as React from 'react'
import { Box, Text } from '@anthropic/ink'
import {
  getAgentName,
  getTeammateColor,
  getTeamName,
} from '@thyrox/swarm/teammateState.js'
import { Spinner } from '@thyrox/repl/components/Spinner.js'
import { WorkerBadge } from './WorkerBadge.js'

type Props = {
  toolName: string
  description: string
}

/**
 * Copia de `ccnmt: packages/permission/src/components/WorkerPendingPermission.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Indicador visual que se muestra en los workers mientras esperan a que el
 * leader apruebe una petición de permiso. Muestra la herramienta pendiente con
 * un spinner y la información de lo que se está pidiendo.
 */
export function WorkerPendingPermission({
  toolName,
  description,
}: Props): React.ReactNode {
  const teamName = getTeamName()
  const agentName = getAgentName()
  const agentColor = getTeammateColor()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="warning"
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Spinner />
        <Text color="warning" bold>
          {' '}
          Waiting for team lead approval
        </Text>
      </Box>

      {agentName && agentColor && (
        <Box marginBottom={1}>
          <WorkerBadge name={agentName} color={agentColor} />
        </Box>
      )}

      <Box>
        <Text dimColor>Tool: </Text>
        <Text>{toolName}</Text>
      </Box>

      <Box>
        <Text dimColor>Action: </Text>
        <Text>{description}</Text>
      </Box>

      {teamName && (
        <Box marginTop={1}>
          <Text dimColor>
            Permission request sent to team {'"'}
            {teamName}
            {'"'} leader
          </Text>
        </Box>
      )}
    </Box>
  )
}
