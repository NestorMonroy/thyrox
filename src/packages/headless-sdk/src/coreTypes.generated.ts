/**
 * GENERADO por `bin/generateCoreTypes.ts` — no editar a mano.
 *
 * Cada tipo es `z.infer` de su schema en `coreSchemas.ts`; los que no
 * tienen schema vienen de `coreTypes.manual.ts`.
 */
import type { z } from 'zod/v4'
import type * as S from './coreSchemas.ts'

export * from './coreTypes.manual.ts'

export type AccountInfo = z.infer<ReturnType<typeof S.AccountInfoSchema>>
export type AgentDefinition = z.infer<ReturnType<typeof S.AgentDefinitionSchema>>
export type AgentInfo = z.infer<ReturnType<typeof S.AgentInfoSchema>>
export type AgentMcpServerSpec = z.infer<ReturnType<typeof S.AgentMcpServerSpecSchema>>
export type ApiKeySource = z.infer<ReturnType<typeof S.ApiKeySourceSchema>>
export type AsyncHookJSONOutput = z.infer<ReturnType<typeof S.AsyncHookJSONOutputSchema>>
export type ConfigChangeHookInput = z.infer<ReturnType<typeof S.ConfigChangeHookInputSchema>>
export type ConfigScope = z.infer<ReturnType<typeof S.ConfigScopeSchema>>
export type CwdChangedHookInput = z.infer<ReturnType<typeof S.CwdChangedHookInputSchema>>
export type ElicitationHookInput = z.infer<ReturnType<typeof S.ElicitationHookInputSchema>>
export type ElicitationResultHookInput = z.infer<ReturnType<typeof S.ElicitationResultHookInputSchema>>
export type FastModeState = z.infer<ReturnType<typeof S.FastModeStateSchema>>
export type FileChangedHookInput = z.infer<ReturnType<typeof S.FileChangedHookInputSchema>>
export type HookInput = z.infer<ReturnType<typeof S.HookInputSchema>>
export type HookJSONOutput = z.infer<ReturnType<typeof S.HookJSONOutputSchema>>
export type InstructionsLoadedHookInput = z.infer<ReturnType<typeof S.InstructionsLoadedHookInputSchema>>
export type McpClaudeAIProxyServerConfig = z.infer<ReturnType<typeof S.McpClaudeAIProxyServerConfigSchema>>
export type McpHttpServerConfig = z.infer<ReturnType<typeof S.McpHttpServerConfigSchema>>
export type McpSSEServerConfig = z.infer<ReturnType<typeof S.McpSSEServerConfigSchema>>
export type McpSdkServerConfig = z.infer<ReturnType<typeof S.McpSdkServerConfigSchema>>
export type McpServerConfigForProcessTransport = z.infer<ReturnType<typeof S.McpServerConfigForProcessTransportSchema>>
export type McpServerStatus = z.infer<ReturnType<typeof S.McpServerStatusSchema>>
export type McpServerStatusConfig = z.infer<ReturnType<typeof S.McpServerStatusConfigSchema>>
export type McpSetServersResult = z.infer<ReturnType<typeof S.McpSetServersResultSchema>>
export type McpStdioServerConfig = z.infer<ReturnType<typeof S.McpStdioServerConfigSchema>>
export type ModelInfo = z.infer<ReturnType<typeof S.ModelInfoSchema>>
export type ModelUsage = z.infer<ReturnType<typeof S.ModelUsageSchema>>
export type NotificationHookInput = z.infer<ReturnType<typeof S.NotificationHookInputSchema>>
export type OutputFormat = z.infer<ReturnType<typeof S.OutputFormatSchema>>
export type PermissionBehavior = z.infer<ReturnType<typeof S.PermissionBehaviorSchema>>
export type PermissionDecisionClassification = z.infer<ReturnType<typeof S.PermissionDecisionClassificationSchema>>
export type PermissionDeniedHookInput = z.infer<ReturnType<typeof S.PermissionDeniedHookInputSchema>>
export type PermissionMode = z.infer<ReturnType<typeof S.PermissionModeSchema>>
export type PermissionRequestHookInput = z.infer<ReturnType<typeof S.PermissionRequestHookInputSchema>>
export type PermissionResult = z.infer<ReturnType<typeof S.PermissionResultSchema>>
export type PermissionRuleValue = z.infer<ReturnType<typeof S.PermissionRuleValueSchema>>
export type PermissionUpdate = z.infer<ReturnType<typeof S.PermissionUpdateSchema>>
export type PermissionUpdateDestination = z.infer<ReturnType<typeof S.PermissionUpdateDestinationSchema>>
export type PostCompactHookInput = z.infer<ReturnType<typeof S.PostCompactHookInputSchema>>
export type PostToolUseFailureHookInput = z.infer<ReturnType<typeof S.PostToolUseFailureHookInputSchema>>
export type PostToolUseHookInput = z.infer<ReturnType<typeof S.PostToolUseHookInputSchema>>
export type PreCompactHookInput = z.infer<ReturnType<typeof S.PreCompactHookInputSchema>>
export type PreToolUseHookInput = z.infer<ReturnType<typeof S.PreToolUseHookInputSchema>>
export type PromptRequest = z.infer<ReturnType<typeof S.PromptRequestSchema>>
export type PromptRequestOption = z.infer<ReturnType<typeof S.PromptRequestOptionSchema>>
export type PromptResponse = z.infer<ReturnType<typeof S.PromptResponseSchema>>
export type RewindFilesResult = z.infer<ReturnType<typeof S.RewindFilesResultSchema>>
export type SDKAssistantMessage = z.infer<ReturnType<typeof S.SDKAssistantMessageSchema>>
export type SDKAssistantMessageError = z.infer<ReturnType<typeof S.SDKAssistantMessageErrorSchema>>
export type SDKCompactBoundaryMessage = z.infer<ReturnType<typeof S.SDKCompactBoundaryMessageSchema>>
export type SDKMessage = z.infer<ReturnType<typeof S.SDKMessageSchema>>
export type SDKPartialAssistantMessage = z.infer<ReturnType<typeof S.SDKPartialAssistantMessageSchema>>
export type SDKPermissionDenial = z.infer<ReturnType<typeof S.SDKPermissionDenialSchema>>
export type SDKRateLimitInfo = z.infer<ReturnType<typeof S.SDKRateLimitInfoSchema>>
export type SDKResultMessage = z.infer<ReturnType<typeof S.SDKResultMessageSchema>>
export type SDKResultSuccess = z.infer<ReturnType<typeof S.SDKResultSuccessSchema>>
export type SDKSessionInfo = z.infer<ReturnType<typeof S.SDKSessionInfoSchema>>
export type SDKStatus = z.infer<ReturnType<typeof S.SDKStatusSchema>>
export type SDKStatusMessage = z.infer<ReturnType<typeof S.SDKStatusMessageSchema>>
export type SDKSystemMessage = z.infer<ReturnType<typeof S.SDKSystemMessageSchema>>
export type SDKToolProgressMessage = z.infer<ReturnType<typeof S.SDKToolProgressMessageSchema>>
export type SDKUserMessage = z.infer<ReturnType<typeof S.SDKUserMessageSchema>>
export type SDKUserMessageReplay = z.infer<ReturnType<typeof S.SDKUserMessageReplaySchema>>
export type SdkBeta = z.infer<ReturnType<typeof S.SdkBetaSchema>>
export type SdkPluginConfig = z.infer<ReturnType<typeof S.SdkPluginConfigSchema>>
export type SessionEndHookInput = z.infer<ReturnType<typeof S.SessionEndHookInputSchema>>
export type SessionStartHookInput = z.infer<ReturnType<typeof S.SessionStartHookInputSchema>>
export type SettingSource = z.infer<ReturnType<typeof S.SettingSourceSchema>>
export type SetupHookInput = z.infer<ReturnType<typeof S.SetupHookInputSchema>>
export type SlashCommand = z.infer<ReturnType<typeof S.SlashCommandSchema>>
export type StopFailureHookInput = z.infer<ReturnType<typeof S.StopFailureHookInputSchema>>
export type StopHookInput = z.infer<ReturnType<typeof S.StopHookInputSchema>>
export type SubagentStartHookInput = z.infer<ReturnType<typeof S.SubagentStartHookInputSchema>>
export type SubagentStopHookInput = z.infer<ReturnType<typeof S.SubagentStopHookInputSchema>>
export type SyncHookJSONOutput = z.infer<ReturnType<typeof S.SyncHookJSONOutputSchema>>
export type TaskCompletedHookInput = z.infer<ReturnType<typeof S.TaskCompletedHookInputSchema>>
export type TaskCreatedHookInput = z.infer<ReturnType<typeof S.TaskCreatedHookInputSchema>>
export type TeammateIdleHookInput = z.infer<ReturnType<typeof S.TeammateIdleHookInputSchema>>
export type ThinkingConfig = z.infer<ReturnType<typeof S.ThinkingConfigSchema>>
export type UserPromptSubmitHookInput = z.infer<ReturnType<typeof S.UserPromptSubmitHookInputSchema>>
