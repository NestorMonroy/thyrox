/**
 * Traducción de `@thyrox/agent` a definiciones del harness (T-036).
 *
 * Fuente del porte: las 31 definiciones de `@thyrox/agent`, que ya son la
 * fuente de verdad de los agentes del proyecto (`.claude/agents/*.md`). El test
 * fija que la traducción preserve modelo, esfuerzo y herramientas — no un
 * formato nuevo.
 */

import { thyroxRoot } from '../../../paths/reach.ts'
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AGENTS } from '@thyrox/agent'
import { agentDefinitionsFromRegistry, toHarnessDefinition } from '../src/tools/agentDefinitions.ts'
import { openSession } from '../src/session.ts'
import { runLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'compat-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string, model = 'claude-opus-5'): AssistantTurn =>
  ({ id: 'm1', model, stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })

describe('las definiciones de @thyrox/agent corren como agentes (T-036)', () => {
  test('cada definicion del paquete se traduce sin perder modelo, prompt ni herramientas', () => {
    const defs = agentDefinitionsFromRegistry(AGENTS)
    expect(Object.keys(defs).length).toBe(AGENTS.length)
    for (const a of AGENTS) {
      const d = defs[a.name]
      expect(d).toBeTruthy()
      expect(d.systemPrompt).toBe(a.prompt)
      if (a.model && a.model !== 'inherit') expect(d.model).toBe(a.model)
      if (a.maxTurns) expect(d.maxTurns).toBe(a.maxTurns)
    }
  })

  test('`inherit` NO se traduce a un modelo: el hijo hereda el del padre', () => {
    const d = toHarnessDefinition({ name: 'x', description: 'd', prompt: 'p', model: 'inherit' })
    expect(d.model).toBeUndefined()
  })

  test('una definicion sin `tools` deja al hijo con el nucleo entero', () => {
    const d = toHarnessDefinition({ name: 'x', description: 'd', prompt: 'p' })
    expect(d.tools).toBeUndefined()
  })

  test('un arreglo VACIO de tools significa ninguna, no todas', () => {
    const d = toHarnessDefinition({ name: 'x', description: 'd', prompt: 'p', tools: [] })
    expect(d.tools).toEqual([])
  })

  test('`disallowedTools` recorta el nucleo, no lo amplia', () => {
    const d = toHarnessDefinition({ name: 'x', description: 'd', prompt: 'p', disallowedTools: ['Bash', 'Write'] })
    expect(d.tools).not.toContain('Bash')
    expect(d.tools).not.toContain('Write')
    expect(d.tools).toContain('Read')
  })

  test('un agente real del paquete se despacha y devuelve su conclusion', async () => {
    const d = dir()
    const defs = agentDefinitionsFromRegistry(AGENTS)
    const nombre = AGENTS[0].name
    const p = new RecordedProvider([texto('lo que el agente concluyo', defs[nombre].model ?? 'claude-opus-5')])
    const { agentTool } = await import('../src/tools/agent.ts')
    const t = agentTool({ provider: p, transcriptDir: d, definitions: defs })
    const r = await t.run({ prompt: 'trabaja', subagent_type: nombre },
      { cwd: d, sessionId: 'padre', abort: new AbortController().signal, messages: [] })
    expect(r.isError).toBe(false)
    expect(p.requests[0].system).toBe(AGENTS[0].prompt)
  })
})

describe('la instrumentacion existente lee nuestros transcripts (T-034)', () => {
  test('model_catalog.py sesion cuenta los turnos y el uso de un transcript nuestro', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('ya')])
    const r = await runLoop({
      provider: p, model: 'claude-opus-5', system: 's', prompt: 'x',
      tools: CORE_TOOLS, cwd: d, transcriptDir: d,
    })
    const salida = Bun.spawnSync(['python3',
      join(thyroxRoot(), 'src', 'agents', 'model_catalog.py'),
      'sesion', '--transcript', r.transcriptPath])
    expect(salida.exitCode).toBe(0)
    const texto_ = salida.stdout.toString()
    expect(texto_).toContain('claude-opus-5')
  })

  test('cada linea del transcript trae los cuatro campos que el store lee', async () => {
    const d = dir()
    const r = await runLoop({
      provider: new RecordedProvider([texto('ya')]), model: 'claude-opus-5', system: 's',
      prompt: 'x', tools: CORE_TOOLS, cwd: d, transcriptDir: d,
    })
    const lineas = readFileSync(r.transcriptPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const asistente = lineas.find((l) => l.type === 'assistant')
    expect(asistente.message.model).toBe('claude-opus-5')
    for (const campo of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) {
      expect(typeof asistente.message.usage[campo]).toBe('number')
    }
    expect(typeof asistente.timestamp).toBe('string')
    expect(asistente.sessionId).toBe(r.sessionId)
  })
})

describe('los gates del proyecto corren bajo el harness (T-035)', () => {
  // El gate vive en thyrox/src/gates/; estaba en .claude/scripts/gates/.
  const REPO = thyroxRoot()

  test('un gate real se ejecuta por la herramienta Bash y devuelve su salida', async () => {
    const d = dir()
    const gate = join(REPO, 'src', 'gates', 'check_hallazgo_submodulo.py')
    const p = new RecordedProvider([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: `python3 ${JSON.stringify(gate)}` } }] },
      texto('el gate corrio'),
    ])
    const r = await runLoop({
      provider: p, model: 'claude-opus-5', system: 's', prompt: 'corre el gate',
      tools: CORE_TOOLS, cwd: REPO, transcriptDir: d,
    })
    expect(r.stop).toBe('end_turn')
    const resultado = p.requests[1].messages.flatMap((m) => m.content)
      .find((b) => b.type === 'tool_result') as { content: string; is_error?: boolean }
    // El gate publica su denominador: es la señal de que midió algo, no de que
    // el instrumento estuviera mudo.
    expect(resultado.content).toContain('alcance medido')
  })

  test('un gate que sale distinto de 0 llega al modelo COMO error, no como exito', async () => {
    const d = dir()
    const p = new RecordedProvider([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'exit 1' } }] },
      texto('lo vi'),
    ])
    await runLoop({
      provider: p, model: 'claude-opus-5', system: 's', prompt: 'x',
      tools: CORE_TOOLS, cwd: d, transcriptDir: d,
    })
    const resultado = p.requests[1].messages.flatMap((m) => m.content)
      .find((b) => b.type === 'tool_result') as { is_error?: boolean }
    expect(resultado.is_error).toBe(true)
  })

  test('la puerta de permisos puede vetar un gate sin romper el turno', async () => {
    const d = dir()
    const p = new RecordedProvider([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'git push origin main' } }] },
      texto('entendido, no lo hago'),
    ])
    const r = await runLoop({
      provider: p, model: 'claude-opus-5', system: 's', prompt: 'x',
      tools: CORE_TOOLS, cwd: d, transcriptDir: d,
      permissions: { deny: ['Bash(git push:*)'] },
    })
    expect(r.stop).toBe('end_turn')
    const resultado = p.requests[1].messages.flatMap((m) => m.content)
      .find((b) => b.type === 'tool_result') as { content: string; is_error?: boolean }
    expect(resultado.is_error).toBe(true)
    expect(resultado.content).toContain('git push')
  })
})
