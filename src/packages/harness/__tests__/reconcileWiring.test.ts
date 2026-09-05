/**
 * Cableado de la reconciliación en el arranque (T-095).
 *
 * `openSession` con `resume` NO relee el transcript en crudo: lo pasa por el
 * pipeline del bloque 21. El control anulado de las funciones puras vive en
 * `reconcile.test.ts`; aquí se prueba que el arranque las USA.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSession } from '../src/session.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'rw-'))
const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

describe('openSession reconcilia al reanudar (T-095)', () => {
  test('una sesión nueva no trae veredicto de reconciliación', () => {
    const d = dir()
    const s = openSession({ cwd: d, transcriptDir: d })
    expect(s.reconcile).toBeUndefined()
  })

  test('al reanudar, `previous` respeta la última frontera de compactación', () => {
    const d = dir()
    const s = openSession({ cwd: d, transcriptDir: d })
    s.transcript.appendUser('viejo')
    s.transcript.appendAssistant({ id: 'm1', model: 'claude-opus-5', content: [{ type: 'text', text: 'r' }] }, uso)
    s.transcript.appendCompactBoundary({ trigger: 'auto', preTokens: 100, postTokens: 10 })
    s.transcript.appendUser('nuevo')
    const re = openSession({ cwd: d, transcriptDir: d, resume: s.id })
    // sólo el turno posterior a la frontera, no los cuatro
    expect(re.previous.length).toBe(1)
    expect(JSON.stringify(re.previous)).toContain('nuevo')
  })

  test('al reanudar, un tool_use huérfano se retira y se cuenta', () => {
    const d = dir()
    const s = openSession({ cwd: d, transcriptDir: d })
    s.transcript.appendUser('pide')
    s.transcript.appendAssistant({ id: 'm1', model: 'claude-opus-5', content: [{ type: 'tool_use', id: 'huerfano', name: 'Bash', input: {} }] }, uso)
    const re = openSession({ cwd: d, transcriptDir: d, resume: s.id })
    expect(re.reconcile?.rescuedToolUses).toBe(1)
    expect(JSON.stringify(re.previous)).not.toContain('tool_use')
  })

  test('el veredicto trae la época y el último turno', () => {
    const d = dir()
    const s = openSession({ cwd: d, transcriptDir: d })
    s.transcript.appendUser('previo')
    s.transcript.appendAssistant({ id: 'm1', model: 'claude-opus-5', content: [{ type: 'text', text: 'r' }] }, uso)
    s.transcript.appendUser('sin respuesta')
    const re = openSession({ cwd: d, transcriptDir: d, resume: s.id })
    expect(re.reconcile?.lastTurn).toBe('interrupted_prompt')
    expect(typeof re.reconcile?.epoch).toBe('number')
    expect(re.reconcile?.priorWorker).toBe(re.reconcile!.epoch > 1)
  })
})
