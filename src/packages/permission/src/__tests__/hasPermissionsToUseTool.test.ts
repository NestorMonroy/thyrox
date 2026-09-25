/**
 * `hasPermissionsToUseTool` ≙ ccnmt v2.1.88 `permissions.ts:480-1107`: la
 * cadena de reglas y, sobre su `ask`, las transformaciones de modo.
 */
import { describe, expect, test } from 'bun:test'
import { hasPermissionsToUseTool } from '../permissions.js'

type Decision = { behavior: string; message?: string; decisionReason?: { type: string; [k: string]: unknown }; [k: string]: unknown }

function tool(extra: Record<string, unknown> = {}) {
  return {
    name: 'Demo',
    inputSchema: { parse: (x: unknown) => x },
    checkPermissions: async (): Promise<Decision> => ({ behavior: 'passthrough', message: '' }),
    isReadOnly: () => false,
    ...extra,
  } as never
}

function context(permissionContext: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    toolPermissionContext: {
      mode: 'default',
      additionalWorkingDirectories: new Map(),
      alwaysAllowRules: {},
      alwaysDenyRules: {},
      alwaysAskRules: {},
      ...permissionContext,
    },
  }
  return {
    getAppState: () => state,
    setAppState: (f: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      state = f(state)
    },
    abortController: new AbortController(),
    options: { tools: [] },
    messages: [],
  } as never
}

const assistant = { message: { id: 'msg_1' } } as never

async function decide(t: unknown, permissionContext: Record<string, unknown> = {}): Promise<Decision> {
  return (await hasPermissionsToUseTool(t as never, {}, context(permissionContext), assistant, 'tu_1')) as Decision
}

describe('hasPermissionsToUseTool', () => {
  test('una denegación de la herramienta entera gana a todo', async () => {
    const r = await decide(tool(), { mode: 'bypassPermissions', alwaysDenyRules: { session: ['Demo'] } })
    expect(r).toMatchObject({ behavior: 'deny', decisionReason: { type: 'rule' } })
  })
  test('sin decisión en modo default se pregunta', async () => {
    const r = await decide(tool())
    expect(r.behavior).toBe('ask')
  })
  test('el modo bypass permite lo que nadie decidió', async () => {
    const r = await decide(tool(), { mode: 'bypassPermissions' })
    expect(r).toMatchObject({ behavior: 'allow', decisionReason: { type: 'mode', mode: 'bypassPermissions' } })
  })
  test('plan con bypass disponible también permite', async () => {
    const r = await decide(tool(), { mode: 'plan', isBypassPermissionsModeAvailable: true })
    expect(r).toMatchObject({ behavior: 'allow', decisionReason: { type: 'mode', mode: 'plan' } })
  })
  test('una regla allow de herramienta entera permite', async () => {
    const r = await decide(tool(), { alwaysAllowRules: { session: ['Demo'] } })
    expect(r).toMatchObject({ behavior: 'allow', decisionReason: { type: 'rule' } })
  })
  test('una comprobación de seguridad es inmune al bypass', async () => {
    const t = tool({
      checkPermissions: async () => ({ behavior: 'ask', message: 'protegida', decisionReason: { type: 'safetyCheck', reason: 'x' } }),
    })
    const r = await decide(t, { mode: 'bypassPermissions' })
    expect(r).toMatchObject({ behavior: 'ask', message: 'protegida' })
  })
  test('una regla ask por contenido es inmune al bypass', async () => {
    const t = tool({
      checkPermissions: async () => ({
        behavior: 'ask',
        message: 'por contenido',
        decisionReason: { type: 'rule', rule: { ruleBehavior: 'ask', source: 'session', ruleValue: { toolName: 'Demo' } } },
      }),
    })
    const r = await decide(t, { mode: 'bypassPermissions' })
    expect(r).toMatchObject({ behavior: 'ask', message: 'por contenido' })
  })
  test('dontAsk convierte la pregunta en denegación', async () => {
    const r = await decide(tool(), { mode: 'dontAsk' })
    expect(r).toMatchObject({ behavior: 'deny', decisionReason: { type: 'mode', mode: 'dontAsk' } })
    expect(r.message).toContain("don't ask mode")
  })
  test('sin prompt disponible y sin hook que decida, se deniega', async () => {
    const r = await decide(tool(), { shouldAvoidPermissionPrompts: true })
    expect(r).toMatchObject({ behavior: 'deny', decisionReason: { type: 'asyncAgent' } })
  })
  test('una herramienta que deniega se respeta aunque haya bypass', async () => {
    const t = tool({ checkPermissions: async () => ({ behavior: 'deny', message: 'no' }) })
    const r = await decide(t, { mode: 'bypassPermissions' })
    expect(r).toMatchObject({ behavior: 'deny', message: 'no' })
  })
})
