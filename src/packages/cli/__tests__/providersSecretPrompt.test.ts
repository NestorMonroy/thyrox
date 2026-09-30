/**
 * El prompt oculto de una credencial: escribe la pregunta, lee sin eco en
 * modo crudo hasta Enter, respeta el retroceso, cancela con Ctrl-C y deja la
 * terminal como estaba.
 */
import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'

import { promptHidden } from '../src/commands/providers/secretPrompt.ts'

function terminal() {
  const input = Object.assign(new EventEmitter(), {
    rawModes: [] as boolean[],
    setRawMode(mode: boolean) { this.rawModes.push(mode) },
    resume() {},
    pause() {},
  })
  const written: string[] = []
  const output = { write: (text: string) => void written.push(text) }
  return { input, output, written }
}

describe('the hidden prompt', () => {
  test('reads without echo until Enter, honours backspace, and restores the terminal', async () => {
    const t = terminal()
    const answer = promptHidden('Secret: ', t.input, t.output)
    t.input.emit('data', Buffer.from('sk-ab'))
    t.input.emit('data', Buffer.from('\x7f'))
    t.input.emit('data', Buffer.from('c\r'))
    expect(await answer).toBe('sk-ac')
    expect(t.written).toEqual(['Secret: ', '\n'])
    expect(t.input.rawModes).toEqual([true, false])
    expect(t.input.listenerCount('data')).toBe(0)
  })

  test('Ctrl-C rejects and still restores the terminal', async () => {
    const t = terminal()
    const answer = promptHidden('Secret: ', t.input, t.output)
    t.input.emit('data', Buffer.from('ab\x03'))
    // Acotado: sin la cancelación la promesa quedaría pendiente y la prueba colgaría en vez de fallar.
    await expect(Promise.race([answer, Bun.sleep(100).then(() => 'still waiting')])).rejects.toThrow('Credential prompt cancelled.')
    expect(t.input.rawModes).toEqual([true, false])
    expect(t.input.listenerCount('data')).toBe(0)
  })
})
