export type {
  AssistantTurn, ContentBlock, LoopResult, LoopStop, Message, Provider, ProviderRequest,
  HarnessEvent, Role, StopReason, Tool, ToolContext, ToolResult, ToolSpec, Usage,
} from '@thyrox/agent/loop/types'
export { USAGE_CERO } from '@thyrox/agent/loop/types'
export { Transcript, readTranscript } from '@thyrox/agent/loop/transcript'
export { openSession, projectSlug } from '@thyrox/agent/loop/session'
export { runHooks, HARNESS_HOOK_EVENTS, type HarnessHookEvent, type HookConfig } from '@thyrox/agent/loop/hooks'
export { confinedTo, decide, evaluate, matchesRule, type Capability, type Decision, type Mode, type PermissionPolicy, type Verdict } from '@thyrox/permission'
export { CORE_TOOLS, registry, toolSpecs, bashTool, readTool, writeTool, editTool, globTool, grepTool } from '@thyrox/tools/registry'
export { RecordedProvider } from '@thyrox/provider/recorded'
export { AnthropicHttpProvider } from '@thyrox/provider/anthropicHttp'
export { runLoop, streamLoop, type LoopOptions } from '@thyrox/agent/loop'
export {
  assembleSystemPrompt, estimateTokens, matchesPath, parseRule,
  type AssembleOptions, type Assembled, type Section,
} from '@thyrox/agent/loop/context/systemPrompt'
export {
  CLEARED_MARKER, COMPACTABLE_TOOLS, collectCompactableToolIds, microcompact,
  type MicrocompactOptions, type MicrocompactResult,
} from '@thyrox/agent/loop/context/microcompact'
export {
  AUTOCOMPACT_BUFFER_TOKENS, MAX_OUTPUT_TOKENS_FOR_SUMMARY, autoCompactThreshold,
  compactMessages, effectiveContextWindow, estimateMessagesTokens, shouldAutoCompact,
  type CompactOptions, type CompactResult,
} from '@thyrox/agent/loop/context/autocompact'
export {
  forkSession, indexSessions, latestSession, planResume,
  type ForkedSession, type ResumePlan, type SessionRow,
} from '@thyrox/agent/loop/sessions'
export { Journal, readJournal, type JournalEntry } from '@thyrox/observability/journal'
export { costReport, turnCost, type CostReport, type TurnCost } from '@thyrox/observability/cost'
export { STORE_PATH, recordHarnessSession, reconcileStaleRunningRows, ensureUpdatedAtTrigger, type HarnessSessionRow, type StaleRow } from '@thyrox/observability/store'
export { openStore, probeStore, BUSY_TIMEOUT_MS, type StoreProbe } from '../../../store/db.ts'
export {
  TRANSCRIPT_MESSAGE_TYPES, transcriptShape, transcriptShapeOf, type TranscriptShape,
} from '@thyrox/observability/transcriptShape'
export { agentTool, DEFAULT_AGENT_DEFINITIONS, type AgentDefinition, type AgentToolOptions } from '@thyrox/tools/agent'
export { skillTool } from '@thyrox/tools/skill'
export { taskTools, type TaskToolOptions } from '@thyrox/tools/tasks'
// El vocabulario de estados es del subsistema de tareas, no de su
// superficie de herramienta: se reexporta desde donde se declara.
export { TASK_STATUSES, type TaskStatus } from '../../../task/schema.ts'
export {
  domainAllowed, webFetchTool, webSearchTool,
  type DomainPolicy, type SearchHit, type SearchProvider,
} from '@thyrox/tools/web'
export { switchModel, type SwitchOptions, type SwitchResult } from '@thyrox/agent/loop/sessions/modelSwitch'
export {
  classifyLastTurn, filterUnresolvedToolUses, resumableMessages,
  sessionEpoch, reconcileWorkingTree, readTranscriptLines, TERMINAL_TOOLS,
  verifyAdoption, readProcStart, isPidAlive, type Adoption,
  type LastTurn, type EpochInfo, type RepoRef, type TreeReport,
} from '@thyrox/agent/loop/session/reconcile'
export {
  TRIPLES, EXTRACTORS, ALIAS_SINONIMOS, binaryTriple, referenceTriple,
  resolveRoot, requireRoot, canonicalAlias, sameCorpus,
  declaredAlias, checkPortDeclaration,
  type Extractor, type ReferenceTriple, type PortProblem,
} from './reference/triple.ts'
export {
  OUTPUT_STYLES, renderEvent, renderStatusLine,
  type OutputStyle, type StatusLine,
} from '@thyrox/cli/render'
export { resumeChoices, type ResumeChoice } from '@thyrox/cli/resume'
export { agentDefinitionsFromRegistry, toHarnessDefinition } from '@thyrox/tools/agentDefinitions'
export {
  SkillRegistry, extractDirFor,
  type SkillContext, type SkillDefinition, type SkillRegistryOptions,
} from '@thyrox/skills/registry'
export { fromSkillDir, skillNameFromDir } from '@thyrox/skills/fromDir'
export { bundledSkillNames, bundledSkillDefs, registerBundledSkills } from '@thyrox/skills/bundled'
