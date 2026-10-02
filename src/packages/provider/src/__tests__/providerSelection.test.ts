/**
 * La selección de proveedor es genérica: sólo participan los proveedores que
 * la política permite, el orden lo da la política y el selector no conoce a
 * ninguno por su nombre. Sin candidato elegible permitido, la ejecución queda
 * bloqueada con su causa. Ningún proveedor es respaldo obligatorio.
 */
import { describe, expect, test } from 'bun:test'

import { ComboRouter } from '../proxy/combo/comboRouter.ts'
import { ProviderPolicyError, parseProviderPolicy, selectProvider, type ProviderCandidate } from '../selection/providerSelection.ts'

function candidate(provider: string, model: string, overrides: Partial<ProviderCandidate> = {}): ProviderCandidate {
  return {
    provider, model, name: `${provider}:${model}`, locality: 'remote', adapter: 'openai-compatible', attributes: {},
    eligibility: { eligible: true, evidence: `${model} aprobó mecanica@1` },
    ...overrides,
  }
}

const LOCAL_QWEN = candidate('local-qwen-coder', 'thyrox-qwen-coder', { locality: 'local', adapter: 'ollama', attributes: { repository: 'Qwen/Qwen2.5-Coder-1.5B-Instruct' } })
const DEEPSEEK = candidate('deepseek-api', 'deepseek-v4-pro')
const OPENAI = candidate('openai-api', 'gpt-x')
const CLAUDE = candidate('claude-cli', 'claude-sonnet-5', { adapter: 'claude-cli' })

const policy = (allowed: unknown[], extra: Record<string, unknown> = {}) => parseProviderPolicy(JSON.stringify({ allowed, ...extra }))
const select = (candidates: readonly ProviderCandidate[], declared: ReturnType<typeof policy>) => selectProvider(candidates, declared, new ComboRouter())

describe('selectProvider', () => {
  test('1. sólo participan los proveedores explícitamente permitidos', async () => {
    const result = await select([CLAUDE, DEEPSEEK], policy([{ provider: 'deepseek-api', priority: 10 }]))
    expect(result).toMatchObject({ status: 'selected', provider: 'deepseek-api', model: 'deepseek-v4-pro' })
  })

  test('2. el orden lo da la política, no el selector', async () => {
    const declared = policy([{ provider: 'openai-api', priority: 10 }, { provider: 'deepseek-api', priority: 20 }])
    expect(await select([DEEPSEEK, OPENAI], declared)).toMatchObject({ provider: 'openai-api' })
    const reversed = policy([{ provider: 'openai-api', priority: 30 }, { provider: 'deepseek-api', priority: 20 }])
    expect(await select([DEEPSEEK, OPENAI], reversed)).toMatchObject({ provider: 'deepseek-api' })
  })

  test('3. un local cualificado puede tener preferencia, si la política se la da', async () => {
    const declared = policy([{ provider: 'local-qwen-coder', priority: 10 }, { provider: 'deepseek-api', priority: 20 }])
    expect(await select([DEEPSEEK, LOCAL_QWEN], declared)).toMatchObject({ provider: 'local-qwen-coder', locality: 'local', adapter: 'ollama' })
  })

  test('4. varios proveedores remotos coexisten: el inelegible cede al siguiente permitido', async () => {
    const unqualified = { ...OPENAI, eligibility: { eligible: false as const, reason: 'sin cualificación aprobada de mecanica' } }
    const declared = policy([{ provider: 'openai-api', priority: 10 }, { provider: 'deepseek-api', priority: 20 }])
    const result = await select([unqualified, DEEPSEEK], declared)
    expect(result).toMatchObject({ status: 'selected', provider: 'deepseek-api' })
    expect(result.status === 'selected' ? result.selectionReason : '').toMatch(/openai-api:gpt-x: sin cualificación aprobada de mecanica/)
  })

  test('5 y 6. claude-cli puede faltar por completo y la configuración sigue siendo válida', async () => {
    const declared = policy([{ provider: 'local-qwen-coder', priority: 10 }])
    expect(declared.allowed.map(selector => selector.provider)).toEqual(['local-qwen-coder'])
    expect(await select([LOCAL_QWEN], declared)).toMatchObject({ status: 'selected', provider: 'local-qwen-coder' })
  })

  test('el lote se ejecuta sin claude-cli: aunque exista como candidato, si no está permitido no participa', async () => {
    const declared = policy([{ provider: 'local-qwen-coder', priority: 10 }])
    const unqualifiedLocal = { ...LOCAL_QWEN, eligibility: { eligible: false as const, reason: 'contexto medido insuficiente' } }
    const result = await select([unqualifiedLocal, CLAUDE], declared)
    expect(result.status).toBe('blocked')
    expect(JSON.stringify(result)).not.toContain('claude-sonnet-5')
  })

  test('7. agotados los elegibles permitidos, el resultado es blocked con la causa de cada uno', async () => {
    const declared = policy([{ provider: 'local-qwen-coder', priority: 10 }, { provider: 'deepseek-api', priority: 20 }])
    const result = await select([
      { ...LOCAL_QWEN, eligibility: { eligible: false, reason: 'catálogo sin cualificación' } },
      { ...DEEPSEEK, eligibility: { eligible: false, reason: 'sin credencial' } },
    ], declared)
    expect(result.status).toBe('blocked')
    const reason = result.status === 'blocked' ? result.blockedReason : ''
    expect(reason).toMatch(/local-qwen-coder:thyrox-qwen-coder: catálogo sin cualificación/)
    expect(reason).toMatch(/deepseek-api:deepseek-v4-pro: sin credencial/)
  })

  test('sin ningún candidato de los proveedores permitidos, blocked lo dice', async () => {
    const result = await select([], policy([{ provider: 'deepseek-api', priority: 10 }]))
    expect(result.status === 'blocked' ? result.blockedReason : '').toMatch(/ningún candidato de los proveedores permitidos: deepseek-api/)
  })

  test('8. selectionReason dice por qué ganó el elegido: su prioridad y su evidencia', async () => {
    const result = await select([LOCAL_QWEN], policy([{ provider: 'local-qwen-coder', priority: 10 }]))
    expect(result.status === 'selected' ? result.selectionReason : '').toMatch(/prioridad 10.*thyrox-qwen-coder aprobó mecanica@1/)
  })

  test('un selector puede acotar por atributos del candidato, sin saber qué proveedor es', async () => {
    const declared = policy([{ provider: 'local-qwen-coder', priority: 10, match: { repository: 'qwen/qwen2.5-coder-7b-instruct' } }])
    expect((await select([LOCAL_QWEN], declared)).status).toBe('blocked')
    const matching = policy([{ provider: 'local-qwen-coder', priority: 10, match: { repository: 'qwen/qwen2.5-coder-1.5b-instruct' } }])
    expect((await select([LOCAL_QWEN], matching)).status).toBe('selected')
  })

  test('la estrategia de orden es la del ComboRouter declarada por la política', async () => {
    const declared = policy([{ provider: 'deepseek-api', priority: 10 }, { provider: 'openai-api', priority: 10 }], { strategy: 'cost-optimized' })
    const router = new ComboRouter({ inputPriceOf: model => (model === 'gpt-x' ? 0.1 : 0.66) })
    expect(await selectProvider([DEEPSEEK, OPENAI], declared, router)).toMatchObject({ provider: 'openai-api' })
  })
})

describe('parseProviderPolicy', () => {
  test('9. la clave fallback se retiró: se rehúsa', () => {
    expect(() => parseProviderPolicy(JSON.stringify({ allowed: [], fallback: { enabled: true } }))).toThrow(ProviderPolicyError)
  })

  test('cada proveedor permitido declara nombre y prioridad', () => {
    expect(() => parseProviderPolicy(JSON.stringify({ allowed: [{ provider: 'x' }] }))).toThrow(/priority/)
    expect(() => parseProviderPolicy(JSON.stringify({ allowed: [{ priority: 1 }] }))).toThrow(/provider/)
  })

  test('una estrategia desconocida se rehúsa; sin declararla, priority', () => {
    expect(() => parseProviderPolicy(JSON.stringify({ allowed: [], strategy: 'magic' }))).toThrow(/strategy/)
    expect(parseProviderPolicy(JSON.stringify({ allowed: [] })).strategy).toBe('priority')
  })
})
