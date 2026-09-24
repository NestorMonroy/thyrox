/**
 * La pausa de memoria de la sesión (2.1.281: `Yh`/`E5` sobre
 * `sessionFlags.memoryToggledOff`), y su efecto en `isAutoMemoryEnabled`
 * (`Va`: `if(Yh())return!1;return Uon()`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { isMemoryPaused, setMemoryPaused } from '../memoryPause.ts'
import { isAutoMemoryEnabled } from '../paths.ts'

afterEach(() => setMemoryPaused(false))

describe('memoryPause', () => {
  test('la sesión arranca sin pausa y el indicador se reemplaza', () => {
    expect(isMemoryPaused()).toBe(false)
    setMemoryPaused(true)
    expect(isMemoryPaused()).toBe(true)
    setMemoryPaused(false)
    expect(isMemoryPaused()).toBe(false)
  })
  test('con la memoria en pausa, la memoria automática queda apagada', () => {
    const saved = process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY
    process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '0'
    try {
      expect(isAutoMemoryEnabled()).toBe(true)
      setMemoryPaused(true)
      expect(isAutoMemoryEnabled()).toBe(false)
    } finally {
      if (saved === undefined) delete process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY
      else process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = saved
    }
  })
})
