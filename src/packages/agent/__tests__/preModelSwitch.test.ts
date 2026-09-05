import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { decide } from '../bin/preModelSwitch.ts'

const BIN = join(import.meta.dir, '..', 'bin', 'preModelSwitch.ts')

// El payload es el que el ejecutable 2.1.258 declara para PreModelSwitch
// (`from_model`, `to_model`, `context_tokens`, `prompt_cache_warm`, `cache_ttl`,
// `estimated_cache_write_usd`, `pricing`); las cifras son las de la sesión medida.
const warm = {
  hook_event_name: 'PreModelSwitch',
  from_model: 'claude-fable-5-1',
  to_model: 'claude-opus-5',
  requested_model: 'opus',
  source: 'command',
  context_tokens: 508_503,
  prompt_cache_warm: true,
  cache_ttl: '1h' as const,
  estimated_cache_write_usd: 5.08503,
  pricing: 'catalog' as const,
}

describe('decide — la razón que el diálogo mostrará', () => {
  test('caché viva → ask con la reescritura y la lectura en tokens', () => {
    const out = decide(warm) as { hookSpecificOutput: Record<string, string> }
    expect(out.hookSpecificOutput.hookEventName).toBe('PreModelSwitch')
    expect(out.hookSpecificOutput.permissionDecision).toBe('ask')
    // El ejecutor pide tokens, no USD (directiva 2026-09-02): la razón cuenta
    // tokens y el múltiplo es el peso relativo del tier, adimensional.
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('508,503 tokens')
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('pesa 20× uno leído')
    expect(out.hookSpecificOutput.permissionDecisionReason).not.toContain('USD')
  })
  test('la razón no cita USD aunque el cliente mande su estimación', () => {
    const out = decide({ ...warm, estimated_cache_write_usd: 9.9, pricing: 'configured' }) as {
      hookSpecificOutput: Record<string, string>
    }
    expect(out.hookSpecificOutput.permissionDecisionReason).not.toContain('USD')
  })
  test('nombra la compactación como la palanca previa: lo que se reescribe es el contexto vivo', () => {
    // Medido 2026-09-02: compactar bajó el contexto de 787 053 a 16 743
    // tokens; el cambio aplicado diez minutos después reescribió 475 287.
    // La caché no es portable entre modelos (la clave lleva el modelo), pero
    // el resumen de la compactación sí lo es: es texto.
    const out = decide(warm) as { hookSpecificOutput: Record<string, string> }
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('compactar antes')
  })
  test('caché fría → sin opinión', () => {
    expect(decide({ ...warm, prompt_cache_warm: false })).toEqual({})
  })
  test('otro evento, mismo modelo o sin contexto → sin opinión', () => {
    expect(decide({ ...warm, hook_event_name: 'PostModelSwitch' })).toEqual({})
    expect(decide({ ...warm, to_model: 'claude-fable-5-1' })).toEqual({})
    expect(decide({ ...warm, context_tokens: 0 })).toEqual({})
  })
  test('source sdk (headless: la sesión no puede preguntar) → allow con la misma razón, no ask', () => {
    // Literal del ejecutable 2.1.258: «Model switch blocked by a PreModelSwitch
    // hook: confirmation required, and this session cannot ask». Un `ask` en una
    // sesión Remote Control/SDK equivale a denegar la decisión del ejecutor.
    const out = decide({ ...warm, source: 'sdk' }) as {
      hookSpecificOutput: Record<string, string>
      systemMessage: string
    }
    expect(out.hookSpecificOutput.permissionDecision).toBe('allow')
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('508,503 tokens')
    expect(out.systemMessage).toContain('508,503 tokens')
  })
  test('source picker y command siguen preguntando: el diálogo sí existe', () => {
    for (const source of ['picker', 'command'] as const) {
      const out = decide({ ...warm, source }) as { hookSpecificOutput: Record<string, string> }
      expect(out.hookSpecificOutput.permissionDecision).toBe('ask')
    }
  })
  test('modelo fuera del catálogo → ask, nombrando cuál falta', () => {
    const out = decide({ ...warm, to_model: 'claude-inexistente' }) as { hookSpecificOutput: Record<string, string> }
    expect(out.hookSpecificOutput.permissionDecision).toBe('ask')
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('Fuera del catálogo del paquete: claude-inexistente')
    expect(out.hookSpecificOutput.permissionDecisionReason).not.toContain('USD')
  })
})

describe('el hook como comando — stdin JSON, stdout JSON', () => {
  test('con el payload por tubería responde ask', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN], { stdin: Buffer.from(JSON.stringify(warm)) })
    expect(p.exitCode).toBe(0)
    const out = JSON.parse(p.stdout.toString())
    expect(out.hookSpecificOutput.permissionDecision).toBe('ask')
  })
  test('stdin vacío o inválido → {} y exit 0: nunca rompe el cambio', () => {
    for (const raw of ['', '{no es json']) {
      const p = Bun.spawnSync(['bun', 'run', BIN], { stdin: Buffer.from(raw) })
      expect(p.exitCode).toBe(0)
      expect(p.stdout.toString().trim()).toBe('{}')
    }
  })
})
