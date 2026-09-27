/**
 * El chequeo de cwd y el resultado de fallo de arranque, portados de la capa
 * `cli` del binario 2.1.282/2.1.283 (banco: .claude/workbench/entry-point-<fecha>/,
 * extraidos con `bin/binary symbol`):
 *
 * - `rt` — si `process.cwd()` lanza, el mensaje que se imprime antes de salir 1;
 * - `sut`/`ez` — la linea `result` de error con `startup_failure_reason`;
 * - `out` — se pide con `CLAUDE_CODE_STARTUP_FAILURE_RESULTS` (aqui
 *   `THYROX_CODE_STARTUP_FAILURE_RESULTS`, la variable del cliente);
 * - `Fqn`/`Yun` — solo en un lanzamiento no interactivo con `stream-json`;
 * - `d` — el `--session-id` de argv gana al generado.
 *
 * El caso de punta a punta es el que discrimina: `cli.tsx` lanzado desde un
 * directorio borrado. Sin el chequeo, el primer `process.cwd()` revienta mas
 * adentro con un rastro que no dice que hacer.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwdUnavailableMessage, exitIfCwdUnavailable } from '../src/entry/cwdCheck.ts'
import { PRODUCT_NAME } from '../src/entry/productName.ts'
import {
  buildStartupFailureResult,
  isStartupFailureResultRequested,
  isStreamJsonLaunch,
  sessionIdFor,
  writeStartupFailureResult,
} from '../src/entry/startupFailure.ts'

const CLI = join(import.meta.dir, '..', 'src', 'entry', 'cli.tsx')
const UUID = '0b6f5e0e-3c1a-4c2e-9d4f-1a2b3c4d5e6f'

function codeError(code: string): Error {
  return Object.assign(new Error(code), { code })
}

describe('cwdUnavailableMessage (rt)', () => {
  test('1. un cwd legible no da mensaje', () => {
    expect(cwdUnavailableMessage(() => '/tmp')).toBeUndefined()
  })
  test('2. ENOENT da el mensaje del directorio borrado', () => {
    expect(cwdUnavailableMessage(() => { throw codeError('ENOENT') })).toBe(
      'The current directory no longer exists (it was deleted or moved). Start thyrox from an existing directory.')
  })
  test('3. otro codigo lo nombra entre parentesis', () => {
    expect(cwdUnavailableMessage(() => { throw codeError('EACCES') })).toBe(
      "Can't read the current directory (EACCES). Start thyrox from a different directory.")
  })
  test('4. sin codigo, el mensaje generico sin parentesis', () => {
    expect(cwdUnavailableMessage(() => { throw 'no es un Error' })).toBe(
      "Can't read the current directory. Start thyrox from a different directory.")
  })
})

describe('el resultado de fallo de arranque (sut/ez/out/Fqn/d)', () => {
  test('5. la linea result lleva la razon y el mensaje como error', () => {
    const r = buildStartupFailureResult({ sessionId: UUID, message: 'm', reason: 'cwd_unavailable' })
    expect(r).toMatchObject({
      type: 'result', subtype: 'error_during_execution', is_error: true, num_turns: 0,
      total_cost_usd: 0, session_id: UUID, errors: ['m'],
      startup_failure_reason: 'cwd_unavailable', result_index: 0,
    })
    expect(typeof r.uuid).toBe('string')
  })
  test('6. se pide sólo con la variable del cliente en verdadero', () => {
    expect(isStartupFailureResultRequested({ THYROX_CODE_STARTUP_FAILURE_RESULTS: '1' })).toBe(true)
    expect(isStartupFailureResultRequested({})).toBe(false)
    expect(isStartupFailureResultRequested({ THYROX_CODE_STARTUP_FAILURE_RESULTS: '0' })).toBe(false)
  })
  test('7. stream-json sólo en un lanzamiento no interactivo', () => {
    expect(isStreamJsonLaunch(['-p', '--output-format', 'stream-json'], true)).toBe(true)
    expect(isStreamJsonLaunch(['--output-format=stream-json', '--print'], true)).toBe(true)
    expect(isStreamJsonLaunch(['--output-format', 'stream-json'], true)).toBe(false)
    expect(isStreamJsonLaunch(['--output-format', 'stream-json'], false)).toBe(true)
    expect(isStreamJsonLaunch(['-p', '--output-format', 'text'], true)).toBe(false)
  })
  test('8. el --session-id valido de argv gana al generado', () => {
    expect(sessionIdFor('gen', ['--session-id', UUID])).toBe(UUID)
    expect(sessionIdFor('gen', ['--session-id', 'no-uuid'])).toBe('gen')
    expect(sessionIdFor('gen', [])).toBe('gen')
  })
  test('9. escribe UNA linea sólo si se pide y es stream-json', async () => {
    const lines: string[] = []
    const out = { write: (s: string, cb?: () => void) => { lines.push(s); cb?.(); return true },
      once: () => {}, writableEnded: false, destroyed: false }
    const base = { sessionId: UUID, message: 'm', reason: 'cwd_unavailable' }
    await writeStartupFailureResult(base, { stdout: out, env: {}, argv: ['-p', '--output-format', 'stream-json'], isTTY: true })
    expect(lines).toEqual([])
    await writeStartupFailureResult(base, { stdout: out, env: { THYROX_CODE_STARTUP_FAILURE_RESULTS: '1' },
      argv: ['-p', '--output-format', 'stream-json'], isTTY: true })
    expect(lines.length).toBe(1)
    expect(JSON.parse(lines[0] as string).startup_failure_reason).toBe('cwd_unavailable')
  })
})

describe('la rama de cwd en la capa cli', () => {
  test('10. sin cwd: mensaje, linea result pedida y salida 1 — en ese orden', async () => {
    const events: string[] = []
    await expect(exitIfCwdUnavailable({
      getCwd: () => { throw codeError('ENOENT') },
      writeError: m => { events.push(`stderr:${m.slice(0, 11)}`) },
      writeResult: async f => { events.push(`result:${f.reason}`) },
      newSessionId: () => UUID,
      exit: (code => { events.push(`exit:${code}`); throw new Error('salio') }) as (c: number) => never,
    })).rejects.toThrow('salio')
    expect(events).toEqual(['stderr:The current', 'result:cwd_unavailable', 'exit:1'])
  })
  test('11. con cwd legible no hace nada', async () => {
    const events: string[] = []
    await exitIfCwdUnavailable({ getCwd: () => '/tmp', writeError: m => { events.push(m) },
      exit: (() => { events.push('exit') }) as unknown as (c: number) => never })
    expect(events).toEqual([])
  })
  test('12. cli.tsx la llama tras --version y ANTES de cargar el perfilador', () => {
    const src = readFileSync(CLI, 'utf8')
    const check = src.indexOf('exitIfCwdUnavailable()')
    expect(check).toBeGreaterThan(src.indexOf("args[0] === '--version'"))
    expect(check).toBeLessThan(src.indexOf("profileCheckpoint('cli_entry')"))
  })
})

describe('el nombre del producto en los mensajes de arranque', () => {
  test('5. sale de PRODUCT_NAME, no de un literal del binario', () => {
    expect(PRODUCT_NAME).toBe('thyrox')
    const source = readFileSync(join(import.meta.dir, '../src/entry/cwdCheck.ts'), 'utf8')
    expect(source).not.toContain('Claude Code')
    expect(source).toContain('PRODUCT_NAME')
  })
})
