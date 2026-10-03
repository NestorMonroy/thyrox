/**
 * Corre un caso de una suite de flujo por `headless-pool` (TASK-THYROX-0931):
 * en una unidad gestionada (`--execution unit`), en un worktree aislado, sólo
 * local (`--local-only`) y con el verify del caso. La política que el pool
 * recibe permite únicamente el modelo medido y cierra el respaldo: si el pool
 * eligiera otro modelo, la medida sería de otro.
 *
 * El pool es la autoridad de la ejecución; aquí sólo se compone su línea de
 * comando y se lee lo que dejó: `<n>.verdict` y el `result` de `<n>.json`.
 *
 * Métrica: el verdict del ítem y `usage.output_tokens`/`duration_ms` de su resultado.
 * Ciega a: lo que el pool no registra en esos dos archivos.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'

import type { WorkflowCaseResult } from './qualifyModel.ts'
import type { WorkflowCase, WorkflowSuite } from './workflowSuite.ts'

/** El pool numera los ítems desde 1; cada caso va en su propia ejecución. */
const ITEM_NUMBER = 1
const WORK_CONSUMER = 'thyrox'
const LOCAL_RUNTIME = 'ollama'

export interface PoolCaseRunnerOptions {
  readonly suite: WorkflowSuite
  readonly artifact: ResolvedModelArtifact
  readonly contextTokens: number
  readonly thyroxRoot: string
  /** Dónde deja el pool la salida de cada caso (`<outDir>/<caso>`). */
  readonly outDir: string
  readonly poolBin?: string
}

/** El pool salió sin finalizar el ítem: no hay verdict que puntuar. */
export class WorkflowPoolError extends Error {
  constructor(readonly caseId: string, readonly exitCode: number, stderr: string) {
    super(`el pool no finalizó el caso ${caseId} (exit ${exitCode}): ${stderr.trim()}`)
    this.name = 'WorkflowPoolError'
  }
}

export function poolCaseRunner(options: PoolCaseRunnerOptions): (workflowCase: WorkflowCase) => Promise<WorkflowCaseResult> {
  return async (workflowCase) => {
    const caseDir = join(options.outDir, workflowCase.id)
    await mkdir(caseDir, { recursive: true })
    const policyPath = join(caseDir, 'policy.json')
    await writeFile(policyPath, `${JSON.stringify(policyFor(options.artifact), null, 2)}\n`)
    const poolOut = join(caseDir, 'pool')
    const child = Bun.spawn([options.poolBin ?? join(options.thyroxRoot, 'bin', 'headless-pool'), ...poolArguments(options, workflowCase, policyPath, poolOut)], {
      cwd: options.thyroxRoot, stdin: new Blob([`${workflowCase.item}\n`]), stdout: 'ignore', stderr: 'pipe',
    })
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
    const verdict = await readFile(join(poolOut, `${ITEM_NUMBER}.verdict`), 'utf8').catch(() => undefined)
    if (verdict === undefined) throw new WorkflowPoolError(workflowCase.id, exitCode, stderr)
    return { verdict: verdict.trim(), ...await usageOf(join(poolOut, `${ITEM_NUMBER}.json`)) }
  }
}

/** Sólo el modelo medido, sin respaldo: el selector del pool no puede elegir otro. */
function policyFor(artifact: ResolvedModelArtifact): Record<string, unknown> {
  return {
    allowed: [{ runtime: LOCAL_RUNTIME, repository: artifact.repository, quantization: artifact.quantization, source: artifact.source }],
    fallback: { enabled: false },
  }
}

function poolArguments(options: PoolCaseRunnerOptions, workflowCase: WorkflowCase, policyPath: string, poolOut: string): string[] {
  const scope = `qualification/${options.suite.id.replace('@', '-')}/${workflowCase.id}`
  return [
    '--prompt', options.suite.promptPath,
    '--out', poolOut,
    '--task-class', options.suite.taskClass,
    '--execution', 'unit',
    '--work-reference', `${WORK_CONSUMER}:${scope}`,
    '--local-only',
    '--isolation', 'worktree',
    '--verify', workflowCase.verify,
    '--tools', options.suite.tools.join(','),
    '--model-policy', policyPath,
    '--context-tokens', String(options.contextTokens),
    '--timeout', String(options.suite.timeoutSeconds),
    ...(options.suite.systemBudgetTokens === undefined ? [] : ['--system-budget-tokens', String(options.suite.systemBudgetTokens)]),
  ]
}

/** Los tokens generados y la duración del `result` del ítem; sin él, ceros. */
async function usageOf(path: string): Promise<Pick<WorkflowCaseResult, 'outputTokens' | 'durationMs'>> {
  const text = await readFile(path, 'utf8').catch(() => '')
  const result = text.split('\n').filter(line => line.trim() !== '').map(parseLine).findLast(event => event?.type === 'result')
  const outputTokens = Number(result?.usage?.output_tokens ?? 0)
  const durationMs = Number(result?.duration_ms ?? 0)
  return { outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0, durationMs: Number.isFinite(durationMs) ? durationMs : 0 }
}

interface StreamEvent {
  readonly type?: string
  readonly duration_ms?: unknown
  readonly usage?: { readonly output_tokens?: unknown }
}

function parseLine(line: string): StreamEvent | undefined {
  try {
    return JSON.parse(line) as StreamEvent
  } catch {
    return undefined
  }
}
