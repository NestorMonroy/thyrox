import { feature } from 'bun:bundle'
import * as React from 'react'
import { EnterPlanModeTool } from '@thyrox/tool-registry/tools/EnterPlanModeTool/EnterPlanModeTool.js'
import { ExitPlanModeV2Tool } from '@thyrox/tool-registry/tools/ExitPlanModeTool/ExitPlanModeV2Tool.js'
import { useNotifyAfterTimeout } from '@thyrox/repl/hooks/useNotifyAfterTimeout.js'
import { useKeybinding } from '@anthropic/ink/keybindings'
import type { Tool } from '@thyrox/tool-registry/Tool.js'
import { AskUserQuestionTool } from '@thyrox/tool-registry/tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { BashTool } from '@thyrox/tool-registry/tools/BashTool/BashTool.js'
import { FileEditTool } from '@thyrox/tool-registry/tools/FileEditTool/FileEditTool.js'
import { FileReadTool } from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import { FileWriteTool } from '@thyrox/tool-registry/tools/FileWriteTool/FileWriteTool.js'
import { GlobTool } from '@thyrox/tool-registry/tools/GlobTool/GlobTool.js'
import { GrepTool } from '@thyrox/tool-registry/tools/GrepTool/GrepTool.js'
import { NotebookEditTool } from '@thyrox/tool-registry/tools/NotebookEditTool/NotebookEditTool.js'
import { PowerShellTool } from '@thyrox/tool-registry/tools/PowerShellTool/PowerShellTool.js'
import { SkillTool } from '@thyrox/tool-registry/tools/SkillTool/SkillTool.js'
import { WebFetchTool } from '@thyrox/tool-registry/tools/WebFetchTool/WebFetchTool.js'
import { AskUserQuestionPermissionRequest } from './AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.js'
import { BashPermissionRequest } from './BashPermissionRequest/BashPermissionRequest.js'
import { EnterPlanModePermissionRequest } from './EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.js'
import { ExitPlanModePermissionRequest } from './ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.js'
import { FallbackPermissionRequest } from './FallbackPermissionRequest.js'
import { FileEditPermissionRequest } from './FileEditPermissionRequest/FileEditPermissionRequest.js'
import { FilesystemPermissionRequest } from './FilesystemPermissionRequest/FilesystemPermissionRequest.js'
import { FileWritePermissionRequest } from './FileWritePermissionRequest/FileWritePermissionRequest.js'
import { NotebookEditPermissionRequest } from './NotebookEditPermissionRequest/NotebookEditPermissionRequest.js'
import { PowerShellPermissionRequest } from './PowerShellPermissionRequest/PowerShellPermissionRequest.js'
import { SkillPermissionRequest } from './SkillPermissionRequest/SkillPermissionRequest.js'
import { WebFetchPermissionRequest } from './WebFetchPermissionRequest/WebFetchPermissionRequest.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const ReviewArtifactTool = feature('REVIEW_ARTIFACT')
  ? (
      require('@thyrox/tool-registry/tools/ReviewArtifactTool/ReviewArtifactTool.js') as typeof import('@thyrox/tool-registry/tools/ReviewArtifactTool/ReviewArtifactTool.js')
    ).ReviewArtifactTool
  : null

const ReviewArtifactPermissionRequest = feature('REVIEW_ARTIFACT')
  ? (
      require('./ReviewArtifactPermissionRequest/ReviewArtifactPermissionRequest.js') as typeof import('./ReviewArtifactPermissionRequest/ReviewArtifactPermissionRequest.js')
    ).ReviewArtifactPermissionRequest
  : null

// Copia de `ccnmt: packages/permission/src/components/PermissionRequest.tsx`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// La herramienta Workflow se distribuye sin condición, por paridad con ant: el
// switch `case WorkflowTool:` compara identidad de objeto, así que esto TIENE
// que ser el objeto de herramienta real. Todavia no hay un componente de
// permiso dedicado a Workflow — el script y el conteo de agentes renderizan por
// el FallbackPermissionRequest genérico — así que no se importa el stub; ver
// permissionComponentForTool más abajo.
const WorkflowTool = (
  require('@thyrox/tool-registry/tools/WorkflowTool/WorkflowTool.js') as typeof import('@thyrox/tool-registry/tools/WorkflowTool/WorkflowTool.js')
).WorkflowTool

const MonitorTool = feature('MONITOR_TOOL')
  ? (
      require('@thyrox/tool-registry/tools/MonitorTool/MonitorTool.js') as typeof import('@thyrox/tool-registry/tools/MonitorTool/MonitorTool.js')
    ).MonitorTool
  : null

const MonitorPermissionRequest = feature('MONITOR_TOOL')
  ? (
      require('./MonitorPermissionRequest/MonitorPermissionRequest.js') as typeof import('./MonitorPermissionRequest/MonitorPermissionRequest.js')
    ).MonitorPermissionRequest
  : null

/* eslint-enable @typescript-eslint/no-require-imports */

function permissionComponentForTool(
  tool: Tool,
): React.ComponentType<PermissionRequestProps> {
  switch (tool) {
    case FileEditTool:
      return FileEditPermissionRequest
    case FileWriteTool:
      return FileWritePermissionRequest
    case BashTool:
      return BashPermissionRequest
    case PowerShellTool:
      return PowerShellPermissionRequest
    case ReviewArtifactTool:
      return ReviewArtifactPermissionRequest ?? FallbackPermissionRequest
    case WebFetchTool:
      return WebFetchPermissionRequest
    case NotebookEditTool:
      return NotebookEditPermissionRequest
    case ExitPlanModeV2Tool:
      return ExitPlanModePermissionRequest
    case EnterPlanModeTool:
      return EnterPlanModePermissionRequest
    case SkillTool:
      return SkillPermissionRequest
    case AskUserQuestionTool:
      return AskUserQuestionPermissionRequest
    case WorkflowTool:
      return FallbackPermissionRequest
    case MonitorTool:
      return MonitorPermissionRequest ?? FallbackPermissionRequest
    case GlobTool:
    case GrepTool:
    case FileReadTool:
      return FilesystemPermissionRequest
    default:
      return FallbackPermissionRequest
  }
}

export type {
  PermissionRequestProps,
  ToolUseConfirm,
} from './permissionRequestTypes.js'
import type {
  PermissionRequestProps,
  ToolUseConfirm,
} from './permissionRequestTypes.js'

function getNotificationMessage(toolUseConfirm: ToolUseConfirm): string {
  const toolName = toolUseConfirm.tool.userFacingName(
    toolUseConfirm.input as never,
  )

  if (toolUseConfirm.tool === ExitPlanModeV2Tool) {
    return 'Claude Code needs your approval for the plan'
  }

  if (toolUseConfirm.tool === EnterPlanModeTool) {
    return 'Claude Code wants to enter plan mode'
  }

  if (
    feature('REVIEW_ARTIFACT') &&
    toolUseConfirm.tool === ReviewArtifactTool
  ) {
    return 'Claude needs your approval for a review artifact'
  }

  if (!toolName || toolName.trim() === '') {
    return 'Claude Code needs your attention'
  }

  return `Claude needs your permission to use ${toolName}`
}

// TODO: mover esto a Tool.renderPermissionRequest.
export function PermissionRequest({
  toolUseConfirm,
  toolUseContext,
  onDone,
  onReject,
  verbose,
  workerBadge,
  setStickyFooter,
}: PermissionRequestProps): React.ReactNode {
  // Ctrl+C (app:interrupt) rechaza.
  useKeybinding(
    'app:interrupt',
    () => {
      onDone()
      onReject()
      toolUseConfirm.onReject()
    },
    { context: 'Confirmation' },
  )

  const notificationMessage = getNotificationMessage(toolUseConfirm)
  useNotifyAfterTimeout(notificationMessage, 'permission_prompt')

  const PermissionComponent = permissionComponentForTool(toolUseConfirm.tool)

  return (
    <PermissionComponent
      toolUseContext={toolUseContext}
      toolUseConfirm={toolUseConfirm}
      onDone={onDone}
      onReject={onReject}
      verbose={verbose}
      workerBadge={workerBadge}
      setStickyFooter={setStickyFooter}
    />
  )
}
