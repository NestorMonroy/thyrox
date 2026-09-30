/**
 * `/pause-memory` (2.1.281, `fOo` + `chunk-69mye76c.js`): alterna la pausa y
 * responde con el texto del binario.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { isMemoryPaused, setMemoryPaused } from '@thyrox/memory/memoryPause'
import pauseMemory from '../index.ts'
import { call } from '../pauseMemory.ts'

afterEach(() => setMemoryPaused(false))

describe('/pause-memory', () => {
  test('metadata del binario, deshabilitado como en 2.1.281', () => {
    expect(pauseMemory.name).toBe('pause-memory')
    expect(pauseMemory.aliases).toEqual(['memory-pause', 'toggle-memory'])
    expect(pauseMemory.description).toBe('Pause automemory for this session')
    expect(pauseMemory.isEnabled()).toBe(false)
    expect(pauseMemory.supportsNonInteractive).toBe(true)
  })
  test('alterna la pausa y devuelve el texto de cada estado', async () => {
    const paused = await call('', {} as never)
    expect(isMemoryPaused()).toBe(true)
    expect(paused).toEqual({
      type: 'text',
      value: 'Memory paused for this session · this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.\n\nRun /pause-memory again to resume.',
    })
    const resumed = await call('', {} as never)
    expect(isMemoryPaused()).toBe(false)
    expect(resumed).toEqual({ type: 'text', value: 'Memory resumed · memory content may be referenced and new memories can be saved.' })
  })
})
