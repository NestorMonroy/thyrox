/**
 * Las mitades de la recuperación de stream y del vigilante de caudal que las
 * pruebas de OmniRoute no ejercitan: cada caso cae si se retira la suya.
 */
import { expect, test } from 'bun:test'
const SR = (await import(
  process.env.STREAM_RECOVERY_MODULE ?? '../src/proxy/resilience/streamRecovery.ts'
)) as typeof import('../src/proxy/resilience/streamRecovery.ts')
const TW = (await import(
  process.env.THROUGHPUT_WATCHDOG_MODULE ?? '../src/proxy/resilience/throughputWatchdog.ts'
)) as typeof import('../src/proxy/resilience/throughputWatchdog.ts')

const enc = new TextEncoder()
const chat = (delta: Record<string, unknown>, finish: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`

/** Un stream que emite `chunks` y luego se corta. */
function cut(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) return controller.enqueue(enc.encode(chunks[i++]!))
      controller.error(new SR.TruncatedStreamError())
    },
  })
}

const closed = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })

/** Un reloj que avanza más que el plazo de retención en cada lectura: todo se compromete. */
const jumping = () => {
  let t = 0
  return () => (t += SR.STREAM_RECOVERY.HOLDBACK_MS + 1)
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ''
  for (;;) {
    const r = await reader.read()
    if (r.done) return out
    out += dec.decode(r.value, { stream: true })
  }
}

test('una cancelación del cliente nunca se reintenta, aunque su mensaje parezca de transporte', () => {
  expect(SR.isRetryableStreamError({ name: 'AbortError', message: 'terminated' })).toBe(false)
})

test('una continuación que no solapa lo emitido se toma por reinicio y no se cose', async () => {
  const outcomes: string[] = []
  const stream = SR.createRecoverableStream(cut([chat({ content: 'The quick brown fox jumps' })]), async () => null, {
    finalize: () => {},
    now: jumping(),
    maxContinuations: 1,
    continueStream: async () => closed([chat({ content: 'An unrelated sentence entirely' }, 'stop'), 'data: [DONE]\n\n']),
    onContinueOutcome: event => outcomes.push(event.outcome),
  })
  const text = await drain(stream)
  expect(outcomes[0]).toBe('overlap-reject')
  expect(text).not.toContain('unrelated')
})

test('un stop vacío sin razonamiento es un turno vacío normal: no se continúa', async () => {
  let continuations = 0
  const stream = SR.createRecoverableStream(closed([chat({ content: '' }, 'stop'), 'data: [DONE]\n\n']), async () => null, {
    finalize: () => {},
    now: jumping(),
    continueStream: async () => {
      continuations += 1
      return null
    },
  })
  await drain(stream)
  expect(continuations).toBe(0)
})

test('por debajo de minUsefulBytes el caudal no se juzga', () => {
  let now = 0
  const watchdog = TW.createThroughputWatchdog({
    enabled: true, warmupMs: 0, windowMs: 1000, minUsefulBytesPerSecond: 1000, minUsefulBytes: 100, now: () => now,
  })
  watchdog.observe(chat({ content: 'hola' }))
  now = 1000
  expect(watchdog.observe(chat({ content: 'hola' })).abort).toBe(false)
})

test('lo útil que salió de la ventana deja de contar', () => {
  let now = 0
  const watchdog = TW.createThroughputWatchdog({
    enabled: true, warmupMs: 0, windowMs: 1000, minUsefulBytesPerSecond: 1, now: () => now,
  })
  watchdog.observe(chat({ content: 'x'.repeat(100) }))
  now = 5000
  expect(watchdog.observe('event: ping\ndata: {"type":"ping"}\n\n').abort).toBe(true)
})
