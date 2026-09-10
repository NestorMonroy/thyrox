/**
 * Porte de `ccnmt: packages/agent/__tests__/tokenStatsToStatsigMetrics.test.ts`.
 *
 * Transformación pura de la forma interna TokenStats a un registro plano de
 * métricas enviado a Statsig.
 *
 * Una aritmética de porcentaje incorrecta = paneles de observabilidad
 * engañosos (p. ej. "los tokens de resultado de herramienta dominan" cuando
 * no es así), lo que puede llevar a esfuerzo de optimización mal asignado.
 *
 * Generación incorrecta de clave dinámica (`tool_request_${tool}_tokens`) =
 * colisiones de clave con métricas incorporadas, o métricas faltantes para
 * nombres de herramienta con caracteres especiales.
 */
import { describe, expect, test } from 'bun:test'
import { tokenStatsToStatsigMetrics } from '../contextAnalysis.js'

type TokenStats = Parameters<typeof tokenStatsToStatsigMetrics>[0]

const empty = (): TokenStats => ({
  toolRequests: new Map(),
  toolResults: new Map(),
  humanMessages: 0,
  assistantMessages: 0,
  localCommandOutputs: 0,
  other: 0,
  attachments: new Map(),
  duplicateFileReads: new Map(),
  total: 0,
})

describe('tokenStatsToStatsigMetrics — empty stats', () => {
  test('all-zero stats → fixed keys with 0 values, no percentages', () => {
    const r = tokenStatsToStatsigMetrics(empty())
    expect(r.total_tokens).toBe(0)
    expect(r.human_message_tokens).toBe(0)
    expect(r.assistant_message_tokens).toBe(0)
    expect(r.local_command_output_tokens).toBe(0)
    expect(r.other_tokens).toBe(0)
    expect(r.duplicate_read_tokens).toBe(0)
    expect(r.duplicate_read_file_count).toBe(0)
  })

  test('total=0 → no percentage keys emitted (avoid div-by-zero)', () => {
    const r = tokenStatsToStatsigMetrics(empty())
    // Contrato documentado: las claves de porcentaje sólo se añaden
    // cuando total > 0.
    expect(r.human_message_percent).toBeUndefined()
    expect(r.tool_request_percent).toBeUndefined()
    expect(r.duplicate_read_percent).toBeUndefined()
  })
})

describe('tokenStatsToStatsigMetrics — basic counts', () => {
  test('humanMessages + assistantMessages → metric values', () => {
    const stats: TokenStats = {
      ...empty(),
      humanMessages: 100,
      assistantMessages: 200,
      total: 300,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.human_message_tokens).toBe(100)
    expect(r.assistant_message_tokens).toBe(200)
  })

  test('total > 0 enables percentage emission', () => {
    const stats: TokenStats = {
      ...empty(),
      humanMessages: 100,
      assistantMessages: 300,
      total: 400,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.human_message_percent).toBe(25)
    expect(r.assistant_message_percent).toBe(75)
  })
})

describe('tokenStatsToStatsigMetrics — attachment counts', () => {
  test('attachments produces count keys per type', () => {
    const stats: TokenStats = {
      ...empty(),
      attachments: new Map([
        ['file', 3],
        ['image', 1],
      ]),
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.attachment_file_count).toBe(3)
    expect(r.attachment_image_count).toBe(1)
  })

  test('empty attachments map → no attachment_*_count keys', () => {
    const r = tokenStatsToStatsigMetrics(empty())
    const attachmentKeys = Object.keys(r).filter(k =>
      k.startsWith('attachment_'),
    )
    expect(attachmentKeys).toEqual([])
  })
})

describe('tokenStatsToStatsigMetrics — tool request/result tokens', () => {
  test('toolRequests Map → per-tool token keys', () => {
    const stats: TokenStats = {
      ...empty(),
      toolRequests: new Map([
        ['Bash', 100],
        ['Edit', 50],
      ]),
      total: 150,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.tool_request_Bash_tokens).toBe(100)
    expect(r.tool_request_Edit_tokens).toBe(50)
  })

  test('toolResults map → per-tool result token keys', () => {
    const stats: TokenStats = {
      ...empty(),
      toolResults: new Map([['Bash', 200]]),
      total: 200,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.tool_result_Bash_tokens).toBe(200)
  })

  test('per-tool percentages (total > 0)', () => {
    const stats: TokenStats = {
      ...empty(),
      toolRequests: new Map([
        ['Bash', 30],
        ['Edit', 20],
      ]),
      total: 100,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.tool_request_Bash_percent).toBe(30)
    expect(r.tool_request_Edit_percent).toBe(20)
  })

  test('aggregate tool_request_percent / tool_result_percent', () => {
    const stats: TokenStats = {
      ...empty(),
      toolRequests: new Map([
        ['Bash', 30],
        ['Edit', 20],
      ]),
      toolResults: new Map([
        ['Bash', 40],
      ]),
      total: 100,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.tool_request_percent).toBe(50) // 30+20 de 100
    expect(r.tool_result_percent).toBe(40)
  })
})

describe('tokenStatsToStatsigMetrics — duplicate file reads', () => {
  test('duplicateFileReads → aggregate token sum + file count', () => {
    const stats: TokenStats = {
      ...empty(),
      duplicateFileReads: new Map([
        ['/a.ts', { count: 3, tokens: 100 }],
        ['/b.ts', { count: 2, tokens: 50 }],
      ]),
      total: 1000,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.duplicate_read_tokens).toBe(150)
    expect(r.duplicate_read_file_count).toBe(2)
  })

  test('duplicate_read_percent computed against total', () => {
    const stats: TokenStats = {
      ...empty(),
      duplicateFileReads: new Map([['/x.ts', { count: 2, tokens: 250 }]]),
      total: 1000,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.duplicate_read_percent).toBe(25)
  })

  test('empty duplicateFileReads → 0 tokens, 0 file count', () => {
    const stats: TokenStats = { ...empty(), total: 100 }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.duplicate_read_tokens).toBe(0)
    expect(r.duplicate_read_file_count).toBe(0)
    expect(r.duplicate_read_percent).toBe(0)
  })
})

describe('tokenStatsToStatsigMetrics — rounding', () => {
  test('percentages use Math.round (not floor or ceil)', () => {
    // 33/100 = 33%, 34/100 = 34%; 33.5 debe redondear a 34.
    const stats: TokenStats = {
      ...empty(),
      humanMessages: 335,
      total: 1000,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.human_message_percent).toBe(34) // Math.round(33.5)
  })

  test('percentages with .49 round down', () => {
    const stats: TokenStats = {
      ...empty(),
      humanMessages: 334,
      total: 1000,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.human_message_percent).toBe(33) // Math.round(33.4)
  })
})

describe('tokenStatsToStatsigMetrics — output shape', () => {
  test('always includes the 5 fixed core keys', () => {
    const r = tokenStatsToStatsigMetrics(empty())
    expect('total_tokens' in r).toBe(true)
    expect('human_message_tokens' in r).toBe(true)
    expect('assistant_message_tokens' in r).toBe(true)
    expect('local_command_output_tokens' in r).toBe(true)
    expect('other_tokens' in r).toBe(true)
  })

  test('all values are numbers (no NaN, no string)', () => {
    const stats: TokenStats = {
      ...empty(),
      humanMessages: 100,
      total: 100,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    for (const v of Object.values(r)) {
      expect(typeof v).toBe('number')
      expect(Number.isFinite(v)).toBe(true)
    }
  })

  test('tool name with underscore goes into key as-is', () => {
    // Sin saneamiento en esta función — responsabilidad del llamador.
    const stats: TokenStats = {
      ...empty(),
      toolRequests: new Map([['mcp__github__list', 100]]),
      total: 100,
    }
    const r = tokenStatsToStatsigMetrics(stats)
    expect(r.tool_request_mcp__github__list_tokens).toBe(100)
  })
})
