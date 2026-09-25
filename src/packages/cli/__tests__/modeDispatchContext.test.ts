/**
 * El contexto de una invocación se construye en UN sitio (`modeDispatchContext`) y lo
 * usan las dos entradas: `runCli` y el puente `runModeDispatch` que llama el
 * `.action()` de commander. Antes el puente armaba el suyo y perdía `--cwd`:
 * la misma línea de comandos resolvía otro directorio según por dónde
 * entrara.
 */
import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { modeDispatchContext } from '../src/entry/mode-dispatch.ts'

describe('modeDispatchContext', () => {
  test('respeta --cwd, como runCli', () => {
    const ctx = modeDispatchContext(['--cwd', '/tmp/otro', 'sessions'], '/de/proceso')
    expect(ctx.cwd).toBe('/tmp/otro')
  })

  test('sin --cwd usa el del proceso', () => {
    expect(modeDispatchContext(['sessions'], '/de/proceso').cwd).toBe('/de/proceso')
  })

  test('el transcript sale del cwd resuelto, no del proceso', () => {
    const ctx = modeDispatchContext(['--cwd', '/tmp/otro'], '/de/proceso')
    expect(ctx.transcriptDir.startsWith(join(homedir(), '.harness'))).toBe(true)
    expect(ctx.transcriptDir).toBe(modeDispatchContext(['--cwd', '/tmp/otro'], '/tmp/otro').transcriptDir)
  })

  test('--transcript-dir manda sobre el derivado', () => {
    expect(modeDispatchContext(['--transcript-dir', '/t'], '/x').transcriptDir).toBe('/t')
  })
})
