/**
 * La conducta que gobierna cada variable THYROX_* de
 * `@thyrox/tool-registry`. Cada caso contrasta la variable fijada con la
 * ausente.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { setIsInteractive } from '@thyrox/app-host/bootstrap/state.js'
import { isReplModeEnabled } from '../tools/REPLTool/constants.ts'
import { getBuiltInAgents } from '../tools/AgentTool/builtInAgents.ts'
import { getAutoBackgroundMs } from '../tools/AgentTool/AgentTool.tsx'

const KEYS = ['USER_TYPE', 'THYROX_CODE_REPL', 'THYROX_REPL_MODE', 'THYROX_CODE_ENTRYPOINT', 'THYROX_AGENT_SDK_DISABLE_BUILTIN_AGENTS', 'THYROX_AUTO_BACKGROUND_TASKS']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  setIsInteractive(true)
})

describe('THYROX_REPL_MODE', () => {
  test('fuerza el modo REPL fuera de la build interna', () => {
    expect(isReplModeEnabled()).toBe(false)
    process.env.THYROX_REPL_MODE = '1'
    expect(isReplModeEnabled()).toBe(true)
  })

  test('THYROX_CODE_REPL=0 lo apaga aunque esté fijada', () => {
    process.env.THYROX_REPL_MODE = '1'
    process.env.THYROX_CODE_REPL = '0'
    expect(isReplModeEnabled()).toBe(false)
  })
})

describe('THYROX_AGENT_SDK_DISABLE_BUILTIN_AGENTS', () => {
  test('en sesión no interactiva deja la lista de agentes integrados vacía', () => {
    setIsInteractive(false)
    expect(getBuiltInAgents().length).toBeGreaterThan(0)
    process.env.THYROX_AGENT_SDK_DISABLE_BUILTIN_AGENTS = '1'
    expect(getBuiltInAgents()).toEqual([])
  })

  test('en sesión interactiva no tiene efecto', () => {
    setIsInteractive(true)
    process.env.THYROX_AGENT_SDK_DISABLE_BUILTIN_AGENTS = '1'
    expect(getBuiltInAgents().length).toBeGreaterThan(0)
  })
})

describe('THYROX_AUTO_BACKGROUND_TASKS', () => {
  test('manda a segundo plano un agente tras 120 s; sin ella, nunca', () => {
    expect(getAutoBackgroundMs()).toBe(0)
    process.env.THYROX_AUTO_BACKGROUND_TASKS = '1'
    expect(getAutoBackgroundMs()).toBe(120_000)
  })
})
