import { describe, expect, test } from 'bun:test'
import { getCoordinatorAgents, workerSystemPrompt } from '../built-in/workerAgent.js'

// El módulo porta `chunk-zedpfpr0.js` de 2.1.282: el único agente que el
// modo coordinador expone, y su prompt, que sólo ofrece el reparto cuando la
// profundidad admite otro nivel.
describe('getCoordinatorAgents', () => {
  test('expone un solo agente, el worker, con los atributos del binario', () => {
    const agents = getCoordinatorAgents()
    expect(agents).toHaveLength(1)
    const [worker] = agents
    expect(worker!.agentType).toBe('worker')
    expect(worker!.tools).toEqual(['*'])
    expect(worker!.maxTurns).toBe(500)
    expect(worker!.permissionMode).toBe('bubble')
    expect(worker!.source).toBe('built-in')
  })

  test('el prompt ofrece el Agent tool sólo si la profundidad admite otro nivel', () => {
    expect(workerSystemPrompt(2)).toContain('If you have the Agent tool, you may use it to fan out')
    expect(workerSystemPrompt(1)).not.toContain('fan out')
    expect(workerSystemPrompt(1)).toContain('- Limit changes to what your task requires')
  })
})
