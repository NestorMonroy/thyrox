import * as React from 'react'
import { BLACK_CIRCLE } from '@claude-code-how-works/output/constants/figures.js'
import { Box, Text } from '@anthropic/ink'
import { toInkColor } from '@claude-code-how-works/tool-registry/utils/inkColor.js'

export type WorkerBadgeProps = {
  name: string
  color: string
}

/**
 * Copia de `ccnmt: packages/permission/src/components/WorkerBadge.tsx` con los
 * comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Renderiza un badge de color con el nombre del worker para los prompts de
 * permiso. Sirve para indicar que worker del swarm esta pidiendo el permiso.
 */
export function WorkerBadge({
  name,
  color,
}: WorkerBadgeProps): React.ReactNode {
  const inkColor = toInkColor(color)
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={inkColor}>
        {BLACK_CIRCLE} <Text bold>@{name}</Text>
      </Text>
    </Box>
  )
}
