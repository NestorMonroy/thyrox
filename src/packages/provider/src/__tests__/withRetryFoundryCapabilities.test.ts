/**
 * `withRetry` con el cerrojo de Foundry (`GDn`, 2.1.282): un 400 que nombra
 * una capacidad que se puede quitar se registra y se reintenta; la petición
 * de búsqueda web no se reintenta.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { APIError } from '@anthropic-ai/sdk'
import {
  foundryDeploymentSupports,
  resetFoundryCapabilities,
} from '../foundryCapabilities.js'
import { CannotRetryError, withRetry } from '../withRetry.js'

const KEYS = ['CLAUDE_CODE_USE_FOUNDRY', 'ANTHROPIC_FOUNDRY_RESOURCE']
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
beforeEach(() => {
  process.env.CLAUDE_CODE_USE_FOUNDRY = '1'
  process.env.ANTHROPIC_FOUNDRY_RESOURCE = 'mi-recurso'
  resetFoundryCapabilities()
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  resetFoundryCapabilities()
})

const rejection = (message: string) =>
  new APIError(400, { error: { type: 'invalid_request_error', message } }, message, new Headers())

async function drain<T>(generator: AsyncGenerator<unknown, T>): Promise<T> {
  for (;;) {
    const step = await generator.next()
    if (step.done) return step.value
  }
}

const fakeClient = async () => ({}) as never

describe('withRetry ante un rechazo de capacidad de Foundry', () => {
  test('registra la capacidad y reintenta una vez', async () => {
    let calls = 0
    const result = await drain(
      withRetry(
        fakeClient,
        async () => {
          calls++
          if (calls === 1) throw rejection('tool_search not supported in your workspace')
          return 'ok'
        },
        { model: 'claude-sonnet-4-5', thinkingConfig: { type: 'disabled' }, querySource: 'repl_main_thread' },
      ),
    )
    expect(result).toBe('ok')
    expect(calls).toBe(2)
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'tool_search')).toBe(false)
  })

  test('la petición de búsqueda web no se reintenta', async () => {
    let calls = 0
    const run = drain(
      withRetry(
        fakeClient,
        async () => {
          calls++
          throw rejection('Server-side web search is not available in this environment')
        },
        { model: 'claude-sonnet-4-5', thinkingConfig: { type: 'disabled' }, querySource: 'web_search_tool' as never },
      ),
    )
    await expect(run).rejects.toBeInstanceOf(CannotRetryError)
    expect(calls).toBe(1)
    // Un 400 ya termina en CannotRetryError sin el cerrojo; lo que sólo el
    // cerrojo produce es el registro de la capacidad rechazada.
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'web_search')).toBe(false)
  })
})
