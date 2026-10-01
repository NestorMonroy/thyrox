/**
 * Las credenciales de Cursor que quedan en el disco del anfitrión: el
 * `state.vscdb` del IDE y el `auth.json` de `cursor-agent`. Leerlas permite
 * renovar una conexión de Cursor, que no tiene refresh token.
 *
 * Porte de `omniroute: src/lib/cursor/tokenExtractor.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cursorDbCandidatePaths, extractCursorTokensFromRows, fuzzyExtractCursorTokensFromRows, normalizeVscDbValue, tryAgentAuth, tryIdeAuth, verifyLinuxCursorInstalled } from '../../../src/accounts/cursor/cursorTokenExtractor.ts'

const homes: string[] = []
afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})
function home(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cursor-home-'))
  homes.push(dir)
  return dir
}

function writeStateDb(path: string, rows: [string, string][]) {
  mkdirSync(join(path, '..'), { recursive: true })
  const db = new Database(path)
  db.run('CREATE TABLE itemTable (key TEXT PRIMARY KEY, value TEXT)')
  for (const [key, value] of rows) db.run('INSERT INTO itemTable VALUES (?, ?)', [key, value])
  db.close()
}

const installed = async () => true

describe('reading a value of state.vscdb', () => {
  test('unwraps one level of a JSON-encoded string and leaves the rest', () => {
    expect(normalizeVscDbValue('"abc"')).toBe('abc')
    expect(normalizeVscDbValue('abc')).toBe('abc')
    expect(normalizeVscDbValue('{"a":1}')).toBe('{"a":1}')
    expect(normalizeVscDbValue(5)).toBe(5)
  })

  test('the first exact key of each kind wins', () => {
    expect(extractCursorTokensFromRows([
      { key: 'cursorAuth/token', value: 'late' },
      { key: 'cursorAuth/accessToken', value: '"a1"' },
      { key: 'cursorAuth/refreshToken', value: 'r1' },
      { key: 'telemetry.machineId', value: 'm3' },
      { key: 'storage.serviceMachineId', value: 'm1' },
      { key: 'other', value: 'x' },
    ])).toEqual({ accessToken: 'late', refreshToken: 'r1', machineId: 'm3' })
  })

  test('the fuzzy lookup fills only what is missing, and a refresh key is never an access key', () => {
    expect(fuzzyExtractCursorTokensFromRows([
      { key: 'cursorAuth/refreshTokenAccessToken', value: 'both' },
      { key: 'cursorAuth/newAccessToken', value: 'a2' },
      { key: 'cursorAuth/RefreshToken2', value: 'r2' },
      { key: 'storage.someMachineId', value: 'm2' },
    ], { machineId: 'm1' })).toEqual({ accessToken: 'both', refreshToken: 'r2', machineId: 'm1' })
  })
})

describe('where the IDE database lives', () => {
  test('per platform, with the Insiders channel on macOS', () => {
    expect(cursorDbCandidatePaths('darwin', { home: '/h' })).toEqual(['/h/Library/Application Support/Cursor/User/globalStorage/state.vscdb', '/h/Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb'])
    expect(cursorDbCandidatePaths('linux', { home: '/h' })).toEqual(['/h/.config/Cursor/User/globalStorage/state.vscdb'])
    expect(cursorDbCandidatePaths('win32', { home: '/h', appdata: 'C:/AppData' })).toEqual(['C:/AppData/Cursor/User/globalStorage/state.vscdb'])
    expect(cursorDbCandidatePaths('freebsd', { home: '/h' })).toEqual([])
  })
})

describe('whether Cursor is installed on Linux', () => {
  test('which cursor is enough; otherwise a readable desktop entry', async () => {
    const calls: string[] = []
    expect(await verifyLinuxCursorInstalled({ execFile: async (file, args) => (calls.push(`${file} ${args.join(' ')}`), { stdout: '/usr/bin/cursor', stderr: '' }), access: async () => { throw new Error('unused') }, home: '/h' })).toBe(true)
    expect(calls).toEqual(['which cursor'])
    const accessed: string[] = []
    expect(await verifyLinuxCursorInstalled({ execFile: async () => { throw new Error('not found') }, access: async path => void accessed.push(path), home: '/h' })).toBe(true)
    expect(accessed).toEqual(['/h/.local/share/applications/cursor.desktop'])
    expect(await verifyLinuxCursorInstalled({ execFile: async () => { throw new Error('not found') }, access: async () => { throw new Error('ENOENT') }, home: '/h' })).toBe(false)
  })
})

describe('the cursor-agent credential', () => {
  test('is read from ~/.config/cursor/auth.json first', async () => {
    const h = home()
    mkdirSync(join(h, '.config/cursor'), { recursive: true })
    writeFileSync(join(h, '.config/cursor/auth.json'), JSON.stringify({ accessToken: 'agent1' }))
    mkdirSync(join(h, '.cursor'), { recursive: true })
    writeFileSync(join(h, '.cursor/agent-cli-state.json'), JSON.stringify({ accessToken: 'agent2' }))
    expect(await tryAgentAuth({ home: h })).toEqual({ found: true, accessToken: 'agent1', source: 'cursor-agent' })
  })

  test('falls through a file without a string token, or unreadable, to the CLI state', async () => {
    const h = home()
    mkdirSync(join(h, '.config/cursor'), { recursive: true })
    writeFileSync(join(h, '.config/cursor/auth.json'), JSON.stringify({ accessToken: 5 }))
    mkdirSync(join(h, '.cursor'), { recursive: true })
    writeFileSync(join(h, '.cursor/agent-cli-state.json'), JSON.stringify({ accessToken: 'agent2' }))
    expect(await tryAgentAuth({ home: h })).toEqual({ found: true, accessToken: 'agent2', source: 'cursor-agent' })
    writeFileSync(join(h, '.config/cursor/auth.json'), '{broken')
    expect((await tryAgentAuth({ home: h })).accessToken).toBe('agent2')
  })

  test('without either file it is not found', async () => {
    expect(await tryAgentAuth({ home: home() })).toEqual({ found: false, error: 'cursor-agent auth.json not found' })
  })
})

describe('the IDE credential', () => {
  test('is read from state.vscdb on Linux when Cursor is installed', async () => {
    const h = home()
    writeStateDb(join(h, '.config/Cursor/User/globalStorage/state.vscdb'), [['cursorAuth/accessToken', '"ide1"'], ['cursorAuth/refreshToken', 'r1'], ['storage.serviceMachineId', 'm1']])
    expect(await tryIdeAuth({ platform: 'linux', home: h, verifyInstalled: installed })).toEqual({ found: true, accessToken: 'ide1', refreshToken: 'r1', machineId: 'm1', source: 'cursor-ide' })
  })

  test('leftover files of an uninstalled Cursor are not trusted', async () => {
    const h = home()
    writeStateDb(join(h, '.config/Cursor/User/globalStorage/state.vscdb'), [['cursorAuth/accessToken', 'ide1']])
    expect(await tryIdeAuth({ platform: 'linux', home: h, verifyInstalled: async () => false })).toEqual({ found: false, error: 'Cursor config files found but Cursor IDE does not appear to be installed. Skipping auto-import.' })
  })

  test('a missing database or one without a token is reported', async () => {
    expect(await tryIdeAuth({ platform: 'linux', home: home(), verifyInstalled: installed })).toEqual({ found: false, error: 'Cursor IDE database not found' })
    const h = home()
    writeStateDb(join(h, '.config/Cursor/User/globalStorage/state.vscdb'), [['storage.machineId', 'm1']])
    expect(await tryIdeAuth({ platform: 'linux', home: h, verifyInstalled: installed })).toEqual({ found: false, error: 'Tokens not found in database' })
  })

  test('a table that is not there is a read failure', async () => {
    const h = home()
    const path = join(h, '.config/Cursor/User/globalStorage/state.vscdb')
    mkdirSync(join(path, '..'), { recursive: true })
    new Database(path).close()
    expect(await tryIdeAuth({ platform: 'linux', home: h, verifyInstalled: installed })).toEqual({ found: false, error: 'Failed to read database' })
  })

  test('on macOS the Insiders database is probed and renamed keys are found fuzzily', async () => {
    const h = home()
    writeStateDb(join(h, 'Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb'), [['cursorAuth/renamedAccessToken', 'mac1'], ['storage.someMachineId', 'm9']])
    expect(await tryIdeAuth({ platform: 'darwin', home: h })).toEqual({ found: true, accessToken: 'mac1', refreshToken: undefined, machineId: 'm9', source: 'cursor-ide' })
  })

  test('on Linux renamed keys are not guessed', async () => {
    const h = home()
    writeStateDb(join(h, '.config/Cursor/User/globalStorage/state.vscdb'), [['cursorAuth/renamedAccessToken', 'x']])
    expect(await tryIdeAuth({ platform: 'linux', home: h, verifyInstalled: installed })).toEqual({ found: false, error: 'Tokens not found in database' })
  })

  test('on macOS without any database the known locations are named', async () => {
    expect(await tryIdeAuth({ platform: 'darwin', home: home() })).toEqual({ found: false, error: 'Cursor database not found in known macOS locations. Make sure Cursor IDE is installed and opened at least once.' })
  })

  test('an unsupported platform has no database', async () => {
    expect(await tryIdeAuth({ platform: 'aix', home: home() })).toEqual({ found: false, error: 'Unsupported platform' })
  })

  test('a database that cannot be opened is named on macOS', async () => {
    const h = home()
    const path = join(h, 'Library/Application Support/Cursor/User/globalStorage/state.vscdb')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, 'not a database at all, just text that sqlite refuses to read'.repeat(20))
    const outcome = await tryIdeAuth({ platform: 'darwin', home: h })
    expect(outcome.found).toBe(false)
    expect(outcome.error).toStartWith(`Found Cursor database at ${path} but could not`)
  })
})
