/**
 * Cableado de la herramienta `Skill` en el binario (board #49).
 *
 * Fuente: diseño nativo. `skillTool` estaba probado a nivel de herramienta
 * (`skillTool.test.ts`) pero el control de que `bin/harness.ts` LA CABLEA sólo
 * lo da un e2e que conduce un `tool_use` de `Skill` por `main()`. El modelo
 * grabado pide el skill `sphinx`; el bucle lo resuelve por el `SkillRegistry`
 * empaquetado (`registerBundledSkills`), y su prompt vuelve como `tool_result`.
 *
 * El control que discrimina (sub-patrón D de `metrica-decide-la-conclusion.md`):
 * el transcript contiene una frase REAL del `SKILL.md` de sphinx —«Sphinx
 * Documentation Builder»—. Si el cableado de `skillTool(buildSkillRegistry())`
 * se borra de `bin/harness.ts`, el bucle responde «herramienta desconocida:
 * Skill» (`loop.ts:396`) y la frase no aparece — el test cae. Ese es el par
 * que `skillTool.test.ts` no puede cubrir: aquél prueba la herramienta, éste
 * prueba que la CLI la compone.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../bin/harness.ts'
import type { AssistantTurn } from '../src/types.ts'

const usage = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }

// Dos turnos, en el orden en que el RecordedProvider los consume:
//   0 el modelo usa la herramienta Skill
//   1 recibe el tool_result (el prompt del skill) y cierra
function skillRecording(): AssistantTurn[] {
  return [
    {
      id: 'm-1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: usage,
      content: [{ type: 'tool_use', id: 'tu-1', name: 'Skill', input: { skill: 'sphinx' } }],
    },
    {
      id: 'm-2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: usage,
      content: [{ type: 'text', text: 'segui el procedimiento del skill' }],
    },
  ]
}

function transcriptText(dir: string): string {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n')
}

describe('cableado de Skill en bin/harness.ts (board #49)', () => {
  test('main(): el modelo invoca Skill y el prompt del skill vuelve como tool_result', async () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-skill-'))
    const rec = join(d, 'grabacion.json')
    writeFileSync(rec, JSON.stringify(skillRecording()))
    const tdir = join(d, 'transcripts')

    const code = await main([
      '--prompt', 'documenta con sphinx',
      '--provider', 'recorded', '--grabacion', rec,
      '--transcript-dir', tdir,
      '--output-style', 'quiet',
    ])
    expect(code).toBe(0)

    const t = transcriptText(tdir)
    // El control: la frase REAL del SKILL.md de sphinx sólo aparece si el
    // tool_use `Skill` se resolvio por el registry cableado; si no, el bucle
    // habria respondido «herramienta desconocida: Skill».
    expect(t).toContain('Sphinx Documentation Builder')
    expect(t).not.toContain('herramienta desconocida: Skill')
  })
})
