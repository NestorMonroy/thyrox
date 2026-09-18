// Copia de `ccnmt: packages/permission/src/components/
// permissionRequestTypes.ts` con los comentarios traducidos; el cuerpo es el
// de la fuente.
//
// Módulo de tipos hoja: aloja PermissionRequestProps y ToolUseConfirm. Se
// extrajo de PermissionRequest.tsx para que los componentes de permiso por
// herramienta (FilesystemPermissionRequest, BashPermissionRequest, ...) puedan
// importar estos tipos sin formar un ciclo con PermissionRequest.tsx, que los
// importa como componentes concretos.

import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type * as React from 'react'
import type { AnyObject, Tool, ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { AssistantMessage } from '@thyrox/agent/messageShapes'
import type { PermissionDecision } from '../PermissionResult.js'
import type { PermissionUpdate } from '../PermissionUpdateSchema.js'
import type { WorkerBadgeProps } from './WorkerBadge.js'
import type { z } from 'zod'

export type PermissionRequestProps<Input extends AnyObject = AnyObject> = {
  toolUseConfirm: ToolUseConfirm<Input>
  toolUseContext: ToolUseContext
  onDone(): void
  onReject(): void
  verbose: boolean
  workerBadge: WorkerBadgeProps | undefined
  /**
   * Registra el JSX que se renderiza en un footer fijo bajo el area
   * desplazable. Solo en modo de pantalla completa. Se llama con null para
   * limpiarlo.
   */
  setStickyFooter?: (jsx: React.ReactNode | null) => void
}

export type ToolUseConfirm<Input extends AnyObject = AnyObject> = {
  assistantMessage: AssistantMessage
  tool: Tool<Input>
  description: string
  input: z.infer<Input>
  toolUseContext: ToolUseContext
  toolUseID: string
  permissionResult: PermissionDecision
  permissionPromptStartTimeMs: number
  classifierCheckInProgress?: boolean
  classifierAutoApproved?: boolean
  classifierMatchedRule?: string
  workerBadge?: WorkerBadgeProps
  onUserInteraction(): void
  onAbort(): void
  onDismissCheckmark?(): void
  onAllow(
    updatedInput: z.infer<Input>,
    permissionUpdates: PermissionUpdate[],
    feedback?: string,
    contentBlocks?: ContentBlockParam[],
  ): void
  onReject(feedback?: string, contentBlocks?: ContentBlockParam[]): void
  recheckPermission(): Promise<void>
}
