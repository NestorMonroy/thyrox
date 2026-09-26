/**
 * El cerrojo de capacidades por despliegue de Foundry (2.1.282): `TA`/`WQt`
 * leen el 400, `vh` arma la clave, `jQt` registra, `qpe` consulta, `GDn`
 * decide el reintento y `Apo` quita de la petición lo que el despliegue
 * rechazó.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { APIError } from '@anthropic-ai/sdk'
import {
  DEFERRED_TOOL_PLACEHOLDER_DESCRIPTION,
  DEFERRED_TOOL_PLACEHOLDER_NAME,
  FOUNDRY_PURPOSE_REQUEST_FAILURE,
  foundryDeploymentKey,
  foundryDeploymentSupports,
  handleFoundryCapabilityRejection,
  parseUnsupportedCapabilities,
  recordUnsupportedCapabilities,
  resetFoundryCapabilities,
  stripUnsupportedToolFields,
} from '../foundryCapabilities.js'

const KEYS = ['CLAUDE_CODE_USE_FOUNDRY', 'ANTHROPIC_FOUNDRY_BASE_URL', 'ANTHROPIC_FOUNDRY_RESOURCE']
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
beforeEach(() => {
  for (const k of KEYS) delete process.env[k]
  process.env.CLAUDE_CODE_USE_FOUNDRY = '1'
  process.env.ANTHROPIC_FOUNDRY_RESOURCE = 'mi-recurso'
  resetFoundryCapabilities()
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

const badRequest = (message: string) =>
  new APIError(400, { error: { type: 'invalid_request_error', message } }, message, new Headers())

describe('parseUnsupportedCapabilities (TA)', () => {
  test('las tres formas del mensaje', () => {
    expect(parseUnsupportedCapabilities('tool_search, structured_outputs not supported in your workspace')).toEqual([
      'tool_search',
      'structured_outputs',
    ])
    expect(
      parseUnsupportedCapabilities('These features are not available for Azure AI Foundry workspaces: tool_search and web_fetch'),
    ).toEqual(['tool_search', 'web_fetch'])
    expect(parseUnsupportedCapabilities('Server-side web search is not available in this environment')).toEqual([
      'web_search',
    ])
    expect(parseUnsupportedCapabilities('prompt is too long')).toBeNull()
  })
})

describe('la clave y el cerrojo (vh, jQt, qpe)', () => {
  test('la clave es el recurso más el modelo sin sufijo de ventana', () => {
    expect(foundryDeploymentKey('claude-sonnet-4-5[1m]')).toBe(
      'https://mi-recurso.services.ai.azure.com::claude-sonnet-4-5',
    )
  })

  test('sin registro todo se admite; registrado, sólo lo no rechazado', () => {
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'tool_search')).toBe(true)
    recordUnsupportedCapabilities('claude-sonnet-4-5', ['tool_search'])
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'tool_search')).toBe(false)
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'structured_outputs')).toBe(true)
    expect(foundryDeploymentSupports('claude-opus-5', 'tool_search')).toBe(true)
  })
})

describe('handleFoundryCapabilityRejection (GDn)', () => {
  test('un 400 con capacidad que se puede quitar pide reintento y la registra', () => {
    const verdict = handleFoundryCapabilityRejection(
      badRequest('tool_search not supported in your workspace'),
      'claude-sonnet-4-5',
      'repl_main_thread',
    )
    expect(verdict).toBe('retry:foundry-capability-strip:tool_search')
    expect(foundryDeploymentSupports('claude-sonnet-4-5', 'tool_search')).toBe(false)
  })

  test('la petición de búsqueda web falla sin reintento', () => {
    expect(
      handleFoundryCapabilityRejection(
        badRequest('Server-side web search is not available in this environment'),
        'claude-sonnet-4-5',
        'web_search_tool',
      ),
    ).toBe(FOUNDRY_PURPOSE_REQUEST_FAILURE)
  })

  test('fuera de Foundry, o sin capacidad reconocible, no decide nada', () => {
    expect(handleFoundryCapabilityRejection(badRequest('prompt is too long'), 'm', 'repl_main_thread')).toBeNull()
    delete process.env.CLAUDE_CODE_USE_FOUNDRY
    expect(
      handleFoundryCapabilityRejection(badRequest('tool_search not supported in your workspace'), 'm', 'repl_main_thread'),
    ).toBeNull()
  })
})

describe('stripUnsupportedToolFields (Apo)', () => {
  const tools: { name: string; description: string; strict?: boolean; defer_loading?: boolean }[] = [
    { name: 'Read', description: 'lee', strict: true },
    { name: 'mcp__x', description: 'x', defer_loading: true },
    { name: DEFERRED_TOOL_PLACEHOLDER_NAME, description: DEFERRED_TOOL_PLACEHOLDER_DESCRIPTION, defer_loading: true },
  ]

  test('sin rechazo registrado devuelve la misma lista', () => {
    expect(stripUnsupportedToolFields(tools, 'claude-sonnet-4-5')).toBe(tools)
  })

  test('quita defer_loading y el marcador si se rechazó la búsqueda, y strict si se rechazó structured_outputs', () => {
    recordUnsupportedCapabilities('claude-sonnet-4-5', ['tool_search', 'structured_outputs'])
    expect(stripUnsupportedToolFields(tools, 'claude-sonnet-4-5')).toEqual([
      { name: 'Read', description: 'lee' },
      { name: 'mcp__x', description: 'x' },
    ])
  })
})
