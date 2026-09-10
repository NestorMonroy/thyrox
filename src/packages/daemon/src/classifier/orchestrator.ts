/**
 * Orquestador de clasificador por-worker — `ant 3921.js` Wp7/Gp7 + ZB5.
 *
 * Para cada WorkerVm:
 *   1. Se suscribe a las escrituras del ring (vía WorkerVm.on('write')).
 *   2. Cada CLASSIFIER_TICK_MS, lee la cola del ring y corre el pipeline
 *      preclassify → heuristic → llm.
 *   3. Escribe state.json + apéndice a timeline.jsonl al cambiar de estado.
 *   4. Emite tengu_bg_classify con el payload completo de ant.
 *
 * Detiene la orquestación en vm.settle.
 *
 * Gate: CLAUDE_CODE_BG_CLASSIFIER=1 (variable de entorno). El motor LLM
 * además requiere CLAUDE_CODE_BG_CLASSIFIER_ENGINE=llm; el default es
 * heuristic (sin gasto de API).
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/classifier/orchestrator.ts`.
 */

import {
  generateJobName,
  logEvent,
  readJobState,
} from '../internal/pendingCrossPackageDeps.js'
import type { WorkerVm } from '../workerVm.js'
import { closingShape } from './heuristic.js'
import { classify } from './llmClient.js'
import { isTerminalState, type WorkerState, type WorkerStateFile } from './state.js'
import { appendTimeline, readState, writeState } from './stateFile.js'

const CLASSIFIER_TICK_MS = 5000
const CLASSIFIER_DEBOUNCE_MS = 1500

interface OrchestratorState {
  vm: WorkerVm
  intent?: string
  startedAt: number
  prevState: WorkerState
  prevDetail: string
  prevTempo: 'active' | 'idle' | 'blocked'
  lastClassifyAt: number
  pendingTick: NodeJS.Timeout | null
  intervalTimer: NodeJS.Timeout | null
  stopped: boolean
  /** Tokens acumulados a través de todas las llamadas LLM de este worker. */
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number }
}

const orchestrators = new Map<string, OrchestratorState>()

export function isClassifierEnabled(): boolean {
  return process.env.CLAUDE_CODE_BG_CLASSIFIER === '1'
}

export function getClassifierEngine(): 'heuristic' | 'llm' {
  return process.env.CLAUDE_CODE_BG_CLASSIFIER_ENGINE === 'llm' ? 'llm' : 'heuristic'
}

/** ant fp7 — registrar una vez por proceso, en el primer arranque de orchestrator. */
let configEmitted = false
function emitConfigOnce(): void {
  if (configEmitted) return
  configEmitted = true
  logEvent('tengu_bg_classifier_config', {
    useSmallFastModel: 'true',
    disableThinking: 'true',
    engine: getClassifierEngine(),
  })
}

export function startOrchestrator(vm: WorkerVm, intent?: string): void {
  if (!isClassifierEnabled()) return
  const short = vm.short
  if (orchestrators.has(short)) return
  emitConfigOnce()
  const state: OrchestratorState = {
    vm,
    intent,
    startedAt: Date.now(),
    prevState: 'working',
    prevDetail: '',
    prevTempo: 'active',
    lastClassifyAt: 0,
    pendingTick: null,
    intervalTimer: null,
    stopped: false,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
  }
  // Semilla de prev desde el archivo de estado existente (así el reinicio
  // del daemon preserva continuidad).
  const existing = readState(short)
  if (existing) {
    state.prevState = existing.state
    state.prevDetail = existing.detail
    state.prevTempo = existing.tempo
    state.tokens = existing.tokens ?? state.tokens
  } else {
    // Escritura inicial del archivo de estado — captura intent + cwd + cliVersion.
    const now = new Date().toISOString()
    const initial: WorkerStateFile = {
      state: 'working',
      detail: 'starting',
      tempo: 'active',
      createdAt: now,
      updatedAt: now,
      cwd: vm.getRecord().cwd,
      cliVersion: vm.getRecord().cliVersion,
      intent,
      backend: 'daemon',
    }
    writeState(short, initial)
  }
  orchestrators.set(short, state)

  const triggerClassify = (): void => {
    if (state.stopped) return
    if (state.pendingTick) return
    const elapsed = Date.now() - state.lastClassifyAt
    const wait = Math.max(0, CLASSIFIER_DEBOUNCE_MS - elapsed)
    state.pendingTick = setTimeout(() => {
      state.pendingTick = null
      void runClassify(state).catch(() => {})
    }, wait)
    state.pendingTick.unref()
  }

  // Listener de escritura del ring (dispara con cada chunk de PTY).
  vm.on('write', triggerClassify)
  // Tick periódico para atrapar estancamientos + clasificación tipo cron.
  state.intervalTimer = setInterval(triggerClassify, CLASSIFIER_TICK_MS)
  state.intervalTimer.unref()
  // El listener de settle detiene al orchestrator.
  vm.once('settled', () => stopOrchestrator(short))
}

export function stopOrchestrator(short: string): void {
  const state = orchestrators.get(short)
  if (!state) return
  state.stopped = true
  if (state.pendingTick) clearTimeout(state.pendingTick)
  if (state.intervalTimer) clearInterval(state.intervalTimer)
  orchestrators.delete(short)
  // Escritura final de estado — marca firstTerminalAt si el estado es terminal.
  const cur = readState(short)
  if (cur && !cur.firstTerminalAt && isTerminalState(cur.state)) {
    writeState(short, { ...cur, firstTerminalAt: new Date().toISOString() })
  }
}

async function runClassify(state: OrchestratorState): Promise<void> {
  if (state.stopped) return
  state.lastClassifyAt = Date.now()
  const ringChunks = state.vm.getRingSnapshot()
  const text = Buffer.concat(ringChunks).toString('utf8')
  if (!text.trim()) return

  const cur = readState(state.vm.short)
  const minsInState = cur
    ? Math.round((Date.now() - Date.parse(cur.updatedAt)) / 60_000)
    : 0
  const result = await classify({
    text,
    prevState: state.prevState,
    latestAsk: state.intent,
    toolSummary: undefined,
    minsInState,
    engine: getClassifierEngine(),
  })

  // Acumula tokens.
  state.tokens.input += result.tokens.input
  state.tokens.output += result.tokens.output
  state.tokens.cacheRead += result.tokens.cacheRead
  state.tokens.cacheCreation += result.tokens.cacheCreation

  const stateChanged = cur === null || cur.state !== result.state
  const now = new Date().toISOString()
  const next: WorkerStateFile = {
    state: result.state,
    detail: result.detail,
    tempo: result.tempo,
    needs: result.needs,
    output: result.output,
    classifySource: result.source,
    firstTerminalAt:
      cur?.firstTerminalAt ??
      (isTerminalState(result.state) ? now : undefined),
    createdAt: cur?.createdAt ?? now,
    updatedAt: now,
    cwd: state.vm.getRecord().cwd,
    cliVersion: state.vm.getRecord().cliVersion,
    intent: state.intent ?? cur?.intent,
    backend: 'daemon',
    sessionId: cur?.sessionId,
    tokens: state.tokens,
  }
  writeState(state.vm.short, next)
  if (stateChanged) {
    appendTimeline(state.vm.short, {
      at: now,
      state: result.state,
      detail: result.detail,
      text: text.slice(-4000),
    })
  }

  logEvent('tengu_bg_classify', {
    short: state.vm.short,
    engine: result.engine,
    branch: result.branch ?? 'none',
    closingShape: closingShape(text),
    prevState: state.prevState,
    newState: result.state,
    stateChanged: String(stateChanged),
    minsInPrevState: String(minsInState),
    durationMs: String(result.durationMs),
    tailChars: String(text.length),
    ...(result.engine === 'llm' && {
      attempts: String(result.attempts),
      inputTokens: String(result.tokens.input),
      outputTokens: String(result.tokens.output),
      cacheReadInputTokens: String(result.tokens.cacheRead),
      cacheCreationInputTokens: String(result.tokens.cacheCreation),
    }),
  })

  // Emite agent_terminal una vez, al entrar a estado terminal.
  if (
    isTerminalState(result.state) &&
    !cur?.firstTerminalAt
  ) {
    logEvent('tengu_bg_agent_terminal', {
      short: state.vm.short,
      outcome: result.state,
      durationMs: String(Date.now() - state.startedAt),
      classifySource: result.source,
    })
  }

  state.prevState = result.state
  state.prevDetail = result.detail
  state.prevTempo = result.tempo

  // Origen: `ant 3991.js` — disparo del namer desde el pase post-LLM del
  // clasificador:
  //   if (!f?.name && C && $==="llm" && !H.nameInFlight) {
  //     let m = O.filter(x => !x.isApiErrorMessage).map(rE).find(Boolean)
  //     let p = m ? "" : yy8(O)
  //     let S = f3H(X3(m ?? (p ? `[calling ${p}]` : "")), 500)
  //     H.nameInFlight = !0
  //     Vq3(Y, C, S).catch(vH).finally(() => { H.nameInFlight = !1 })
  //   }
  //
  // Donde `f` es el FleetJobState (se relee tras escribir para tomar el
  // intent recién persistido), `$` es la procedencia del clasificador,
  // `C` es el prompt de usuario (state.intent), y `S` es la cola del
  // primer mensaje de texto del agente (aquí se aproxima con la cola del
  // ring que usa classify).
  //
  // El namer dispara una sola vez por vida del worker (vía el Set
  // `attempted` en `generateJobName.ts`), así que llamar a esta rama
  // repetidamente es seguro — se auto-debounce.
  if (result.source === 'llm') {
    const jobsRoot = process.env.CLAUDE_CONFIG_HOME
      ? `${process.env.CLAUDE_CONFIG_HOME}/jobs/${state.vm.short}`
      : `${process.env.HOME ?? ''}/.claude/jobs/${state.vm.short}`
    const fleetState = await readJobState(jobsRoot).catch(() => null)
    const intent =
      fleetState?.intent ?? state.intent ?? fleetState?.initialPrompt
    if (
      fleetState !== null &&
      (fleetState.name === undefined || fleetState.name === '') &&
      typeof intent === 'string' &&
      intent.length > 0
    ) {
      void generateJobName({
        short: state.vm.short,
        userMsg: intent,
        // Usa el detail del LLM como proxy compacto de la cola del
        // agente — el texto completo excedería el tope de 300 caracteres
        // de Vq3 y ant lo trunca igual.
        agentTail: result.detail ?? '',
      }).catch(() => undefined)
    }
  }
}

/** Helper de test/inspección. */
export function _orchestratorCount(): number {
  return orchestrators.size
}
