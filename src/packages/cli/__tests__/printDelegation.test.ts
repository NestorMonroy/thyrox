/**
 * `thyrox -p` sin credencial propia: la máscara pasa por el proxy local
 * (upstream `claude-cli`, C5) y nunca por `claude -p` directo (decisión del
 * ejecutor 2026-09-29: todo pasa por el proxy). Sin credencial, thyrox
 * localiza el proxy declarado en `THYROX_LOCAL_PROXY_SOCKET` o levanta
 * `bin/provider-local-proxy`, entra al túnel (`ANTHROPIC_UNIX_SOCKET` más el
 * marcador, `i1` de 2.1.283) y su propio bucle ejecuta las herramientas.
 * Sin proxy disponible rehúsa con causa.
 */
import { describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { SSH_PLACEHOLDER } from '@thyrox/provider/credentials'
import {
  credentialEnvironmentFor, decidePrintRoute, LOCAL_PROXY_SOCKET_ENV, type LocalProxyChild, type PrintRoute, TUNNEL_BASE_URL, tunnelEnv,
} from '../src/entry/printDelegation.ts'
import { runPrint } from '../src/entry/print.ts'

const noFd = () => ''
const FAKE_CLI = join(import.meta.dir, 'fixtures/fakeCliForLocalProxy.ts')

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'print-local-proxy-'))
}

/** Un `claude` en un directorio propio que corre el doble de `claude -p`. */
function fakeCliDirectory(base: string): string {
  const binDir = join(base, 'path-claude')
  mkdirSync(binDir)
  writeFileSync(join(binDir, 'claude'), `#!/usr/bin/env bash\nexec "${process.execPath}" "${FAKE_CLI}" "$@"\n`)
  chmodSync(join(binDir, 'claude'), 0o755)
  return binDir
}

/** Un lanzador falso: un guion de shell con la forma de proceso que el lanzamiento lee. */
function shellChild(script: string): LocalProxyChild {
  return Bun.spawn(['bash', '-c', script], { stdout: 'pipe', stderr: 'pipe' })
}

async function capture(fn: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  let out = ''
  let err = ''
  const w = process.stdout.write.bind(process.stdout)
  const e = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((s: string) => { out += s; return true }) as typeof process.stdout.write
  process.stderr.write = ((s: string) => { err += s; return true }) as typeof process.stderr.write
  try {
    const code = await fn()
    return { code, out, err }
  } finally {
    process.stdout.write = w
    process.stderr.write = e
  }
}

describe('decidePrintRoute — por dónde pasa thyrox -p', () => {
  test('sin credencial propia y sin proxy declarado, hay que levantar el proxy local', () => {
    expect(decidePrintRoute(['-p', 'hola'], {}, noFd)).toEqual({ kind: 'launch-proxy' })
  })
  test('sin credencial propia y con proxy declarado, se usa ese socket', () => {
    expect(decidePrintRoute(['-p', 'hola'], { [LOCAL_PROXY_SOCKET_ENV]: '/run/p.sock' }, noFd)).toEqual({ kind: 'declared-proxy', socketPath: '/run/p.sock' })
  })
  test('con credencial propia, thyrox habla directo', () => {
    expect(decidePrintRoute(['-p', 'hola'], { ANTHROPIC_API_KEY: 'sk-propia', [LOCAL_PROXY_SOCKET_ENV]: '/run/p.sock' }, noFd)).toEqual({ kind: 'own', reason: 'thyrox tiene credencial propia' })
  })
  test('con un túnel ya declarado, thyrox habla por él', () => {
    const env = { ANTHROPIC_UNIX_SOCKET: '/run/t.sock', ANTHROPIC_API_KEY: SSH_PLACEHOLDER }
    expect(decidePrintRoute(['-p', 'hola'], env, noFd).kind).toBe('own')
  })
  test('con una conexión del store, thyrox habla directo', () => {
    const home = scratch()
    const opened = openConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: home }, declared: () => 'k' })
    opened.store.create({ provider: 'claude', authType: 'apikey', name: 'propia', isActive: true, apiKey: 'sk-propia' })
    const route = decidePrintRoute(['-p', 'hola'], {}, noFd, opened.store)
    opened.close()
    rmSync(home, { recursive: true, force: true })
    expect(route).toEqual({ kind: 'own', reason: 'thyrox tiene credencial propia' })
  })
  test('un proveedor que no es http no necesita credencial', () => {
    expect(decidePrintRoute(['-p', 'hola', '--provider', 'recorded'], {}, noFd)).toEqual({ kind: 'own', reason: 'el proveedor recorded no usa credencial' })
  })
})

describe('tunnelEnv — el entorno con el que el bucle entra al túnel', () => {
  test('lleva el socket, el marcador y la URL llana, y retira toda credencial propia', () => {
    const env = tunnelEnv({ PATH: '/bin', ANTHROPIC_AUTH_TOKEN: ' ', THYROX_CODE_OAUTH_TOKEN: '', THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '9' }, '/run/p.sock')
    expect(env).toEqual({ PATH: '/bin', ANTHROPIC_UNIX_SOCKET: '/run/p.sock', ANTHROPIC_API_KEY: SSH_PLACEHOLDER, ANTHROPIC_BASE_URL: TUNNEL_BASE_URL })
  })
})

describe('credentialEnvironmentFor — localizar o levantar el proxy', () => {
  const launch: PrintRoute = { kind: 'launch-proxy' }

  test('la ruta propia devuelve el entorno tal cual', async () => {
    const env = { ANTHROPIC_API_KEY: 'sk-propia' }
    const credential = await credentialEnvironmentFor({ kind: 'own', reason: 'x' }, { env, cwd: '/', models: ['m'] })
    expect(credential.env).toBe(env)
    await credential.close()
  })

  test('un proxy declarado que existe entra al túnel sin lanzar nada', async () => {
    const dir = scratch()
    const socket = join(dir, 'p.sock')
    writeFileSync(socket, '')
    let spawned = 0
    const credential = await credentialEnvironmentFor({ kind: 'declared-proxy', socketPath: socket }, {
      env: { PATH: '/bin' }, cwd: dir, models: ['m'], spawn: () => { spawned += 1; return shellChild('sleep 30') },
    })
    await credential.close()
    rmSync(dir, { recursive: true, force: true })
    expect(spawned).toBe(0)
    expect(credential.env).toEqual({ PATH: '/bin', ANTHROPIC_UNIX_SOCKET: socket, ANTHROPIC_API_KEY: SSH_PLACEHOLDER, ANTHROPIC_BASE_URL: TUNNEL_BASE_URL })
  })

  test('un proxy declarado que no existe se rehúsa nombrándolo, sin lanzar nada', async () => {
    let spawned = 0
    const pending = credentialEnvironmentFor({ kind: 'declared-proxy', socketPath: '/no/existe.sock' }, {
      env: {}, cwd: '/', models: ['m'], spawn: () => { spawned += 1; return shellChild('sleep 30') },
    })
    await expect(pending).rejects.toThrow(/THYROX_LOCAL_PROXY_SOCKET.*\/no\/existe\.sock/)
    expect(spawned).toBe(0)
  })

  test('el lanzador que anuncia el socket da el túnel; cerrar lo termina', async () => {
    let child: LocalProxyChild | undefined
    let argv: string[] = []
    const credential = await credentialEnvironmentFor(launch, {
      env: { PATH: '/bin' }, cwd: '/', models: ['claude-sonnet-5'],
      spawn: (args) => { argv = args; child = shellChild('echo socket=/run/anunciado.sock; sleep 30'); return child },
    })
    expect(credential.env).toEqual({ PATH: '/bin', ANTHROPIC_UNIX_SOCKET: '/run/anunciado.sock', ANTHROPIC_API_KEY: SSH_PLACEHOLDER, ANTHROPIC_BASE_URL: TUNNEL_BASE_URL })
    expect(argv).toEqual(expect.arrayContaining(['--socket', '--model', 'claude-sonnet-5']))
    await credential.close()
    expect(await child!.exited).not.toBe(0)
  })

  test('el lanzador que sale antes de anunciar es una causa: su código y su stderr', async () => {
    const pending = credentialEnvironmentFor(launch, {
      env: {}, cwd: '/', models: ['m'], spawn: () => shellChild('echo "sin claude en el PATH" >&2; exit 2'),
    })
    await expect(pending).rejects.toThrow(/código 2.*sin claude en el PATH/)
  })

  test('el lanzador que nunca anuncia se corta al plazo y se termina', async () => {
    let child: LocalProxyChild | undefined
    const pending = credentialEnvironmentFor(launch, {
      env: {}, cwd: '/', models: ['m'], announceTimeoutMs: 200, spawn: () => { child = shellChild('sleep 30'); return child },
    })
    await expect(pending).rejects.toThrow(/no anunció.*200 ms/)
    expect(await child!.exited).not.toBe(0)
  })
})

describe('runPrint — sin credencial pasa por el proxy local, nunca por claude -p directo', () => {
  function invocations(dir: string): { argv: string[]; stdin: string }[] {
    const path = join(dir, 'invocations.jsonl')
    if (!existsSync(path)) return []
    return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line) as { argv: string[]; stdin: string })
  }

  test('un proxy declarado que no existe rehúsa con causa y no invoca a claude', async () => {
    const dir = scratch()
    const env = { PATH: `${fakeCliDirectory(dir)}:${process.env.PATH ?? ''}`, HOME: dir, FAKE_CLI_LOG: dir, [LOCAL_PROXY_SOCKET_ENV]: join(dir, 'no-existe.sock') }
    const { code, err } = await capture(() => runPrint(['-p', 'hola', '--no-session-persistence'], dir, dir, null, { env, readFd: noFd, openStore: () => undefined }))
    expect(code).toBe(2)
    expect(err).toContain('no-existe.sock')
    expect(invocations(dir)).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  test('levanta el proxy local, el turno vuelve por él y el proxy se apaga al terminar', async () => {
    const dir = scratch()
    const env = { PATH: `${fakeCliDirectory(dir)}:${process.env.PATH ?? ''}`, HOME: dir, FAKE_CLI_LOG: dir }
    const { code, out } = await capture(() => runPrint(['-p', 'hola', '--model', 'claude-sonnet-5', '--no-session-persistence'], dir, dir, null, { env, readFd: noFd, openStore: () => undefined }))
    expect(code).toBe(0)
    expect(out).toBe('eco: hola\n')
    const [invocation] = invocations(dir)
    expect(invocation?.argv).toEqual(expect.arrayContaining(['-p', '--input-format', 'stream-json', '--model', 'claude-sonnet-5']))
    expect(invocation?.argv).not.toContain('hola')
    expect(readFileSync('/proc/net/unix', 'utf8')).not.toContain(dir)
    rmSync(dir, { recursive: true, force: true })
  })

  test('una herramienta que claude pide por el puente la ejecuta el bucle de thyrox', async () => {
    const dir = scratch()
    const env = { PATH: `${fakeCliDirectory(dir)}:${process.env.PATH ?? ''}`, HOME: dir, FAKE_CLI_LOG: dir }
    const { code, out } = await capture(() => runPrint(['-p', 'HERRAMIENTA', '--model', 'claude-sonnet-5', '--tools', 'Bash', '--no-session-persistence', '--output-format', 'json'], dir, dir, null, { env, readFd: noFd, openStore: () => undefined }))
    expect(code).toBe(0)
    expect(JSON.parse(out.trim())).toMatchObject({ type: 'result', subtype: 'success', result: 'resultado: hola-desde-el-bucle' })
    rmSync(dir, { recursive: true, force: true })
  })
})
