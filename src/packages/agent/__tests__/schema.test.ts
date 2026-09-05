// Suite del esquema — TDD: se escribe antes que `src/schema.ts`.
//
// El contrato NO se copia de un corpus: se deriva del ejecutable vendorizado
// `_references/claude-code-bin/2.1.250/claude_strings.txt`, delimitado por balanceo
// en `.claude/eventos/implementar-agent-ts-20260829T001415/`. Son 18 claves,
// no 15 — `observer`, `observerMessage` y `observeSubagents` faltaban.
import { describe, expect, test } from 'bun:test'
import {
  AGENT_JSON_KEYS,
  AgentJsonSchema,
  EFFORT_LEVELS,
  ISOLATION_MODES,
  MEMORY_SCOPES,
  parseAgentJson,
} from '../src/schema.ts'

const valid = { description: 'Un agente de prueba', prompt: 'Haz el trabajo.' }

describe('el universo de claves sale del ejecutable, no de memoria', () => {
  test('declara las 18 claves medidas, en el orden de la fuente', () => {
    expect(AGENT_JSON_KEYS).toEqual([
      'description', 'tools', 'disallowedTools', 'prompt', 'model', 'effort',
      'permissionMode', 'mcpServers', 'hooks', 'maxTurns', 'skills',
      'initialPrompt', 'memory', 'background', 'isolation',
      'observer', 'observerMessage', 'observeSubagents',
    ])
  })

  test('el esquema de zod expone exactamente esas claves', () => {
    expect(Object.keys(AgentJsonSchema.shape).sort())
      .toEqual([...AGENT_JSON_KEYS].sort())
  })

  test('los tres enums son los del binario', () => {
    expect(EFFORT_LEVELS).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(MEMORY_SCOPES).toEqual(['user', 'project', 'local'])
    expect(ISOLATION_MODES).toEqual(['worktree', 'remote'])
  })
})

describe('acepta lo que el binario acepta', () => {
  test('el mínimo son description y prompt', () => {
    expect(parseAgentJson(valid).ok).toBe(true)
  })

  test('model admite el literal inherit', () => {
    expect(parseAgentJson({ ...valid, model: 'inherit' }).ok).toBe(true)
  })

  test('model se normaliza a minúscula, como el transform de la fuente', () => {
    const r = parseAgentJson({ ...valid, model: 'INHERIT' })
    expect(r.ok && r.value.model).toBe('inherit')
  })

  test('effort admite el nivel nombrado y el entero', () => {
    expect(parseAgentJson({ ...valid, effort: 'low' }).ok).toBe(true)
    expect(parseAgentJson({ ...valid, effort: 4096 }).ok).toBe(true)
  })
})

// CONTROLES NEGATIVOS — un esquema que nunca rechaza no discrimina, y su verde
// no distingue «la definición es válida» de «el validador no pregunta»
// (sub-patrón D de metrica-decide-la-conclusion.md).
describe('rechaza lo que el binario rechaza', () => {
  test('description vacía — .min(1) en la fuente', () => {
    expect(parseAgentJson({ ...valid, description: '' }).ok).toBe(false)
  })

  test('prompt vacío — .min(1) en la fuente', () => {
    expect(parseAgentJson({ ...valid, prompt: '' }).ok).toBe(false)
  })

  test('maxTurns cero — .positive() en la fuente', () => {
    expect(parseAgentJson({ ...valid, maxTurns: 0 }).ok).toBe(false)
  })

  test('maxTurns fraccionario — .int() en la fuente', () => {
    expect(parseAgentJson({ ...valid, maxTurns: 1.5 }).ok).toBe(false)
  })

  test('memory fuera del enum', () => {
    expect(parseAgentJson({ ...valid, memory: 'global' }).ok).toBe(false)
  })

  test('isolation fuera del enum', () => {
    expect(parseAgentJson({ ...valid, isolation: 'container' }).ok).toBe(false)
  })

  test('effort fuera del enum y no entero', () => {
    expect(parseAgentJson({ ...valid, effort: 'turbo' }).ok).toBe(false)
  })

  test('sin prompt no pasa', () => {
    expect(parseAgentJson({ description: 'solo descripción' }).ok).toBe(false)
  })
})
