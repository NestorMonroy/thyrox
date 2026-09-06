import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_UPLOAD_CONCURRENCY,
  FILE_COUNT_LIMIT,
  type FailedPersistence,
  type FilesPersistedEventData,
  OUTPUTS_SUBDIR,
  type PersistedFile,
  type TurnStartTime,
} from '../types.js'

describe('constantes de filePersistence', () => {
  test('FILE_COUNT_LIMIT es el tope de archivos por corrida', () => {
    expect(FILE_COUNT_LIMIT).toBe(10000)
  })

  test('OUTPUTS_SUBDIR es el subdirectorio relativo de salidas', () => {
    expect(OUTPUTS_SUBDIR).toBe('.claude-code-how-works-how-works/outputs')
  })

  test('DEFAULT_UPLOAD_CONCURRENCY es 5', () => {
    expect(DEFAULT_UPLOAD_CONCURRENCY).toBe(5)
  })
})

describe('formas de los tipos exportados', () => {
  test('FailedPersistence: filename + error', () => {
    const f: FailedPersistence = { filename: 'a.txt', error: 'boom' }
    expect(f.filename).toBe('a.txt')
    expect(f.error).toBe('boom')
  })

  test('PersistedFile: filename + file_id', () => {
    const p: PersistedFile = { filename: 'a.txt', file_id: 'file_123' }
    expect(p.file_id).toBe('file_123')
  })

  test('FilesPersistedEventData compone listas de PersistedFile y FailedPersistence', () => {
    const data: FilesPersistedEventData = {
      files: [{ filename: 'a.txt', file_id: 'f1' }],
      failed: [{ filename: 'b.txt', error: 'boom' }],
    }
    expect(data.files).toHaveLength(1)
    expect(data.failed).toHaveLength(1)
  })

  test('TurnStartTime envuelve el timestamp en un objeto (no un numero pelado)', () => {
    const t: TurnStartTime = { turnStartTime: 12345 }
    expect(t.turnStartTime).toBe(12345)
    // Documenta el bug historico que esto previene (ver filePersistence.ts):
    // comparar `t >= turnStartTime` con `t` un numero y `turnStartTime` este
    // objeto da NaN si se olvida `.turnStartTime`.
    expect(Number(t as unknown as number)).toBeNaN()
  })
})
