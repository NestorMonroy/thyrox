import { describe, expect, test } from 'bun:test'
import { logSkillsLoaded, type SkillCommand } from '../skillLoadedEvent.js'

describe('logSkillsLoaded — sin dependencias inyectadas (estado real hoy)', () => {
  test('no emite ningún evento — no hay skills que enumerar todavía', async () => {
    const eventos: [string, Record<string, unknown>][] = []
    await logSkillsLoaded('/repo', 100_000, { logEvent: (e, m) => eventos.push([e, m]) })
    expect(eventos.length).toBe(0)
  })
})

describe('logSkillsLoaded — con skills inyectadas', () => {
  const skills: SkillCommand[] = [
    { type: 'prompt', name: 'sphinx', source: 'project', loadedFrom: '.claude/skills/sphinx', kind: 'markdown' },
    { type: 'prompt', name: 'thyrox', source: 'plugin', loadedFrom: '.claude/skills/thyrox' },
    { type: 'builtin', name: 'no-es-prompt', source: 'project', loadedFrom: 'n/a' },
  ]

  test('sólo emite tengu_skill_loaded para skills de tipo prompt — 2 de 3', async () => {
    const eventos: [string, Record<string, unknown>][] = []
    await logSkillsLoaded('/repo', 50_000, {
      getSkillCommands: async () => skills,
      getCharBudget: () => 4000,
      logEvent: (e, m) => eventos.push([e, m]),
    })

    const cargados = eventos.filter(([e]) => e === 'tengu_skill_loaded')
    expect(cargados.length).toBe(2)
    expect(cargados[0]![1]).toEqual({
      _PROTO_skill_name: 'sphinx',
      skill_source: 'project',
      skill_loaded_from: '.claude/skills/sphinx',
      skill_budget: 4000,
      skill_kind: 'markdown',
    })
    // Sin `kind`, la clave skill_kind no se agrega (spread condicional).
    expect(cargados[1]![1]).not.toHaveProperty('skill_kind')
  })

  test('emite tengu_skill_budget_truncated cuando el modo no es "fits"', async () => {
    const eventos: [string, Record<string, unknown>][] = []
    await logSkillsLoaded('/repo', 1000, {
      getSkillCommands: async () => skills,
      computeSkillsBudgetStats: () => ({
        budgetMode: 'truncated',
        cappedSkills: [1],
        budgetTruncatedSkills: [1, 2],
      }),
      logEvent: (e, m) => eventos.push([e, m]),
    })

    const truncado = eventos.find(([e]) => e === 'tengu_skill_budget_truncated')
    expect(truncado).toBeDefined()
    expect(truncado![1]).toEqual({
      budget_mode: 'truncated',
      capped_count: 1,
      truncated_count: 2,
      skill_total: 3,
    })
  })

  test('con budgetMode "fits" y sin capped/truncated, NO emite el segundo evento', async () => {
    const eventos: [string, Record<string, unknown>][] = []
    await logSkillsLoaded('/repo', 1000, {
      getSkillCommands: async () => skills,
      logEvent: (e, m) => eventos.push([e, m]),
    })
    expect(eventos.some(([e]) => e === 'tengu_skill_budget_truncated')).toBe(false)
  })

  test('si el cómputo del presupuesto lanza, no bloquea — no se propaga', async () => {
    let resolvio = false
    await logSkillsLoaded('/repo', 1000, {
      getSkillCommands: async () => skills,
      computeSkillsBudgetStats: () => {
        throw new Error('boom')
      },
    })
    resolvio = true
    expect(resolvio).toBe(true)
  })
})
