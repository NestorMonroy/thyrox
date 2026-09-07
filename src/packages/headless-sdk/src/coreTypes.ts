/**
 * Puerto de `ccnmt: packages/headless-sdk/src/coreTypes.ts` (verbatim).
 *
 * Tipos SDK comunes serializables, usados tanto por consumidores como por
 * constructores del SDK.
 *
 * Los tipos se generan a partir de los schemas Zod en `coreSchemas.ts`.
 * Para modificar tipos:
 * 1. Editar los schemas Zod en `coreSchemas.ts`.
 * 2. Regenerar (en la fuente: `bun scripts/generate-sdk-types.ts`; este
 *    puerto no trae ese script — ver la sección de bloqueos declarados).
 *
 * Los schemas están disponibles en `coreSchemas.ts` para validación en
 * runtime, pero no son parte de la API pública.
 */

// Reexporta los tipos de sandbox para consumidores del SDK
export type {
  SandboxFilesystemConfig,
  SandboxIgnoreViolations,
  SandboxNetworkConfig,
  SandboxSettings,
} from './sandboxTypes.ts'
// Reexporta todos los tipos generados
export * from './coreTypes.generated.ts'

// Reexporta tipos utilitarios que no se pueden expresar como schemas Zod
export type { NonNullableUsage } from './sdkUtilityTypes.ts'

// Arreglos const para uso en runtime
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Notification',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'PermissionRequest',
  'PermissionDenied',
  'Setup',
  'TeammateIdle',
  'TaskCreated',
  'TaskCompleted',
  'Elicitation',
  'ElicitationResult',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'InstructionsLoaded',
  'CwdChanged',
  'FileChanged',
] as const

export const EXIT_REASONS = [
  'clear',
  'resume',
  'logout',
  'prompt_input_exit',
  'other',
  'bypass_permissions_disabled',
] as const
