/**
 * El TTL de caché de un agente se DERIVA del mecanismo, no se recuerda.
 *
 * MITAD ROJA, medida antes de escribir el módulo:
 *
 *     grep -rn chooseCacheTtl src/ --include=*.ts | grep -v __tests__
 *       provider/src/cost/policy.ts:143  (la definición)
 *       agent/index.ts:53                (la reexportación)
 *     grep -rl cacheTtl .claude/agents/*.md   ->  0 de 0
 *
 * El mecanismo estaba construido, exportado y probado — y NINGÚN consumidor
 * decidía nada con él. Es la misma forma que `wiring_drift` tenía en
 * `user_wiring.py`: capacidad muerta, que es el defecto que
 * `flow-selection-agile.md` describe.
 *
 * DEC-04 reparte las dos mitades: el MECANISMO —cómo se elige un TTL a partir
 * del modelo y del hueco entre turnos— es del proveedor y ya vive en
 * `policy.chooseCacheTtl`; el PARÁMETRO —cuánto hueco tiene ESTE agente— lo
 * declara quien define el agente. Este módulo es sólo el enlace, y por eso no
 * reimplementa la regla: si el umbral de los 5 minutos cambiara en `policy`,
 * aquí no habría nada que tocar.
 *
 * CONTROL DE ANULACIÓN: el caso 4 es el que mide que la derivación NO adivina.
 * Con `model: 'inherit'` el tier de precio es desconocido —`pricingOf` lanza—
 * y elegir un default sería publicar una decisión que nadie tomó. Si
 * `resolveCacheTtl` devolviera un TTL ahí, sólo el caso 4 caería.
 */
import { describe, expect, test } from 'bun:test'
import { resolveCacheTtl, resolveRequestCacheTtl } from '../cacheTtl.ts'
import { toMarkdown } from '../emit/markdown.ts'
import type { AgentDefinition } from '../types.ts'

const base: AgentDefinition = {
  name: 'sonda',
  description: 'agente de prueba',
  prompt: 'cuerpo',
  model: 'claude-sonnet-5',
}

describe('resolveCacheTtl — el enlace entre la definición y el mecanismo', () => {
  test('1. sin hueco declarado y sin TTL explícito no inventa ninguno', () => {
    expect(resolveCacheTtl(base).ttl).toBeUndefined()
  })

  test('2. delega en chooseCacheTtl: el umbral vive en policy, no aquí', () => {
    expect(resolveCacheTtl({ ...base, expectedGapMinutes: 2 }).ttl).toBe('5m')
    expect(resolveCacheTtl({ ...base, expectedGapMinutes: 30 }).ttl).toBe('1h')
    // Por encima de la hora no sobrevive ninguna caché: la prima no compra nada.
    expect(resolveCacheTtl({ ...base, expectedGapMinutes: 90 }).ttl).toBe('5m')
  })

  test('3. un TTL declarado GANA sobre el derivado', () => {
    const r = resolveCacheTtl({
      ...base, expectedGapMinutes: 30, experimental: { cacheTtl: '5m' },
    })
    expect(r.ttl).toBe('5m')
    expect(r.why).toContain('declarado')
  })

  test('4. CONTROL — con `inherit` REHÚSA derivar en vez de adivinar', () => {
    const r = resolveCacheTtl({ ...base, model: 'inherit', expectedGapMinutes: 30 })
    expect(r.ttl).toBeUndefined()
    expect(r.why).toContain('inherit')
  })

  test('5. un modelo fuera del catálogo tampoco se adivina', () => {
    const r = resolveCacheTtl({ ...base, model: 'claude-inexistente-9' as never,
                               expectedGapMinutes: 30 })
    expect(r.ttl).toBeUndefined()
    expect(r.why).toContain('catálogo')
  })
})

describe('el emisor consume la derivación', () => {
  test('6. un agente con hueco declarado emite su bloque experimental', () => {
    const md = toMarkdown({ ...base, expectedGapMinutes: 30 }, '2026-01-01T00:00:00Z')
    expect(md).toContain('experimental:')
    expect(md).toContain('cacheTtl: "1h"')
  })

  test('7. y uno sin hueco ni TTL sigue sin emitirlo', () => {
    expect(toMarkdown(base, '2026-01-01T00:00:00Z')).not.toContain('experimental:')
  })

  test('8. `expectedGapMinutes` NO es clave de frontmatter', () => {
    // Es el parámetro que alimenta la derivación, no algo que el cliente lea.
    expect(toMarkdown({ ...base, expectedGapMinutes: 30 }, '2026-01-01T00:00:00Z'))
      .not.toContain('expectedGapMinutes')
  })
})

describe('resolveRequestCacheTtl — el TTL de UNA petición, siempre decidido', () => {
  const pedido = { model: 'claude-sonnet-5', source: 'sdk' as const }

  test('5. sin TTL declarado ni hueco, el default del origen: sdk 1h, subagente 5m', () => {
    expect(resolveRequestCacheTtl(pedido).ttl).toBe('1h')
    expect(resolveRequestCacheTtl({ ...pedido, source: 'agent:custom' }).ttl).toBe('5m')
  })

  test('6. un hueco declarado gana sobre el origen: turnos seguidos no pagan la prima de 1h', () => {
    const r = resolveRequestCacheTtl({ ...pedido, expectedGapMinutes: 2 })
    expect(r.ttl).toBe('5m')
    expect(r.why).toContain('turnos seguidos')
  })

  test('7. el TTL declarado gana sobre el hueco y sobre el origen', () => {
    expect(resolveRequestCacheTtl({ ...pedido, declared: '5m', expectedGapMinutes: 30 }).ttl).toBe('5m')
  })

  test('8. un modelo fuera del catálogo no revienta: cae al origen y lo dice', () => {
    const r = resolveRequestCacheTtl({ ...pedido, model: 'claude-desconocido', expectedGapMinutes: 2 })
    expect(r.ttl).toBe('1h')
    expect(r.why).toContain('sdk')
  })
})

// La cadena del ejecutable (`QCt`) va antes de lo declarado: una variable
// `THYROX_*` gana a la definición y al hueco, como `CLAUDE_CODE_*` en 2.1.282.
describe('resolveRequestCacheTtl — el entorno THYROX_* por encima de la definición', () => {
  const pedido = { model: 'claude-sonnet-5', source: 'sdk' } as const
  test('la variable de la conversación principal gana a lo declarado y la razón es env', () => {
    const r = resolveRequestCacheTtl({ ...pedido, declared: '1h', env: { THYROX_CODE_PROMPT_CACHE_TTL: '5m' } })
    expect([r.ttl, r.why]).toEqual(['5m', 'env: THYROX_CODE_PROMPT_CACHE_TTL (5m)'])
  })
  test('un subagente lee su propia variable, no la de la principal', () => {
    const env = { THYROX_CODE_PROMPT_CACHE_TTL: '5m', THYROX_CODE_SUBAGENT_PROMPT_CACHE_TTL: '1h' }
    expect(resolveRequestCacheTtl({ ...pedido, source: 'agent:custom', env }).ttl).toBe('1h')
  })
  test('forzar 5m gana a la variable', () => {
    const env = { THYROX_FORCE_PROMPT_CACHING_5M: '1', THYROX_CODE_PROMPT_CACHE_TTL: '1h' }
    expect(resolveRequestCacheTtl({ ...pedido, env }).ttl).toBe('5m')
  })
  test('sin variables, lo declarado sigue decidiendo con su razón de siempre', () => {
    const r = resolveRequestCacheTtl({ ...pedido, declared: '5m', env: {} })
    expect([r.ttl, r.why]).toEqual(['5m', 'TTL declarado en la definición (5m)'])
  })
  test('un valor ilegible lanza nombrando la variable', () => {
    expect(() => resolveRequestCacheTtl({ ...pedido, env: { THYROX_CODE_PROMPT_CACHE_TTL: '30m' } }))
      .toThrow('THYROX_CODE_PROMPT_CACHE_TTL')
  })
})
