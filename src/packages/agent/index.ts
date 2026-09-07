export type { AgentDefinition, CacheTtl, EffortValue, ModelAlias, PermissionMode } from './types.ts'
export { CACHE_TTLS, EFFORT_LEVELS, MODEL_ALIASES } from './types.ts'
export {
  AGENT_JSON_KEYS,
  AgentJsonSchema,
  ISOLATION_MODES,
  MEMORY_SCOPES,
  parseAgentJson,
} from './schema.ts'
export type { AgentJson, ParseResult } from './schema.ts'
export { NAME_MUST_NOT_CONTAIN_COLON, NAME_MUST_NOT_START_WITH_DASH, buildRegistry } from './registry.ts'
export type { AgentRegistry, BuildResult } from './registry.ts'
// Las definiciones viven con la herramienta que las despacha (tramo 3 de
// #224); se reexportan para que ningún consumidor cambie de punto.
export {
  agenticReasoning,
  agenticValidator,
  baCoordinator,
  bpaCoordinator,
  cpCoordinator,
  deepDive,
  deepReview,
  diagramaIshikawa,
  dmaicCoordinator,
  gateConsistencyEvaluator,
  incrementAcceptor,
  leanCoordinator,
  migrationPorter,
  packagingPorterHigh,
  packagingPorterLow,
  patternHarvester,
  pdcaCoordinator,
  pmCoordinator,
  ppsCoordinator,
  pruebaPalancas,
  retroFacilitator,
  rmCoordinator,
  rupCoordinator,
  skillGenerator,
  spCoordinator,
  taskExecutor,
  taskPlanner,
  taskSynthesizer,
  techDetector,
  thyroxCoordinator,
  workbenchInstrumenter,
  AGENTS,
} from '@thyrox/tools/definitions'
export { CATALOG, MODELS, MODEL_IDS, PRICING_TIERS, isModelId, isModelAlias, resolveModel, usageCostUsd, effortCostIndex } from './models.ts'
export type { ModelId, ModelRecord, PricingTier, EffortLevel, Usage } from './models.ts'
export { CACHE_BREAK_CAUSES, promptCacheKey, sharesPromptCache } from '@thyrox/provider/cost/cacheBreak'
export type { CacheBreakCause, CacheKeyFacet, CacheSharing, PromptCacheKey } from '@thyrox/provider/cost/cacheBreak'
export { TASK_KINDS, TASK_REQUIREMENTS, candidates, chooseCacheTtl, dispatchPlan, effortSwitchCost, recommend, switchCost, ttlBreakEvenExpiries } from '@thyrox/provider/cost/policy'
export type { Candidate, DispatchGroup, DispatchPlan, Exclusion, Recommendation, SwitchCost, TaskKind, TaskRequirement, TtlChoice, TurnProfile } from '@thyrox/provider/cost/policy'
export { DEFAULT_TTL_BY_SOURCE, ROUTE_KINDS, aliasesReaching, canAdvise, routesForOtherModel } from '@thyrox/provider/cost/cacheRoutes'
export type { Route, RouteKind, RouteRequest } from '@thyrox/provider/cost/cacheRoutes'
export { toMarkdown } from './emit/markdown.ts'
export { toAgentsJson } from './emit/agentsJson.ts'
// Reexportados para que `core/AgentCore.ts` y `core/AgentLoop.ts` — y sus
// tests — importen desde el mismo punto que la fuente (`ccnmt: packages/
// agent/index.ts`), en vez de reabrir cada archivo de tipos por separado.
export type { AgentDeps } from './agentDeps.ts'
export type { CoreTool, ToolResult } from './coreTools.ts'
