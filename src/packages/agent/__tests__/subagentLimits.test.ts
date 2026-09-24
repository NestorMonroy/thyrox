// Contrato de las dos guardas de subagentes del binario 2.1.275
// (`chunk-x9krcp51.js` `lo`/`pn`, `chunk-0tc6wzvy.js` `Yb`,
// `chunk-xbd48fav.js` `bc`). Medido al abrir la tarea: 0 hits de
// `MAX_CONCURRENT_SUBAGENTS|MAX_SUBAGENT_SPAWN_DEPTH|nesting limit` en
// `src/packages` (propuesta 2 del banco de ai-course-notes).
import { describe, expect, test } from 'bun:test'
import {
  agentDepth,
  concurrencyRefusal,
  DEFAULT_MAX_CONCURRENT_SUBAGENTS,
  DEFAULT_MAX_SPAWN_DEPTH,
  depthRefusal,
  maxConcurrentSubagents,
  maxSubagentSpawnDepth,
} from '../subagentLimits.js'

const noFlag = () => undefined

describe('profundidad', () => {
  test('el hilo principal y la ausencia de contexto son profundidad 0', () => {
    expect(agentDepth(undefined)).toBe(0)
    expect(agentDepth({ agentType: 'main' })).toBe(0)
  })
  test('un subagente sin depth declarado es 0, como `e.depth ?? 0`', () => {
    expect(agentDepth({ agentType: 'subagent' })).toBe(0)
    expect(agentDepth({ agentType: 'subagent', depth: 2 })).toBe(2)
  })
  test('el maximo por defecto es 3', () => {
    expect(DEFAULT_MAX_SPAWN_DEPTH).toBe(3)
    expect(maxSubagentSpawnDepth({}, noFlag)).toBe(3)
  })
  test('la variable gana a la bandera', () => {
    expect(maxSubagentSpawnDepth({ CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1' }, () => 5)).toBe(1)
  })
  test('la bandera vale solo si es entera y >= 1', () => {
    expect(maxSubagentSpawnDepth({}, () => 5)).toBe(5)
    expect(maxSubagentSpawnDepth({}, () => 0)).toBe(3)
    expect(maxSubagentSpawnDepth({}, () => 2.5)).toBe(3)
    expect(maxSubagentSpawnDepth({}, () => 'x')).toBe(3)
  })
  test('rehusa cuando la profundidad alcanza el maximo, con el texto del binario', () => {
    const env = { CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1' }
    expect(depthRefusal({ agentType: 'main' }, env, noFlag)).toBeUndefined()
    const refusal = depthRefusal({ agentType: 'subagent', depth: 1 }, env, noFlag)
    expect(refusal?.reason).toBe('depth_limit')
    expect(refusal?.message).toBe(
      'Subagent nesting limit reached (depth 1 of 1). Complete this task directly using your tools instead of spawning another agent. If the user explicitly requested deeper nesting, ask them to raise CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH.',
    )
  })
})

describe('anchura', () => {
  test('el maximo por defecto es 20 y la variable lo cambia', () => {
    expect(DEFAULT_MAX_CONCURRENT_SUBAGENTS).toBe(20)
    expect(maxConcurrentSubagents({})).toBe(20)
    expect(maxConcurrentSubagents({ CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '4' })).toBe(4)
  })
  test('por debajo del maximo no rehusa', () => {
    expect(concurrencyRefusal(3, { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '4' })).toBeUndefined()
  })
  test('al alcanzarlo rehusa, sin encolar, con el texto del binario', () => {
    const refusal = concurrencyRefusal(4, { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '4' })
    expect(refusal?.reason).toBe('concurrency_limit')
    expect(refusal?.message).toBe(
      'Concurrent subagent limit reached. You can run 4 subagents at once. Do not retry. If the user wants more concurrent subagents, ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.',
    )
  })
  test('la exencion (bandera o modelo) deja pasar', () => {
    expect(concurrencyRefusal(99, {}, () => true)).toBeUndefined()
  })
})
