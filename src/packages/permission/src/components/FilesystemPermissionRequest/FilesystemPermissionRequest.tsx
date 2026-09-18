import React from 'react'
import { Box, Text, useTheme } from '@anthropic/ink'
import { FallbackPermissionRequest } from '../FallbackPermissionRequest.js'
import { FilePermissionDialog } from '../FilePermissionDialog/FilePermissionDialog.js'
import type { ToolInput } from '../FilePermissionDialog/useFilePermissionDialog.js'
import type {
  PermissionRequestProps,
  ToolUseConfirm,
} from '../permissionRequestTypes.js'

function pathFromToolUse(toolUseConfirm: ToolUseConfirm): string | null {
  const tool = toolUseConfirm.tool
  if ('getPath' in tool && typeof tool.getPath === 'function') {
    try {
      return tool.getPath(toolUseConfirm.input)
    } catch {
      return null
    }
  }
  return null
}

export function FilesystemPermissionRequest({
  toolUseConfirm,
  onDone,
  onReject,
  verbose,
  toolUseContext,
  workerBadge,
}: PermissionRequestProps): React.ReactNode {
  const [theme] = useTheme()
  const path = pathFromToolUse(toolUseConfirm)
  const userFacingName = toolUseConfirm.tool.userFacingName(
    toolUseConfirm.input as never,
  )

  const isReadOnly = toolUseConfirm.tool.isReadOnly(toolUseConfirm.input)
  const userFacingReadOrEdit = isReadOnly ? 'Read' : 'Edit'

  // Copia de `ccnmt: packages/permission/src/components/
  // FilesystemPermissionRequest/FilesystemPermissionRequest.tsx` con los
  // comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Se usa la forma singular simple: el detalle real de la operación se muestra
  // en el contenido.
  const title = `${userFacingReadOrEdit} file`

  // Parser de paso simple, porque no hace falta transformar el input.
  const parseInput = (input: unknown): ToolInput => input as ToolInput

  // Se cae de vuelta a la petición de permiso genérica si no se halla ruta.
  if (!path) {
    return (
      <FallbackPermissionRequest
        toolUseConfirm={toolUseConfirm}
        toolUseContext={toolUseContext}
        onDone={onDone}
        onReject={onReject}
        verbose={verbose}
        workerBadge={workerBadge}
      />
    )
  }

  // Renderiza el contenido del mensaje de uso de herramienta.
  const content = (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text>
        {userFacingName}(
        {toolUseConfirm.tool.renderToolUseMessage(
          toolUseConfirm.input as never,
          { theme, verbose },
        )}
        )
      </Text>
    </Box>
  )

  return (
    <FilePermissionDialog
      toolUseConfirm={toolUseConfirm}
      toolUseContext={toolUseContext}
      onDone={onDone}
      onReject={onReject}
      workerBadge={workerBadge}
      title={title}
      content={content}
      path={path}
      parseInput={parseInput}
      operationType={isReadOnly ? 'read' : 'write'}
      completionType="tool_use_single"
    />
  )
}
