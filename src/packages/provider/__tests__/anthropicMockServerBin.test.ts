/**
 * El proxy local como PROCESO: el pool es shell y no puede importar
 * `startAnthropicMockServer`. Mitad roja medida antes de escribir el
 * lanzador: `ls src/packages/provider/bin` -> No such file or directory.
 *
 * Control de anulación: sin el registro por petición, el caso 1 cae en la
 * cuenta de líneas y ningún otro; sin el cierre por señal, cae el caso 2.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BIN = join(import.meta.dir, '..', 'bin', 'anthropicMockServer.ts')

async function start(log: string) {
  const proc = Bun.spawn(['bun', 'run', BIN, '--requests-log', log], { stdout: 'pipe', stderr: 'pipe' })
  const reader = proc.stdout.getReader()
  let first = ''
  while (!first.includes('\n')) {
    const { value, done } = await reader.read()
    if (done) break
    first += new TextDecoder().decode(value)
  }
  reader.releaseLock()
  return { proc, url: first.split('\n')[0].replace(/^url=/, '') }
}

describe('bin/anthropicMockServer — el proxy local para medir sin credencial real', () => {
  test('1. imprime su URL de loopback, responde la Messages API y registra cada petición', async () => {
    const log = join(mkdtempSync(join(tmpdir(), 'mock-bin-')), 'requests.log')
    const { proc, url } = await start(log)
    try {
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
      const res = await fetch(`${url}/v1/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'local' },
        body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 8, messages: [] }),
      })
      const body = await res.json() as { model: string; stop_reason: string }
      expect([body.model, body.stop_reason]).toEqual(['claude-sonnet-5', 'end_turn'])
      // La CLASE de credencial que llegó, nunca su valor: quien lo lanza comprueba
      // que el ítem no le trajo la del anfitrión.
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual(['POST /v1/messages claude-sonnet-5 auth=x-api-key'])
    } finally {
      proc.kill('SIGTERM')
      await proc.exited
    }
  })

  // La señal se manda en cuanto llega la URL, que es la señal de «listo»: si el
  // lanzador anuncia antes de instalar su manejador, un SIGTERM temprano lo mata
  // con 143. Medido bajo carga (banco `test-isolation-leaks-20260927T080507`,
  // `probe-sigterm-race-*.txt`): 11 de 40 salían 143. Un intento solo lo ve a
  // veces; por eso se repite.
  test('2. con SIGTERM nada más anunciarse cierra y sale 0, siempre', async () => {
    const codes: number[] = []
    for (let attempt = 0; attempt < 12; attempt++) {
      const log = join(mkdtempSync(join(tmpdir(), 'mock-bin-')), 'requests.log')
      const { proc } = await start(log)
      proc.kill('SIGTERM')
      codes.push(await proc.exited)
    }
    expect(codes.filter(code => code !== 0)).toEqual([])
  }, 30_000)
})
