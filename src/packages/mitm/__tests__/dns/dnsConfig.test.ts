// Portado de omniroute: tests/unit/dns-config-generic.test.ts, mitm-dnsConfig.test.ts,
// agent-bridge-dns-per-agent-8466.test.ts y mitm-dns-win32-sudo-fold-11430.test.ts (MIT),
// sobre bun:test. Donde la referencia leía el propio fuente para comprobar la forma del
// comando, aquí el archivo hosts y los ejecutores se inyectan y se mide la invocación real.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  addDNSEntries,
  addDNSEntry,
  checkDNSEntry,
  checkDNSEntryForAgent,
  isSudoPasswordRequired,
  removeDNSEntries,
  removeDNSEntry,
  resolveHostsForAgent,
  type DnsCommandDependencies,
} from '../../src/dns/dnsConfig.ts'

const ANTIGRAVITY_HOSTS = [
  'daily-cloudcode-pa.googleapis.com',
  'cloudcode-pa.googleapis.com',
  'daily-cloudcode-pa.sandbox.googleapis.com',
  'autopush-cloudcode-pa.sandbox.googleapis.com',
]

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function withEnv(name: string, value: string | undefined): void {
  const previous = process.env[name]
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
  cleanups.push(() => {
    if (previous === undefined) delete process.env[name]
    else process.env[name] = previous
  })
}

function withPlatform(platform: NodeJS.Platform): void {
  const original = os.platform
  ;(os as { platform: () => NodeJS.Platform }).platform = () => platform
  cleanups.push(() => {
    ;(os as { platform: () => NodeJS.Platform }).platform = original
  })
}

function tempHosts(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-dns-'))
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'hosts')
  fs.writeFileSync(file, content)
  return file
}

interface ExecCall {
  command: string
  args: string[]
  password: string
  stdin: string
}

function recorder(hostsFile: string): { calls: ExecCall[]; scripts: string[]; deps: DnsCommandDependencies } {
  const calls: ExecCall[] = []
  const scripts: string[] = []
  return {
    calls,
    scripts,
    deps: {
      hostsFile,
      execFileWithPassword: async (command, args, password, stdin = '') => {
        calls.push({ command, args, password, stdin })
        return ''
      },
      runElevatedPowerShell: async script => {
        scripts.push(script)
        return ''
      },
    },
  }
}

test('resolveHostsForAgent falls back to the antigravity hosts', () => {
  assert.deepEqual(resolveHostsForAgent(), ANTIGRAVITY_HOSTS)
  assert.deepEqual(resolveHostsForAgent('__nonexistent_agent__'), ANTIGRAVITY_HOSTS)
  assert.deepEqual(resolveHostsForAgent('cursor'), ['api2.cursor.sh'])
})

test('addDNSEntries appends both address families through sudo tee, as stdin', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts('127.0.0.1 localhost\n')
  const { calls, deps } = recorder(hosts)
  await addDNSEntries(['a.example.com'], 'pw', deps)
  assert.deepEqual(calls, [
    {
      command: 'sudo',
      args: ['-S', 'tee', '-a', hosts],
      password: 'pw',
      stdin: '127.0.0.1 a.example.com\n::1 a.example.com\n',
    },
  ])
})

test('addDNSEntries writes only the missing lines and nothing when all exist', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts('127.0.0.1 a.example.com\n127.0.0.1 b.example.com\n::1 b.example.com\n')
  const { calls, deps } = recorder(hosts)
  await addDNSEntries(['a.example.com', 'b.example.com'], 'pw', deps)
  assert.equal(calls.length, 1)
  assert.equal(calls[0]!.stdin, '::1 a.example.com\n')
  calls.length = 0
  await addDNSEntries(['b.example.com'], 'pw', deps)
  assert.equal(calls.length, 0)
})

test('an entry counts only with the matching address in the first column', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts('10.0.0.1 a.example.com\n::1 a.example.com\n')
  const { calls, deps } = recorder(hosts)
  await addDNSEntries(['a.example.com'], 'pw', deps)
  assert.equal(calls[0]!.stdin, '127.0.0.1 a.example.com\n')
})

test('THYROX_MITM_SKIP_DNS_WRITE=1 skips both writers; other values do not', async () => {
  withPlatform('linux')
  const hosts = tempHosts('127.0.0.1 gone.example.com\n::1 gone.example.com\n')
  const { calls, deps } = recorder(hosts)
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', '1')
  await addDNSEntries(['new.example.com'], 'pw', deps)
  await removeDNSEntries(['gone.example.com'], 'pw', deps)
  assert.equal(calls.length, 0)
  for (const value of ['0', 'true']) {
    process.env.THYROX_MITM_SKIP_DNS_WRITE = value
    await addDNSEntries(['new.example.com'], 'pw', deps)
  }
  assert.equal(calls.length, 2)
})

test('addDNSEntries on win32 uses one elevated Add-Content and never sudo', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('win32')
  const hosts = tempHosts('')
  const { calls, scripts, deps } = recorder(hosts)
  await addDNSEntries(['a.example.com', "b'x.example.com"], 'unused', deps)
  assert.equal(calls.length, 0)
  assert.equal(scripts.length, 1)
  assert.ok(scripts[0]!.startsWith(`Add-Content -LiteralPath '${hosts}' -Value `), scripts[0])
  assert.ok(scripts[0]!.includes("'127.0.0.1 a.example.com', '::1 a.example.com'"), scripts[0])
  assert.ok(scripts[0]!.includes("'127.0.0.1 b''x.example.com'"), scripts[0])
})

test('removeDNSEntries runs the filter per present host, with argv and not interpolation', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts('127.0.0.1 gone.example.com\n::1 gone.example.com\n')
  const { calls, deps } = recorder(hosts)
  await removeDNSEntries(['gone.example.com', 'absent.example.com'], 'pw', deps)
  assert.equal(calls.length, 1)
  const [flag, runtime, evalFlag, , file, host] = calls[0]!.args
  assert.equal(calls[0]!.command, 'sudo')
  assert.deepEqual([flag, runtime, evalFlag, file, host], ['-S', process.execPath, '-e', hosts, 'gone.example.com'])
})

test('the removal filter really rewrites the hosts file under this runtime', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts(
    '127.0.0.1 localhost\n127.0.0.1 gone.example.com\n::1 gone.example.com\n10.0.0.2 keep.example.com\n',
  )
  const deps: DnsCommandDependencies = {
    hostsFile: hosts,
    // Sin sudo: se corre el comando elevado tal cual, para medir el filtro.
    execFileWithPassword: async (_command, args) => {
      const [program, ...rest] = args.slice(1)
      const result = spawnSync(program!, rest, { encoding: 'utf8' })
      if (result.status !== 0) throw new Error(result.stderr)
      return result.stdout
    },
  }
  await removeDNSEntries(['gone.example.com'], 'pw', deps)
  assert.equal(fs.readFileSync(hosts, 'utf8'), '127.0.0.1 localhost\n10.0.0.2 keep.example.com\n')
})

test('removeDNSEntries on win32 filters every present host in one elevated script', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('win32')
  const hosts = tempHosts('127.0.0.1 a.example.com\n::1 a.example.com\n127.0.0.1 b.example.com\n::1 b.example.com\n')
  const { calls, scripts, deps } = recorder(hosts)
  await removeDNSEntries(['a.example.com', 'b.example.com', 'c.example.com'], 'unused', deps)
  assert.equal(calls.length, 0)
  assert.equal(scripts.length, 1)
  assert.ok(scripts[0]!.includes("$targetHosts = @('a.example.com', 'b.example.com')"), scripts[0])
  assert.ok(scripts[0]!.includes('Set-Content -LiteralPath $hostsFile'), scripts[0])
})

test('the per-agent helpers resolve the agent hosts before writing', async () => {
  withEnv('THYROX_MITM_SKIP_DNS_WRITE', undefined)
  withPlatform('linux')
  const hosts = tempHosts('127.0.0.1 api2.cursor.sh\n::1 api2.cursor.sh\n')
  const { calls, deps } = recorder(hosts)
  await addDNSEntry('pw', 'cursor', deps)
  assert.equal(calls.length, 0)
  await removeDNSEntry('pw', 'cursor', deps)
  assert.equal(calls.length, 1)
  assert.equal(calls[0]!.args.at(-1), 'api2.cursor.sh')
  await addDNSEntry('pw', undefined, deps)
  assert.equal(calls[1]!.stdin.split('\n').filter(Boolean).length, ANTIGRAVITY_HOSTS.length * 2)
})

test('checkDNSEntryForAgent answers for that agent, not the antigravity set [#8466]', () => {
  const hosts = tempHosts('127.0.0.1 api2.cursor.sh\n::1 api2.cursor.sh\n')
  assert.equal(checkDNSEntryForAgent('cursor', { hostsFile: hosts }), true)
  assert.equal(checkDNSEntryForAgent(undefined, { hostsFile: hosts }), false)
  assert.equal(checkDNSEntry({ hostsFile: hosts }), false)
  const all = tempHosts(ANTIGRAVITY_HOSTS.flatMap(h => [`127.0.0.1 ${h}`, `::1 ${h}`]).join('\n'))
  assert.equal(checkDNSEntry({ hostsFile: all }), true)
})

test('an unreadable hosts file reads as empty', () => {
  assert.equal(checkDNSEntryForAgent('cursor', { hostsFile: '/nonexistent/thyrox/hosts' }), false)
})

test('isSudoPasswordRequired is false on win32 without probing sudo [#11430]', () => {
  withPlatform('win32')
  assert.equal(isSudoPasswordRequired(), false)
})
