/**
 * `thyrox -p` como máscara de `claude -p`: sin credencial propia, y con un
 * `claude` en el PATH, la misma invocación la atiende el cliente, que
 * autentica solo. thyrox no lee ni reenvía ninguna credencial. Medido en
 * `.claude/workbench/claude-p-from-shell-20260928T234121/`.
 */
import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { decidePrintDelegation, delegatedArgv } from '../src/entry/printDelegation.ts'
import { runPrint } from '../src/entry/print.ts'

const found = (name: string) => (name === 'claude' ? '/usr/local/bin/claude' : null)
const absent = () => null
const noFd = () => ''

describe('decidePrintDelegation — cuándo thyrox -p delega en claude -p', () => {
  test('sin credencial propia y con claude en el PATH, delega', () => {
    expect(decidePrintDelegation(['-p', 'hola'], {}, found, noFd)).toEqual({ delegate: true, claudePath: '/usr/local/bin/claude' })
  })
  test('con credencial propia, thyrox atiende la invocación', () => {
    const decision = decidePrintDelegation(['-p', 'hola'], { ANTHROPIC_API_KEY: 'sk-propia' }, found, noFd)
    expect(decision.delegate).toBe(false)
  })
  test('con una conexión del store, thyrox atiende la invocación', () => {
    const home = mkdtempSync(join(tmpdir(), 'thyrox-delegation-store-'))
    const opened = openConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: home }, declared: () => 'k' })
    opened.store.create({ provider: 'claude', authType: 'apikey', name: 'propia', isActive: true, apiKey: 'sk-propia' })
    const decision = decidePrintDelegation(['-p', 'hola'], {}, found, noFd, opened.store)
    opened.close()
    rmSync(home, { recursive: true, force: true })
    expect(decision).toEqual({ delegate: false, reason: 'thyrox tiene credencial propia' })
  })
  test('sin claude en el PATH, no delega y lo dice', () => {
    const decision = decidePrintDelegation(['-p', 'hola'], {}, absent, noFd)
    expect(decision).toEqual({ delegate: false, reason: expect.stringContaining('claude') })
  })
  test('un proveedor que no es http es de thyrox: no delega', () => {
    expect(decidePrintDelegation(['-p', 'hola', '--provider', 'recorded'], {}, found, noFd).delegate).toBe(false)
  })
  test('una bandera propia de thyrox no se delega', () => {
    for (const flag of ['--grabacion', '--connection', '--store', '--system']) {
      expect(decidePrintDelegation(['-p', 'hola', flag, 'x'], {}, found, noFd).delegate).toBe(false)
    }
  })
})

describe('delegatedArgv — la línea que recibe claude -p', () => {
  test('conserva la invocación y le da su propia sesión', () => {
    const argv = ['-p', '--model', 'claude-sonnet-5', '--no-session-persistence', '--output-format', 'stream-json', '--verbose']
    expect(delegatedArgv(argv, () => 'uuid-1')).toEqual([...argv, '--session-id', 'uuid-1'])
  })
  test('una sesión ya declarada no se duplica', () => {
    const argv = ['-p', 'hola', '--session-id', 'propia']
    expect(delegatedArgv(argv, () => 'uuid-1')).toEqual(argv)
  })
})

describe('runPrint — valida antes de delegar', () => {
  test('una bandera que thyrox -p rehúsa no llega a claude', async () => {
    let called = false
    const code = await runPrint(['-p', 'x', '--bogus'], process.cwd(), process.cwd(), null, {
      env: {}, findExecutable: () => { called = true; return '/no/debe/correr' }, readFd: noFd,
    })
    expect(code).toBe(2)
    expect(called).toBe(false)
  })
})

describe('runPrint — delega de punta a punta', () => {
  function fakeClient(): { dir: string; log: string } {
    const dir = mkdtempSync(join(tmpdir(), 'print-delegation-'))
    const log = join(dir, 'invocacion.txt')
    const bin = join(dir, 'claude')
    writeFileSync(bin, `#!/usr/bin/env bash\nentrada="$(cat)"\nprintf '%s\\n' "$*" > "${log}"\nprintf '%s\\n' "$entrada" >> "${log}"\necho '{"type":"result","result":"desde claude"}'\nexit 3\n`)
    chmodSync(bin, 0o755)
    return { dir, log }
  }

  test('pasa argumentos y stdin, devuelve su salida y su código', async () => {
    const { dir, log } = fakeClient()
    let out = ''
    const write = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((s: string | Uint8Array) => { out += typeof s === 'string' ? s : new TextDecoder().decode(s); return true }) as typeof process.stdout.write
    let code: number
    try {
      code = await runPrint(['-p', '--model', 'claude-sonnet-5'], dir, dir, 'Item: alfa', {
        env: {}, findExecutable: (name) => (name === 'claude' ? join(dir, 'claude') : null), readFd: noFd, newSessionId: () => 'uuid-x',
      })
    } finally {
      process.stdout.write = write
    }
    expect(code).toBe(3)
    expect(out).toContain('desde claude')
    const [line, input] = readFileSync(log, 'utf8').split('\n')
    expect(line).toBe('-p --model claude-sonnet-5 --session-id uuid-x')
    expect(input).toBe('Item: alfa')
  })
})
