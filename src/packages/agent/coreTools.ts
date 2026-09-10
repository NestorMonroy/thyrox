/**
 * Porte de `ccnmt: packages/agent/types/tools.ts` — el contrato de una
 * herramienta ejecutable por el bucle (`CoreTool`), su resultado
 * (`ToolResult`) y el veredicto de permiso que decide si se ejecuta.
 *
 * DIVERGENCIA declarada: la fuente importa `type { z } from 'zod/v4'` pero
 * no lo usa en ningún tipo del archivo (import muerto). No se porta —
 * evita una dependencia que el cuerpo del archivo nunca ejercita.
 */
import type { CoreContentBlock } from './coreMessages.ts'

export type ToolInputJSONSchema = {
  type: 'object'
  properties?: { [key: string]: unknown }
  [key: string]: unknown
}

export interface CoreTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: ToolInputJSONSchema
  readonly userFacingName?: string
  readonly isLocal?: boolean
  readonly isMcp?: boolean
}

export type ToolResult = {
  output: string | CoreContentBlock[]
  error?: boolean
  metadata?: {
    durationMs?: number
    [key: string]: unknown
  }
}

export interface ToolExecContext {
  abortSignal: AbortSignal
  toolUseId: string
  [key: string]: unknown
}

export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string }

export interface PermissionContext {
  mode: string
  input: unknown
  [key: string]: unknown
}
