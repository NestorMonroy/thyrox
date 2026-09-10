/**
 * Las definiciones de agente que la herramienta `Agent` despacha, y `AGENTS`,
 * la lista completa que los emisores recorren.
 *
 * Viven aquí y no en `@thyrox/agent` porque en la referencia las definiciones
 * de subagente son de la herramienta que las despacha —
 * `ccnmt: packages/tool-registry/src/tools/AgentTool/built-in/` y
 * `builtInAgents.ts` — y no del dominio `agent`, que sólo aporta el contrato
 * (`AgentDefinition`, en `@thyrox/agent/types`). Tarea #224, tramo 3.
 *
 * `@thyrox/agent` reexporta cada una y `AGENTS` para que sus consumidores
 * (los emisores, `bun run check`) no cambien de punto de importación.
 */
export { agenticReasoning } from './agenticReasoning.ts'
export { agenticValidator } from './agenticValidator.ts'
export { baCoordinator } from './baCoordinator.ts'
export { bpaCoordinator } from './bpaCoordinator.ts'
export { cpCoordinator } from './cpCoordinator.ts'
export { deepDive } from './deepDive.ts'
export { deepReview } from './deepReview.ts'
export { diagramaIshikawa } from './diagramaIshikawa.ts'
export { dmaicCoordinator } from './dmaicCoordinator.ts'
export { gateConsistencyEvaluator } from './gateConsistencyEvaluator.ts'
export { incrementAcceptor } from './incrementAcceptor.ts'
export { leanCoordinator } from './leanCoordinator.ts'
export { migrationPorter } from './migrationPorter.ts'
export { packagingPorterHigh } from './packagingPorterHigh.ts'
export { packagingPorterLow } from './packagingPorterLow.ts'
export { patternHarvester } from './patternHarvester.ts'
export { pdcaCoordinator } from './pdcaCoordinator.ts'
export { pmCoordinator } from './pmCoordinator.ts'
export { ppsCoordinator } from './ppsCoordinator.ts'
export { pruebaPalancas } from './pruebaPalancas.ts'
export { retroFacilitator } from './retroFacilitator.ts'
export { rmCoordinator } from './rmCoordinator.ts'
export { rupCoordinator } from './rupCoordinator.ts'
export { skillGenerator } from './skillGenerator.ts'
export { spCoordinator } from './spCoordinator.ts'
export { taskExecutor } from './taskExecutor.ts'
export { taskPlanner } from './taskPlanner.ts'
export { taskSynthesizer } from './taskSynthesizer.ts'
export { techDetector } from './techDetector.ts'
export { thyroxCoordinator } from './thyroxCoordinator.ts'
export { workbenchInstrumenter } from './workbenchInstrumenter.ts'

import { agenticReasoning } from './agenticReasoning.ts'
import { agenticValidator } from './agenticValidator.ts'
import { baCoordinator } from './baCoordinator.ts'
import { bpaCoordinator } from './bpaCoordinator.ts'
import { cpCoordinator } from './cpCoordinator.ts'
import { deepDive } from './deepDive.ts'
import { deepReview } from './deepReview.ts'
import { diagramaIshikawa } from './diagramaIshikawa.ts'
import { dmaicCoordinator } from './dmaicCoordinator.ts'
import { gateConsistencyEvaluator } from './gateConsistencyEvaluator.ts'
import { incrementAcceptor } from './incrementAcceptor.ts'
import { leanCoordinator } from './leanCoordinator.ts'
import { migrationPorter } from './migrationPorter.ts'
import { packagingPorterHigh } from './packagingPorterHigh.ts'
import { packagingPorterLow } from './packagingPorterLow.ts'
import { patternHarvester } from './patternHarvester.ts'
import { pdcaCoordinator } from './pdcaCoordinator.ts'
import { pmCoordinator } from './pmCoordinator.ts'
import { ppsCoordinator } from './ppsCoordinator.ts'
import { pruebaPalancas } from './pruebaPalancas.ts'
import { retroFacilitator } from './retroFacilitator.ts'
import { rmCoordinator } from './rmCoordinator.ts'
import { rupCoordinator } from './rupCoordinator.ts'
import { skillGenerator } from './skillGenerator.ts'
import { spCoordinator } from './spCoordinator.ts'
import { taskExecutor } from './taskExecutor.ts'
import { taskPlanner } from './taskPlanner.ts'
import { taskSynthesizer } from './taskSynthesizer.ts'
import { techDetector } from './techDetector.ts'
import { thyroxCoordinator } from './thyroxCoordinator.ts'
import { workbenchInstrumenter } from './workbenchInstrumenter.ts'
import type { AgentDefinition } from '@thyrox/agent/types'

/** Todos los agentes definidos en el árbol, en el orden en que se emiten. */
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
