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
export { agenticReasoning } from './definitions/agenticReasoning.ts'
export { agenticValidator } from './definitions/agenticValidator.ts'
export { baCoordinator } from './definitions/baCoordinator.ts'
export { bpaCoordinator } from './definitions/bpaCoordinator.ts'
export { cpCoordinator } from './definitions/cpCoordinator.ts'
export { deepDive } from './definitions/deepDive.ts'
export { deepReview } from './definitions/deepReview.ts'
export { diagramaIshikawa } from './definitions/diagramaIshikawa.ts'
export { dmaicCoordinator } from './definitions/dmaicCoordinator.ts'
export { gateConsistencyEvaluator } from './definitions/gateConsistencyEvaluator.ts'
export { incrementAcceptor } from './definitions/incrementAcceptor.ts'
export { leanCoordinator } from './definitions/leanCoordinator.ts'
export { migrationPorter } from './definitions/migrationPorter.ts'
export { packagingPorterHigh } from './definitions/packagingPorterHigh.ts'
export { packagingPorterLow } from './definitions/packagingPorterLow.ts'
export { patternHarvester } from './definitions/patternHarvester.ts'
export { pdcaCoordinator } from './definitions/pdcaCoordinator.ts'
export { pmCoordinator } from './definitions/pmCoordinator.ts'
export { ppsCoordinator } from './definitions/ppsCoordinator.ts'
export { pruebaPalancas } from './definitions/pruebaPalancas.ts'
export { retroFacilitator } from './definitions/retroFacilitator.ts'
export { rmCoordinator } from './definitions/rmCoordinator.ts'
export { rupCoordinator } from './definitions/rupCoordinator.ts'
export { skillGenerator } from './definitions/skillGenerator.ts'
export { spCoordinator } from './definitions/spCoordinator.ts'
export { taskExecutor } from './definitions/taskExecutor.ts'
export { taskPlanner } from './definitions/taskPlanner.ts'
export { taskSynthesizer } from './definitions/taskSynthesizer.ts'
export { techDetector } from './definitions/techDetector.ts'
export { thyroxCoordinator } from './definitions/thyroxCoordinator.ts'
export { workbenchInstrumenter } from './definitions/workbenchInstrumenter.ts'
export { CATALOG, MODELS, MODEL_IDS, PRICING_TIERS, isModelId, isModelAlias, resolveModel, usageCostUsd, effortCostIndex } from './models.ts'
export type { ModelId, ModelRecord, PricingTier, EffortLevel, Usage } from './models.ts'
export { CACHE_BREAK_CAUSES, promptCacheKey, sharesPromptCache } from './cost/cacheBreak.ts'
export type { CacheBreakCause, CacheKeyFacet, CacheSharing, PromptCacheKey } from './cost/cacheBreak.ts'
export { TASK_KINDS, TASK_REQUIREMENTS, candidates, chooseCacheTtl, dispatchPlan, effortSwitchCost, recommend, switchCost, ttlBreakEvenExpiries } from './cost/policy.ts'
export type { Candidate, DispatchGroup, DispatchPlan, Exclusion, Recommendation, SwitchCost, TaskKind, TaskRequirement, TtlChoice, TurnProfile } from './cost/policy.ts'
export { DEFAULT_TTL_BY_SOURCE, ROUTE_KINDS, aliasesReaching, canAdvise, routesForOtherModel } from './cost/cacheRoutes.ts'
export type { Route, RouteKind, RouteRequest } from './cost/cacheRoutes.ts'
export { toMarkdown } from './emit/markdown.ts'
export { toAgentsJson } from './emit/agentsJson.ts'

import { agenticReasoning } from './definitions/agenticReasoning.ts'
import { agenticValidator } from './definitions/agenticValidator.ts'
import { baCoordinator } from './definitions/baCoordinator.ts'
import { bpaCoordinator } from './definitions/bpaCoordinator.ts'
import { cpCoordinator } from './definitions/cpCoordinator.ts'
import { deepDive } from './definitions/deepDive.ts'
import { deepReview } from './definitions/deepReview.ts'
import { diagramaIshikawa } from './definitions/diagramaIshikawa.ts'
import { dmaicCoordinator } from './definitions/dmaicCoordinator.ts'
import { gateConsistencyEvaluator } from './definitions/gateConsistencyEvaluator.ts'
import { incrementAcceptor } from './definitions/incrementAcceptor.ts'
import { leanCoordinator } from './definitions/leanCoordinator.ts'
import { migrationPorter } from './definitions/migrationPorter.ts'
import { packagingPorterHigh } from './definitions/packagingPorterHigh.ts'
import { packagingPorterLow } from './definitions/packagingPorterLow.ts'
import { patternHarvester } from './definitions/patternHarvester.ts'
import { pdcaCoordinator } from './definitions/pdcaCoordinator.ts'
import { pmCoordinator } from './definitions/pmCoordinator.ts'
import { ppsCoordinator } from './definitions/ppsCoordinator.ts'
import { pruebaPalancas } from './definitions/pruebaPalancas.ts'
import { retroFacilitator } from './definitions/retroFacilitator.ts'
import { rmCoordinator } from './definitions/rmCoordinator.ts'
import { rupCoordinator } from './definitions/rupCoordinator.ts'
import { skillGenerator } from './definitions/skillGenerator.ts'
import { spCoordinator } from './definitions/spCoordinator.ts'
import { taskExecutor } from './definitions/taskExecutor.ts'
import { taskPlanner } from './definitions/taskPlanner.ts'
import { taskSynthesizer } from './definitions/taskSynthesizer.ts'
import { techDetector } from './definitions/techDetector.ts'
import { thyroxCoordinator } from './definitions/thyroxCoordinator.ts'
import { workbenchInstrumenter } from './definitions/workbenchInstrumenter.ts'
import type { AgentDefinition } from './types.ts'

/** Todos los agentes que este paquete define. */
export const AGENTS: AgentDefinition[] = [
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
]
