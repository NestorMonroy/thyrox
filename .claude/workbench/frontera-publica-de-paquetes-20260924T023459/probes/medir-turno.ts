// Cuánto cuesta un turno del bucle con la herramienta Bash, y cuánto la
// herramienta sola, para atribuir los segundos de taskReminder.test.ts.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop } from '../../../../src/packages/agent/loop/index.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import { CORE_TOOLS } from '@thyrox/tools/registry'
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const usa = (name: string, input: Record<string, unknown>) => ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `tu${Math.random()}`, name, input }], usage: uso })
const texto = { id: 'mf', model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'fin' }], usage: uso }
const d = mkdtempSync(join(tmpdir(), 'turno-'))
const bash = CORE_TOOLS.find(t => t.name === 'Bash')!
let t0 = performance.now()
for (let i = 0; i < 5; i++) await bash.run({ command: 'true' } as any, { cwd: d, sessionId: 'x', abort: new AbortController().signal, messages: [] } as any)
console.log(`Bash sola: ${((performance.now() - t0) / 5).toFixed(0)} ms/llamada`)
for (const [nombre, turnos] of [['Bash', () => usa('Bash', { command: 'true' })], ['Glob', () => usa('Glob', { pattern: '*.nada' })]] as const) {
  const p = new RecordedProvider([...Array.from({ length: 10 }, turnos), texto] as any)
  t0 = performance.now()
  await runLoop({ cwd: d, model: 'claude-opus-5', system: 'h', tools: CORE_TOOLS, transcriptDir: d, prompt: 'x', provider: p } as any)
  console.log(`bucle con ${nombre}: ${((performance.now() - t0) / 11).toFixed(0)} ms/turno`)
}
