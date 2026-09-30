/**
 * `checkRuleBasedPermissions` ≙ `oT` de 2.1.275 (`chunk-q2gh92k2.js`).
 */
import { describe, expect, test } from 'bun:test'
import { checkRuleBasedPermissions } from '../ruleBasedPermissions.js'

type Decision = { behavior: string; message?: string; decisionReason?: unknown; [k: string]: unknown }

function tool(extra: Record<string, unknown> = {}) {
  return {
    name: 'Demo',
    inputSchema: { parse: (x: unknown) => x },
    checkPermissions: async (): Promise<Decision> => ({ behavior: 'passthrough', message: '' }),
    isReadOnly: () => false,
    ...extra,
  } as never
}
function call(ctx: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const context = { mode: 'default', additionalWorkingDirectories: new Map(), alwaysAllowRules: {}, alwaysDenyRules: {}, alwaysAskRules: {}, ...ctx }
  return { getAppState: () => ({ toolPermissionContext: context }), abortController: new AbortController(), ...extra } as never
}

describe('checkRuleBasedPermissions (oT)', () => {
  test('sin reglas y la herramienta pasa de largo: null', async () => {
    expect(await checkRuleBasedPermissions(tool(), {}, call())).toBeNull()
  })
  test('una denegación de la herramienta entera', async () => {
    const r = await checkRuleBasedPermissions(tool(), {}, call({ alwaysDenyRules: { session: ['Demo'] } }))
    expect(r).toMatchObject({ behavior: 'deny', message: 'Permission to use Demo has been denied.', decisionReason: { type: 'rule' } })
  })
  test('una denegación campo:valor nombra el contenido', async () => {
    const r = await checkRuleBasedPermissions(tool(), { url: 'https://x' }, call({ alwaysDenyRules: { session: ['Demo(url:https://*)'] } }))
    expect(r).toMatchObject({ behavior: 'deny', message: 'Permission to use Demo with url:https://* has been denied.' })
  })
  test('una regla de consulta pide aprobación con su regla', async () => {
    const r = await checkRuleBasedPermissions(tool(), {}, call({ alwaysAskRules: { session: ['Demo'] } }))
    expect(r).toMatchObject({ behavior: 'ask', decisionReason: { type: 'rule' } })
  })
  test('con regla de consulta, una denegación propia de la herramienta gana', async () => {
    const t = tool({ checkPermissions: async () => ({ behavior: 'deny', message: 'no' }) })
    const r = await checkRuleBasedPermissions(t, {}, call({ alwaysAskRules: { session: ['Demo'] } }))
    expect(r).toMatchObject({ behavior: 'deny', message: 'no' })
  })
  test('con regla de consulta, la consulta propia lleva la regla y pierde sugerencias', async () => {
    const t = tool({ checkPermissions: async () => ({ behavior: 'ask', message: 'propia', suggestions: [1] }) })
    const r = (await checkRuleBasedPermissions(t, {}, call({ alwaysAskRules: { session: ['Demo'] } }))) as Decision
    expect(r).toMatchObject({ behavior: 'ask', message: 'propia', matchedAskRule: { ruleValue: { toolName: 'Demo' } } })
    expect('suggestions' in r).toBe(false)
  })
  test('una denegación propia de la herramienta se devuelve', async () => {
    const t = tool({ checkPermissions: async () => ({ behavior: 'deny', message: 'propia' }) })
    expect(await checkRuleBasedPermissions(t, {}, call())).toMatchObject({ behavior: 'deny', message: 'propia' })
  })
  test('una consulta propia por seguridad se devuelve; una consulta común no', async () => {
    const safety = tool({ checkPermissions: async () => ({ behavior: 'ask', message: 's', decisionReason: { type: 'safetyCheck', reason: 'x', classifierApprovable: true } }) })
    expect(await checkRuleBasedPermissions(safety, {}, call())).toMatchObject({ behavior: 'ask', message: 's' })
    const plain = tool({ checkPermissions: async () => ({ behavior: 'ask', message: 'p' }) })
    expect(await checkRuleBasedPermissions(plain, {}, call())).toBeNull()
  })
  test('una herramienta que exige interacción pide aprobación', async () => {
    const r = await checkRuleBasedPermissions(tool({ requiresUserInteraction: () => true }), {}, call())
    expect(r).toMatchObject({ behavior: 'ask', decisionReason: { type: 'other', reason: 'requiresUserInteraction' } })
  })
  test('el techo de permiso de un servidor MCP en ask', async () => {
    const t = tool({ mcpInfo: { serverName: 's', toolName: 't', effectiveMaxPermission: 'ask' } })
    expect(await checkRuleBasedPermissions(t, {}, call())).toMatchObject({
      behavior: 'ask',
      decisionReason: { type: 'other', reason: 'Your organization requires approval for this tool' },
    })
  })
  test('un verificador que revienta, con crashIsObjection, pide aprobación', async () => {
    const t = tool({ checkPermissions: async () => { throw new Error('boom') } })
    expect(await checkRuleBasedPermissions(t, {}, call(), { crashIsObjection: true })).toMatchObject({
      behavior: 'ask',
      decisionReason: { type: 'other', reason: 'permission_check_crashed' },
    })
    expect(await checkRuleBasedPermissions(t, {}, call())).toBeNull()
  })
  test('una herramienta sólo de clasificador, fuera de auto mode, se deniega', async () => {
    const t = tool({ classifierOnly: () => ({ onBlock: 'deny' }) })
    expect(await checkRuleBasedPermissions(t, {}, call())).toMatchObject({
      behavior: 'deny',
      message: 'Only the auto-mode classifier can allow Demo: the session is not in auto mode',
    })
  })
  test('una llamada abortada propaga el aborto', async () => {
    const aborted = new AbortController()
    aborted.abort()
    const t = tool({ checkPermissions: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e } })
    await expect(checkRuleBasedPermissions(t, {}, call({}, { abortController: aborted }))).rejects.toThrow()
  })
})
