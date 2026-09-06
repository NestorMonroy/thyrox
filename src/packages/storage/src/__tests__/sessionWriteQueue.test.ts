import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { SessionWriteQueue } from '../sessionWriteQueue.js'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let dir: string
let queue: SessionWriteQueue<{ type: string; n?: number }>

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'session-write-queue-'))
  queue = new SessionWriteQueue()
})

afterEach(async () => {
  queue.resetForTesting()
  await rm(dir, { recursive: true, force: true })
})

describe('enqueue + flush', () => {
  test('una entrada llega al archivo como una línea JSONL', async () => {
    const filePath = join(dir, 'sesion.jsonl')
    await queue.enqueue(filePath, { type: 'a' })
    await queue.flush()

    expect(await readFile(filePath, 'utf-8')).toBe('{"type":"a"}\n')
  })

  test('varias entradas al mismo archivo se apendan en orden', async () => {
    const filePath = join(dir, 'sesion.jsonl')
    await Promise.all([
      queue.enqueue(filePath, { type: 'a', n: 1 }),
      queue.enqueue(filePath, { type: 'b', n: 2 }),
      queue.enqueue(filePath, { type: 'c', n: 3 }),
    ])
    await queue.flush()

    expect(await readFile(filePath, 'utf-8')).toBe(
      '{"type":"a","n":1}\n{"type":"b","n":2}\n{"type":"c","n":3}\n',
    )
  })

  test('crea el directorio si no existe todavía', async () => {
    const filePath = join(dir, 'anidado', 'profundo', 'sesion.jsonl')
    await queue.enqueue(filePath, { type: 'x' })
    await queue.flush()
    expect(await readFile(filePath, 'utf-8')).toBe('{"type":"x"}\n')
  })

  test('archivos distintos se drenan de forma independiente', async () => {
    const fileA = join(dir, 'a.jsonl')
    const fileB = join(dir, 'b.jsonl')
    await Promise.all([
      queue.enqueue(fileA, { type: 'solo-a' }),
      queue.enqueue(fileB, { type: 'solo-b' }),
    ])
    await queue.flush()

    expect(await readFile(fileA, 'utf-8')).toBe('{"type":"solo-a"}\n')
    expect(await readFile(fileB, 'utf-8')).toBe('{"type":"solo-b"}\n')
  })

  test('cada enqueue resuelve individualmente aunque compartan lote', async () => {
    const filePath = join(dir, 'sesion.jsonl')
    const resolved: string[] = []
    const p1 = queue.enqueue(filePath, { type: 'a' }).then(() => resolved.push('a'))
    const p2 = queue.enqueue(filePath, { type: 'b' }).then(() => resolved.push('b'))
    await queue.flush()
    await Promise.all([p1, p2])

    expect(resolved.sort()).toEqual(['a', 'b'])
  })
})

describe('drenado automático por timer (sin llamar flush explícito)', () => {
  test('con un intervalo corto, la entrada llega al archivo sola', async () => {
    queue.setFlushIntervalMs(10)
    const filePath = join(dir, 'sesion.jsonl')
    void queue.enqueue(filePath, { type: 'automatico' })

    await sleep(60)

    expect(await readFile(filePath, 'utf-8')).toBe('{"type":"automatico"}\n')
  })
})

describe('trackWrite', () => {
  test('flush() espera a que termine una escritura rastreada fuera de la cola', async () => {
    let markedDone = false
    const tracked = queue.trackWrite(async () => {
      await sleep(30)
      markedDone = true
    })

    const flushed = queue.flush()
    await flushed
    await tracked

    expect(markedDone).toBe(true)
  })

  test('trackWrite propaga el valor de retorno y el error de fn', async () => {
    expect(await queue.trackWrite(async () => 42)).toBe(42)
    await expect(
      queue.trackWrite(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
  })
})

describe('resetForTesting', () => {
  test('deja la cola en un estado limpio — flush() posterior resuelve de inmediato', async () => {
    const filePath = join(dir, 'sesion.jsonl')
    void queue.enqueue(filePath, { type: 'se-pierde' })
    queue.resetForTesting()

    await queue.flush()
    // El archivo puede no existir en absoluto — el enqueue se descartó al resetear.
    await expect(readFile(filePath, 'utf-8')).rejects.toThrow()
  })
})
