/**
 * Todos los skills de las trece metodologías (ba, bpa, cp, dmaic, kanban,
 * lean, pdca, pm, pps, rm, rup, scrum, sp) que este árbol define. Los
 * `.md` bajo `.claude/skills/` son el artefacto DERIVADO — la fuente es
 * cada archivo de `definitions/`, importado y adaptado de su `SKILL.md`
 * original con `bin/import.ts`.
 *
 * Este archivo se REGENERA — no se edita una importación a mano aquí; se
 * añade el `import`/entrada al re-ejecutar `bin/import.ts` sobre el
 * skill nuevo y añadiendo su nombre a esta lista.
 */
export type { EffortValue, SkillDefinition, SkillMetadata } from './types.ts'
export { EFFORT_LEVELS } from './types.ts'
export { toMarkdown } from './emit/markdown.ts'
export { skillArtifacts, skillsDir } from './paths.ts'

export { baElicitation } from './definitions/baElicitation.ts'
export { baPlanning } from './definitions/baPlanning.ts'
export { baRequirementsAnalysis } from './definitions/baRequirementsAnalysis.ts'
export { baRequirementsLifecycle } from './definitions/baRequirementsLifecycle.ts'
export { baSolutionEvaluation } from './definitions/baSolutionEvaluation.ts'
export { baStrategy } from './definitions/baStrategy.ts'
export { bpaAnalyze } from './definitions/bpaAnalyze.ts'
export { bpaDesign } from './definitions/bpaDesign.ts'
export { bpaIdentify } from './definitions/bpaIdentify.ts'
export { bpaImplement } from './definitions/bpaImplement.ts'
export { bpaMap } from './definitions/bpaMap.ts'
export { bpaMonitor } from './definitions/bpaMonitor.ts'
export { cpDiagnosis } from './definitions/cpDiagnosis.ts'
export { cpEvaluate } from './definitions/cpEvaluate.ts'
export { cpImplement } from './definitions/cpImplement.ts'
export { cpInitiation } from './definitions/cpInitiation.ts'
export { cpPlan } from './definitions/cpPlan.ts'
export { cpRecommend } from './definitions/cpRecommend.ts'
export { cpStructure } from './definitions/cpStructure.ts'
export { dmaicAnalyze } from './definitions/dmaicAnalyze.ts'
export { dmaicControl } from './definitions/dmaicControl.ts'
export { dmaicDefine } from './definitions/dmaicDefine.ts'
export { dmaicImprove } from './definitions/dmaicImprove.ts'
export { dmaicMeasure } from './definitions/dmaicMeasure.ts'
export { kanbanBoardSetup } from './definitions/kanbanBoardSetup.ts'
export { kanbanFlowMetrics } from './definitions/kanbanFlowMetrics.ts'
export { kanbanQueueManagement } from './definitions/kanbanQueueManagement.ts'
export { kanbanWipLimits } from './definitions/kanbanWipLimits.ts'
export { leanAnalyze } from './definitions/leanAnalyze.ts'
export { leanControl } from './definitions/leanControl.ts'
export { leanDefine } from './definitions/leanDefine.ts'
export { leanImprove } from './definitions/leanImprove.ts'
export { leanMeasure } from './definitions/leanMeasure.ts'
export { pdcaAct } from './definitions/pdcaAct.ts'
export { pdcaCheck } from './definitions/pdcaCheck.ts'
export { pdcaDo } from './definitions/pdcaDo.ts'
export { pdcaPlan } from './definitions/pdcaPlan.ts'
export { pmClosing } from './definitions/pmClosing.ts'
export { pmExecuting } from './definitions/pmExecuting.ts'
export { pmInitiating } from './definitions/pmInitiating.ts'
export { pmMonitoring } from './definitions/pmMonitoring.ts'
export { pmPlanning } from './definitions/pmPlanning.ts'
export { ppsAnalyze } from './definitions/ppsAnalyze.ts'
export { ppsClarify } from './definitions/ppsClarify.ts'
export { ppsCountermeasures } from './definitions/ppsCountermeasures.ts'
export { ppsEvaluate } from './definitions/ppsEvaluate.ts'
export { ppsImplement } from './definitions/ppsImplement.ts'
export { ppsTarget } from './definitions/ppsTarget.ts'
export { rmAnalysis } from './definitions/rmAnalysis.ts'
export { rmElicitation } from './definitions/rmElicitation.ts'
export { rmManagement } from './definitions/rmManagement.ts'
export { rmSpecification } from './definitions/rmSpecification.ts'
export { rmValidation } from './definitions/rmValidation.ts'
export { rupConstruction } from './definitions/rupConstruction.ts'
export { rupElaboration } from './definitions/rupElaboration.ts'
export { rupInception } from './definitions/rupInception.ts'
export { rupTransition } from './definitions/rupTransition.ts'
export { scrumBacklogRefinement } from './definitions/scrumBacklogRefinement.ts'
export { scrumDailyStandup } from './definitions/scrumDailyStandup.ts'
export { scrumDefinitionOfDone } from './definitions/scrumDefinitionOfDone.ts'
export { scrumRetrospective } from './definitions/scrumRetrospective.ts'
export { scrumSprintPlanning } from './definitions/scrumSprintPlanning.ts'
export { scrumSprintReview } from './definitions/scrumSprintReview.ts'
export { spAdjust } from './definitions/spAdjust.ts'
export { spAnalysis } from './definitions/spAnalysis.ts'
export { spContext } from './definitions/spContext.ts'
export { spExecute } from './definitions/spExecute.ts'
export { spFormulate } from './definitions/spFormulate.ts'
export { spGaps } from './definitions/spGaps.ts'
export { spMonitor } from './definitions/spMonitor.ts'
export { spPlan } from './definitions/spPlan.ts'

import { baElicitation } from './definitions/baElicitation.ts'
import { baPlanning } from './definitions/baPlanning.ts'
import { baRequirementsAnalysis } from './definitions/baRequirementsAnalysis.ts'
import { baRequirementsLifecycle } from './definitions/baRequirementsLifecycle.ts'
import { baSolutionEvaluation } from './definitions/baSolutionEvaluation.ts'
import { baStrategy } from './definitions/baStrategy.ts'
import { bpaAnalyze } from './definitions/bpaAnalyze.ts'
import { bpaDesign } from './definitions/bpaDesign.ts'
import { bpaIdentify } from './definitions/bpaIdentify.ts'
import { bpaImplement } from './definitions/bpaImplement.ts'
import { bpaMap } from './definitions/bpaMap.ts'
import { bpaMonitor } from './definitions/bpaMonitor.ts'
import { cpDiagnosis } from './definitions/cpDiagnosis.ts'
import { cpEvaluate } from './definitions/cpEvaluate.ts'
import { cpImplement } from './definitions/cpImplement.ts'
import { cpInitiation } from './definitions/cpInitiation.ts'
import { cpPlan } from './definitions/cpPlan.ts'
import { cpRecommend } from './definitions/cpRecommend.ts'
import { cpStructure } from './definitions/cpStructure.ts'
import { dmaicAnalyze } from './definitions/dmaicAnalyze.ts'
import { dmaicControl } from './definitions/dmaicControl.ts'
import { dmaicDefine } from './definitions/dmaicDefine.ts'
import { dmaicImprove } from './definitions/dmaicImprove.ts'
import { dmaicMeasure } from './definitions/dmaicMeasure.ts'
import { kanbanBoardSetup } from './definitions/kanbanBoardSetup.ts'
import { kanbanFlowMetrics } from './definitions/kanbanFlowMetrics.ts'
import { kanbanQueueManagement } from './definitions/kanbanQueueManagement.ts'
import { kanbanWipLimits } from './definitions/kanbanWipLimits.ts'
import { leanAnalyze } from './definitions/leanAnalyze.ts'
import { leanControl } from './definitions/leanControl.ts'
import { leanDefine } from './definitions/leanDefine.ts'
import { leanImprove } from './definitions/leanImprove.ts'
import { leanMeasure } from './definitions/leanMeasure.ts'
import { pdcaAct } from './definitions/pdcaAct.ts'
import { pdcaCheck } from './definitions/pdcaCheck.ts'
import { pdcaDo } from './definitions/pdcaDo.ts'
import { pdcaPlan } from './definitions/pdcaPlan.ts'
import { pmClosing } from './definitions/pmClosing.ts'
import { pmExecuting } from './definitions/pmExecuting.ts'
import { pmInitiating } from './definitions/pmInitiating.ts'
import { pmMonitoring } from './definitions/pmMonitoring.ts'
import { pmPlanning } from './definitions/pmPlanning.ts'
import { ppsAnalyze } from './definitions/ppsAnalyze.ts'
import { ppsClarify } from './definitions/ppsClarify.ts'
import { ppsCountermeasures } from './definitions/ppsCountermeasures.ts'
import { ppsEvaluate } from './definitions/ppsEvaluate.ts'
import { ppsImplement } from './definitions/ppsImplement.ts'
import { ppsTarget } from './definitions/ppsTarget.ts'
import { rmAnalysis } from './definitions/rmAnalysis.ts'
import { rmElicitation } from './definitions/rmElicitation.ts'
import { rmManagement } from './definitions/rmManagement.ts'
import { rmSpecification } from './definitions/rmSpecification.ts'
import { rmValidation } from './definitions/rmValidation.ts'
import { rupConstruction } from './definitions/rupConstruction.ts'
import { rupElaboration } from './definitions/rupElaboration.ts'
import { rupInception } from './definitions/rupInception.ts'
import { rupTransition } from './definitions/rupTransition.ts'
import { scrumBacklogRefinement } from './definitions/scrumBacklogRefinement.ts'
import { scrumDailyStandup } from './definitions/scrumDailyStandup.ts'
import { scrumDefinitionOfDone } from './definitions/scrumDefinitionOfDone.ts'
import { scrumRetrospective } from './definitions/scrumRetrospective.ts'
import { scrumSprintPlanning } from './definitions/scrumSprintPlanning.ts'
import { scrumSprintReview } from './definitions/scrumSprintReview.ts'
import { spAdjust } from './definitions/spAdjust.ts'
import { spAnalysis } from './definitions/spAnalysis.ts'
import { spContext } from './definitions/spContext.ts'
import { spExecute } from './definitions/spExecute.ts'
import { spFormulate } from './definitions/spFormulate.ts'
import { spGaps } from './definitions/spGaps.ts'
import { spMonitor } from './definitions/spMonitor.ts'
import { spPlan } from './definitions/spPlan.ts'
import type { SkillDefinition } from './types.ts'

/** Los 71 skills de las trece metodologías, en orden alfabético por nombre. */
export const SKILLS: SkillDefinition[] = [
  baElicitation,
  baPlanning,
  baRequirementsAnalysis,
  baRequirementsLifecycle,
  baSolutionEvaluation,
  baStrategy,
  bpaAnalyze,
  bpaDesign,
  bpaIdentify,
  bpaImplement,
  bpaMap,
  bpaMonitor,
  cpDiagnosis,
  cpEvaluate,
  cpImplement,
  cpInitiation,
  cpPlan,
  cpRecommend,
  cpStructure,
  dmaicAnalyze,
  dmaicControl,
  dmaicDefine,
  dmaicImprove,
  dmaicMeasure,
  kanbanBoardSetup,
  kanbanFlowMetrics,
  kanbanQueueManagement,
  kanbanWipLimits,
  leanAnalyze,
  leanControl,
  leanDefine,
  leanImprove,
  leanMeasure,
  pdcaAct,
  pdcaCheck,
  pdcaDo,
  pdcaPlan,
  pmClosing,
  pmExecuting,
  pmInitiating,
  pmMonitoring,
  pmPlanning,
  ppsAnalyze,
  ppsClarify,
  ppsCountermeasures,
  ppsEvaluate,
  ppsImplement,
  ppsTarget,
  rmAnalysis,
  rmElicitation,
  rmManagement,
  rmSpecification,
  rmValidation,
  rupConstruction,
  rupElaboration,
  rupInception,
  rupTransition,
  scrumBacklogRefinement,
  scrumDailyStandup,
  scrumDefinitionOfDone,
  scrumRetrospective,
  scrumSprintPlanning,
  scrumSprintReview,
  spAdjust,
  spAnalysis,
  spContext,
  spExecute,
  spFormulate,
  spGaps,
  spMonitor,
  spPlan,
]
