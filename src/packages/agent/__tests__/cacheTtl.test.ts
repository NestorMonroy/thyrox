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
import { resolveCacheTtl } from '../cacheTtl.ts'
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
