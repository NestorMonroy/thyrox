// Portado de omniroute: tests/unit/mitm-manager-repair.test.ts (MIT), sobre bun:test. La
// reparación retira los dos certificados que haya en disco: la hoja (server.crt) y la CA raíz
// (ca.crt), que es la instalada con el modelo de CA.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { buildRepairPlan, collectManagedHosts, performRepairSteps, type RepairDeps } from '../src/repair.ts'
import { addCustomHost, toggleCustomHost } from '../src/state/inspectorCustomHosts.ts'
import { openMitmStateStore } from '../src/state/stateStore.ts'
import { ALL_TARGETS } from '../src/targets/index.ts'
import { clearSystemProxy, getSystemProxyState, setSystemProxyApplied } from '../src/inspector/captureState.ts'
import { __setExec, type ExecFileFn } from '../src/inspector/systemProxyConfig.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function store() {
  const db = openMitmStateStore(':memory:')
  cleanups.push(() => db.close())
  return db
}

function certDir(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-repair-'))
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }))
  for (const file of files) fs.writeFileSync(path.join(dir, file), 'x')
  return dir
}

test('collectManagedHosts takes every target host, GHE hosts and every custom host', () => {
  const db = store()
  addCustomHost(db, 'on.example.com')
  addCustomHost(db, 'off.example.com')
  toggleCustomHost(db, 'off.example.com', false)
  const hosts = collectManagedHosts({
    db,
    gheCopilotProviderData: [{ gheUrl: 'https://ghe.example.com' }],
  })
  for (const target of ALL_TARGETS) for (const host of target.hosts) assert.ok(hosts.includes(host), host)
  assert.ok(hosts.includes('ghe.example.com'))
  assert.ok(hosts.includes('on.example.com'))
  assert.ok(hosts.includes('off.example.com'))
  assert.equal(new Set(hosts).size, hosts.length)
})

test('an unreadable custom host store does not drop the target hosts', () => {
  const db = store()
  db.close()
  const hosts = collectManagedHosts({ db })
  assert.ok(hosts.length > 0)
})

test('buildRepairPlan removes the managed host set, the CA and the system proxy', () => {
  const db = store()
  addCustomHost(db, 'on.example.com')
  const plan = buildRepairPlan({ db })
  assert.deepEqual([...plan.dnsHostsToRemove].sort(), [...collectManagedHosts({ db })].sort())
  assert.equal(plan.removeCert, true)
  assert.equal(plan.revertSystemProxy, true)
})

function recordingDeps(events: string[], overrides: Partial<RepairDeps> = {}): RepairDeps {
  return {
    db: store(),
    removeDNSEntry: async () => {
      events.push('dns-default')
    },
    removeDNSEntries: async hosts => {
      events.push(`dns-managed:${hosts.length > 0}`)
    },
    uninstallCert: async (_password, certPath) => {
      events.push(`cert:${path.basename(certPath)}`)
    },
    revertSystemProxy: async () => {
      events.push('proxy')
      return true
    },
    ...overrides,
  }
}

test('repair undoes DNS, both certificates on disk and the system proxy', async () => {
  const events: string[] = []
  const repaired = await performRepairSteps('pw', {
    ...recordingDeps(events),
    certDir: certDir(['ca.crt', 'server.crt']),
  })
  assert.deepEqual(events, ['dns-default', 'dns-managed:true', 'cert:ca.crt', 'cert:server.crt', 'proxy'])
  assert.deepEqual(repaired, ['dns', 'cert', 'system-proxy'])
})

test('with only the root CA installed, repair still untrusts it', async () => {
  const events: string[] = []
  const repaired = await performRepairSteps('pw', { ...recordingDeps(events), certDir: certDir(['ca.crt']) })
  assert.ok(events.includes('cert:ca.crt'))
  assert.ok(repaired.includes('cert'))
})

test('each step is best-effort and reports only what it repaired', async () => {
  const events: string[] = []
  const repaired = await performRepairSteps('pw', {
    ...recordingDeps(events, {
      removeDNSEntry: async () => {
        throw new Error('sudo failed')
      },
      uninstallCert: async () => {
        throw new Error('trust store read-only')
      },
      revertSystemProxy: async () => false,
    }),
    certDir: certDir(['server.crt']),
  })
  assert.deepEqual(repaired, [])
})

test('without certificate files there is no cert step', async () => {
  const events: string[] = []
  const repaired = await performRepairSteps('pw', { ...recordingDeps(events), certDir: certDir([]) })
  assert.ok(!events.some(e => e.startsWith('cert:')))
  assert.deepEqual(repaired, ['dns', 'system-proxy'])
})

test('the default proxy step reverts a proxy applied in this process', async () => {
  const original = os.platform
  ;(os as { platform: () => NodeJS.Platform }).platform = () => 'linux'
  cleanups.push(() => {
    ;(os as { platform: () => NodeJS.Platform }).platform = original
  })
  const calls: string[] = []
  const exec: ExecFileFn = async (file, args) => {
    calls.push([file, ...args].join(' '))
    return { stdout: '', stderr: '' }
  }
  cleanups.push(__setExec(exec))
  cleanups.push(() => clearSystemProxy())
  const previous = { platform: 'linux' as const, gnomeMode: "'auto'", httpHost: '', httpPort: '', httpsHost: '', httpsPort: '' }
  setSystemProxyApplied(9090, previous, 10)
  const { revertSystemProxy: _ignored, ...deps } = recordingDeps([])
  const repaired = await performRepairSteps('pw', { ...deps, certDir: certDir([]) })
  assert.ok(repaired.includes('system-proxy'))
  assert.equal(getSystemProxyState().applied, false)
  assert.ok(calls.includes("gsettings set org.gnome.system.proxy mode 'auto'"), calls.join('\n'))
  assert.deepEqual(await performRepairSteps('pw', { ...deps, certDir: certDir([]) }), ['dns'])
})
