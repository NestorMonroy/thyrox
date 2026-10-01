/**
 * Un turno del upstream `claude-cli`: el proceso corre hasta que se
 * SUSPENDE (claude llamó a una tool del puente) o TERMINA (emitió `result` o
 * salió). Quien lee este módulo decide con el desenlace qué responder al
 * cliente.
 *
 * La suspensión junta lo que el proceso dijo con lo que el puente recibió:
 * el mensaje de asistente lleva los bloques `tool_use` con el id que claude
 * les dio, y cada `tools/call` del puente se casa con uno de ellos por
 * nombre y argumentos. Si claude emitió varios `tool_use` en el mismo
 * mensaje, se espera un breve plazo a sus llamadas hermanas para responder
 * los bloques juntos, como haría el API. Un `tools/call` sin bloque que lo
 * explique (la salida llegó tarde) recibe un bloque sintetizado con id
 * propio: el cliente ve un `tool_use` de todos modos.
 */
import { randomUUID } from 'node:crypto'
import type { BridgeCall, ToolBridge } from './bridge.ts'
import type { CliProcess } from './claudeProcess.ts'
import { type ContentBlock, contentBlocksOf } from './requestTranslation.ts'
import { clientFacingContent } from './responseTranslation.ts'
import type { AssistantMessage, StreamJsonEvent } from './streamJson.ts'

/** Cuánto se espera al mensaje de asistente que explica una llamada ya recibida. */
const ASSISTANT_EVENT_GRACE_MS = 500
/** Cuánto se espera a las llamadas hermanas de un mismo mensaje. */
const SIBLING_CALL_GRACE_MS = 200
const POLL_STEP_MS = 10

export type ResultEvent = Extract<StreamJsonEvent, { type: 'result' }>

export type TurnFinish =
  | { kind: 'result'; event: ResultEvent; exitCode: number }
  | { kind: 'exited'; exitCode: number }

export type RunningTurn = {
  sessionId: string
  process: CliProcess
  bridge: ToolBridge
  token: string
  lastAssistant: () => AssistantMessage | undefined
  /** Olvida el mensaje de asistente visto: el siguiente turno empieza limpio. */
  resetAssistant: () => void
  finished: Promise<TurnFinish>
  /** Por `tool_use` id, la llamada del puente que espera su resultado. */
  awaiting: Map<string, BridgeCall>
}

export type TurnOutcome =
  | { kind: 'suspended'; content: ContentBlock[]; assistant: AssistantMessage | undefined }
  | { kind: 'finished'; finish: TurnFinish; assistant: AssistantMessage | undefined }
  | { kind: 'timeout' }

function isResult(event: StreamJsonEvent): event is ResultEvent {
  return event.type === 'result'
}

/** Arranca la lectura del proceso y devuelve el turno vivo. */
export function runTurn(options: { sessionId: string; process: CliProcess; bridge: ToolBridge; token: string }): RunningTurn {
  let assistant: AssistantMessage | undefined
  let result: ResultEvent | undefined
  const finished = (async (): Promise<TurnFinish> => {
    for await (const event of options.process.events) {
      if (event.type === 'assistant') assistant = (event as { message?: AssistantMessage }).message
      if (isResult(event)) result = event
    }
    const exitCode = await options.process.exited
    return result ? { kind: 'result', event: result, exitCode } : { kind: 'exited', exitCode }
  })()
  return {
    sessionId: options.sessionId,
    process: options.process,
    bridge: options.bridge,
    token: options.token,
    lastAssistant: () => assistant,
    resetAssistant: () => { assistant = undefined },
    finished,
    awaiting: new Map(),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toolUseBlocks(message: AssistantMessage | undefined): ContentBlock[] {
  return contentBlocksOf(message?.content).filter(block => block.type === 'tool_use')
}

async function assistantExplainingCalls(turn: RunningTurn): Promise<AssistantMessage | undefined> {
  const deadline = Date.now() + ASSISTANT_EVENT_GRACE_MS
  while (toolUseBlocks(turn.lastAssistant()).length === 0 && Date.now() < deadline) await sleep(POLL_STEP_MS)
  return turn.lastAssistant()
}

async function siblingCalls(turn: RunningTurn, first: BridgeCall, expected: number): Promise<BridgeCall[]> {
  const calls = [first]
  while (calls.length < expected) {
    const next = await Promise.race([turn.bridge.nextCall(), sleep(SIBLING_CALL_GRACE_MS).then(() => undefined)])
    if (!next) break
    calls.push(next)
  }
  return calls
}

function sameInput(block: ContentBlock, call: BridgeCall): boolean {
  return JSON.stringify(block.input ?? {}) === JSON.stringify(call.arguments)
}

/** Casa cada llamada con un bloque del mensaje; sintetiza el bloque cuando no hay ninguno que la explique. */
function matchCalls(content: ContentBlock[], calls: BridgeCall[], awaiting: Map<string, BridgeCall>): ContentBlock[] {
  const unmatched = content.filter(block => block.type === 'tool_use')
  const synthesized: ContentBlock[] = []
  for (const call of calls) {
    const index = unmatched.findIndex(block => block.name === call.name && sameInput(block, call))
    const block = index >= 0 ? unmatched.splice(index, 1)[0]! : { type: 'tool_use', id: `toolu_${randomUUID()}`, name: call.name, input: call.arguments }
    if (index < 0) synthesized.push(block)
    awaiting.set(String(block.id), call)
  }
  return [...content, ...synthesized]
}

async function suspend(turn: RunningTurn, first: BridgeCall): Promise<TurnOutcome> {
  const assistant = await assistantExplainingCalls(turn)
  const expected = Math.max(1, toolUseBlocks(assistant).length)
  const calls = await siblingCalls(turn, first, expected)
  const content = matchCalls(clientFacingContent(assistant), calls, turn.awaiting)
  return { kind: 'suspended', content, assistant }
}

/** Corre el turno hasta su siguiente desenlace. */
export async function awaitOutcome(turn: RunningTurn, timeoutMs: number): Promise<TurnOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<TurnOutcome>(resolve => { timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs) })
  try {
    return await Promise.race([
      turn.bridge.nextCall().then(call => suspend(turn, call)),
      turn.finished.then((finish): TurnOutcome => ({ kind: 'finished', finish, assistant: turn.lastAssistant() })),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
  }
}
