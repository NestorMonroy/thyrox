#!/usr/bin/env bun
/**
 * Genera `src/coreTypes.generated.ts` a partir de los schemas Zod de
 * `src/coreSchemas.ts`: cada tipo es `z.infer` de su schema. Es lo que el
 * propio archivo generado dice ser («en el build completo, esto se genera
 * automáticamente a partir de los schemas Zod»), y lo que el stub que
 * reemplaza no hacía: sus formas escritas a mano divergían de los schemas
 * (p. ej. `SDKUserMessageReplay` era un alias de `SDKUserMessage`, sin
 * `isReplay` ni `session_id`).
 *
 *   bun bin/generateCoreTypes.ts           escribe el archivo
 *   bun bin/generateCoreTypes.ts --check   exit 1 si el archivo difiere
 *
 * `SURFACE` es la superficie pública que el archivo exportaba: un schema
 * que existe y no estaba exportado no se exporta por la puerta de atrás.
 * Los tres tipos sin schema viven en `src/coreTypes.manual.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SURFACE = [
  'AccountInfo',
  'AgentDefinition',
  'AgentInfo',
  'AgentMcpServerSpec',
  'ApiKeySource',
  'AsyncHookJSONOutput',
  'ConfigChangeHookInput',
  'ConfigScope',
  'CwdChangedHookInput',
  'ElicitationHookInput',
  'ElicitationResultHookInput',
  'FastModeState',
  'FileChangedHookInput',
  'HookInput',
  'HookJSONOutput',
  'InstructionsLoadedHookInput',
  'McpClaudeAIProxyServerConfig',
  'McpHttpServerConfig',
  'McpSSEServerConfig',
  'McpSdkServerConfig',
  'McpServerConfigForProcessTransport',
  'McpServerStatus',
  'McpServerStatusConfig',
  'McpSetServersResult',
  'McpStdioServerConfig',
  'ModelInfo',
  'ModelUsage',
  'NotificationHookInput',
  'OutputFormat',
  'PermissionBehavior',
  'PermissionDecisionClassification',
  'PermissionDeniedHookInput',
  'PermissionMode',
  'PermissionRequestHookInput',
  'PermissionResult',
  'PermissionRuleValue',
  'PermissionUpdate',
  'PermissionUpdateDestination',
  'PostCompactHookInput',
  'PostToolUseFailureHookInput',
  'PostToolUseHookInput',
  'PreCompactHookInput',
  'PreToolUseHookInput',
  'PromptRequest',
  'PromptRequestOption',
  'PromptResponse',
  'RewindFilesResult',
  'SDKAssistantMessage',
  'SDKAssistantMessageError',
  'SDKCompactBoundaryMessage',
  'SDKMessage',
  'SDKPartialAssistantMessage',
  'SDKPermissionDenial',
  'SDKRateLimitInfo',
  'SDKResultMessage',
  'SDKResultSuccess',
  'SDKSessionInfo',
  'SDKStatus',
  'SDKStatusMessage',
  'SDKSystemMessage',
  'SDKToolProgressMessage',
  'SDKUserMessage',
  'SDKUserMessageReplay',
  'SdkBeta',
  'SdkPluginConfig',
  'SessionEndHookInput',
  'SessionStartHookInput',
  'SettingSource',
  'SetupHookInput',
  'SlashCommand',
  'StopFailureHookInput',
  'StopHookInput',
  'SubagentStartHookInput',
  'SubagentStopHookInput',
  'SyncHookJSONOutput',
  'TaskCompletedHookInput',
  'TaskCreatedHookInput',
  'TeammateIdleHookInput',
  'ThinkingConfig',
  'UserPromptSubmitHookInput',
] as const

const ROOT = join(import.meta.dir, '..', 'src')

export function render(schemasSource: string): string {
  const declared = new Set([...schemasSource.matchAll(/^export const ([A-Za-z0-9]+)Schema\b/gm)].map(m => m[1]))
  const missing = SURFACE.filter(name => !declared.has(name))
  if (missing.length > 0) throw new Error(`coreSchemas.ts no declara el schema de: ${missing.join(', ')}`)
  const lines = [
    '/**',
    ' * GENERADO por `bin/generateCoreTypes.ts` — no editar a mano.',
    ' *',
    ' * Cada tipo es `z.infer` de su schema en `coreSchemas.ts`; los que no',
    ' * tienen schema vienen de `coreTypes.manual.ts`.',
    ' */',
    "import type { z } from 'zod/v4'",
    "import type * as S from './coreSchemas.ts'",
    '',
    "export * from './coreTypes.manual.ts'",
    '',
    ...SURFACE.map(name => `export type ${name} = z.infer<ReturnType<typeof S.${name}Schema>>`),
    '',
  ]
  return lines.join('\n')
}

if (import.meta.main) {
  const target = join(ROOT, 'coreTypes.generated.ts')
  const output = render(readFileSync(join(ROOT, 'coreSchemas.ts'), 'utf8'))
  if (process.argv.includes('--check')) {
    const current = readFileSync(target, 'utf8')
    if (current !== output) {
      console.error('coreTypes.generated.ts difiere de lo que genera coreSchemas.ts; corre bun bin/generateCoreTypes.ts')
      process.exit(1)
    }
    console.log(`coreTypes.generated.ts al día (${SURFACE.length} tipos)`)
  } else {
    writeFileSync(target, output)
    console.log(`escrito coreTypes.generated.ts (${SURFACE.length} tipos)`)
  }
}
