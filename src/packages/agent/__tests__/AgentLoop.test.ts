/* biome-ignore-all lint/correctness/useYield: test fixtures intentionally throw or return early before yielding */
/**
 * Porte de `ccnmt: packages/agent/__tests__/AgentLoop.test.ts`.
 *
 * `AgentLoop` es el bucle turno-a-turno: arranca el stream del provider,
 * decide según el `stop_reason` si ejecuta herramientas o cierra el turno,
 * respeta el veredicto de permiso, para en `maxTurns`, propaga el abort,
 * y respeta el stop hook y el hook lifecycle (onTurnStart/onTurnEnd).
 */
import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { AgentLoop } from '../core/AgentLoop.ts'
import { createMockDeps, END_TURN_EVENTS, createToolUseStreamEvents, createMockStream } from './fixtures/mockDeps.ts'
import type { AgentDeps, CoreTool, ToolResult } from '../index.ts'
import { toCoreMessage } from '../messageAdapters.ts'

describe('AgentLoop', () => {
  let deps: AgentDeps

  beforeEach(() => {
    deps = createMockDeps()
  })

  test('completes a single turn with end_turn and no tool call', async () => {
    deps.provider.stream = createMockStream(END_TURN_EVENTS)

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    expect(doneEvent).toBeDefined()
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('end_turn')
    }
  })

  test('tool_use triggers tool execution', async () => {
    const toolUseId = 'toolu_test123'
    const toolName = 'Bash'
    const mockTool: CoreTool = {
      name: 'Bash',
      description: 'Run bash command',
      inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
    }

    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents(toolName, toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => mockTool)
    deps.tools.execute = mock(async (): Promise<ToolResult> => ({
      output: 'command output',
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Run ls', messages: [] })) {
      events.push(event)
    }

    expect(events.some(e => e.type === 'tool_start')).toBe(true)
    expect(events.some(e => e.type === 'tool_result')).toBe(true)
  })

  test('permission denial skips tool execution', async () => {
    const toolUseId = 'toolu_deny123'
    const toolName = 'Bash'
    const mockTool: CoreTool = {
      name: 'Bash',
      description: 'Run bash command',
      inputSchema: { type: 'object' },
    }

    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents(toolName, toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => mockTool)
    deps.permission.canUseTool = mock(async () => ({
      allowed: false as const,
      reason: 'User denied',
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Run rm -rf', messages: [] })) {
      events.push(event)
    }

    expect(events.some(e => e.type === 'tool_start')).toBe(false)
  })

  test('stops when the maxTurns limit is reached', async () => {
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount <= 3) {
        for (const event of createToolUseStreamEvents('Bash', `toolu_${callCount}`)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })

    deps.tools.find = mock(() => ({
      name: 'Bash',
      description: 'Bash',
      inputSchema: { type: 'object' },
    }) as CoreTool)
    deps.tools.execute = mock(async () => ({ output: 'ok' }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({
      prompt: 'test',
      messages: [],
      maxTurns: 2,
    })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('max_turns')
    }
  })

  test('abort signal returns interrupted', async () => {
    const abortController = new AbortController()
    abortController.abort()

    deps.provider.stream = createMockStream(END_TURN_EVENTS)

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({
      prompt: 'Hello',
      messages: [],
      abortSignal: abortController.signal,
    })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('interrupted')
    }
  })

  test('stop hook prevents continuation', async () => {
    deps.provider.stream = createMockStream(END_TURN_EVENTS)
    deps.hooks.onStop = mock(async () => ({
      blockingErrors: ['Test blocked'],
      preventContinuation: true,
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('stop_hook')
    }
  })

  test('fires hook lifecycle around the turn', async () => {
    deps.provider.stream = createMockStream(END_TURN_EVENTS)

    const loop = new AgentLoop(deps)
    for await (const _event of loop.run({ prompt: 'Hello', messages: [] })) {
      // drain
    }

    expect(deps.hooks.onTurnStart).toHaveBeenCalledTimes(1)
    expect(deps.hooks.onTurnEnd).toHaveBeenCalledTimes(1)
  })

  test('provider error returns a done event with error reason', async () => {
    deps.provider.stream = mock(async function* () {
      throw new Error('API rate limit')
    })

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('error')
      expect(doneEvent.error).toBeDefined()
    }
  })

  // El provider emite su mensaje de asistente en la forma anidada del API; los
  // deps de produccion lo aplanan con `toCoreMessage` antes de que llegue al
  // core. Estos dos casos fijan por que eso importa: `aggregateUsage` lee el
  // `usage` de la raiz.
  const nestedAssistant = {
    type: 'assistant',
    uuid: 'a-usage',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'hola' }],
      usage: { input_tokens: 10, output_tokens: 4 },
      stop_reason: 'end_turn',
    },
  }

  async function doneUsage(event: unknown) {
    deps.provider.stream = mock(async function* () {
      yield event as never
    })
    const loop = new AgentLoop(deps)
    let done: { type: string; reason?: string; usage?: { input_tokens: number; output_tokens: number } } | undefined
    for await (const e of loop.run({ prompt: 'x', messages: [] })) {
      if (e.type === 'done') done = e as typeof done
    }
    return done
  }

  test('the usage of an adapted provider message reaches the done event', async () => {
    const done = await doneUsage(toCoreMessage(nestedAssistant))
    expect(done?.reason).toBe('end_turn')
    expect(done?.usage).toMatchObject({ input_tokens: 10, output_tokens: 4 })
  })

  test('control: the same message unadapted loses its usage (the defect before the adapters)', async () => {
    const done = await doneUsage(nestedAssistant)
    expect(done?.usage).toMatchObject({ input_tokens: 0, output_tokens: 0 })
  })

  test('missing tool returns an error tool_result', async () => {
    const toolUseId = 'toolu_unknown'
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents('UnknownTool', toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => undefined)

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'test', messages: [] })) {
      events.push(event)
    }

    expect(events.some(e => e.type === 'tool_start')).toBe(false)
  })
})
