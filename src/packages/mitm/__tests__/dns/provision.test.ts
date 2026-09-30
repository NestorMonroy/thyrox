// Portado de omniroute: tests/unit/mitm-dns-graceful-degrade-6127.test.ts (MIT), sobre
// bun:test. La bandera de salida es THYROX_MITM_SKIP_ANTIGRAVITY_DNS, y los lectores por
// defecto leen el estado del AgentBridge de un store inyectado.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'

import { provisionDnsEntries, type DnsProvisionLogger } from '../../src/dns/provision.ts'
import { addCustomHost, toggleCustomHost } from '../../src/state/inspectorCustomHosts.ts'
import { upsertAgentBridgeState } from '../../src/state/agentBridgeState.ts'
import { openMitmStateStore } from '../../src/state/stateStore.ts'

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

function spyLogger() {
  const errorCalls: Array<{ payload: unknown; msg: string }> = []
  const infoCalls: Array<{ payload: unknown; msg: string }> = []
  const logger: DnsProvisionLogger = {
    error: (payload, msg) => errorCalls.push({ payload, msg }),
    info: (payload, msg) => infoCalls.push({ payload, msg: msg ?? '' }),
  }
  return { logger, errorCalls, infoCalls }
}

const noState = { getAgentStates: () => [], listEnabledCustomHosts: () => [], canElevate: () => true }

test('a failing default step neither aborts nor hides its stderr [#6127 #6198]', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', undefined)
  const spy = spyLogger()
  await provisionDnsEntries('pw', {
    ...noState,
    addDefaultDns: async () => {
      throw new Error('Command failed with code 1\nsudo: a password is required')
    },
    logger: spy.logger,
  })
  assert.equal(spy.errorCalls.length, 1)
  const err = (spy.errorCalls[0]!.payload as { err?: Error }).err
  assert.ok(err instanceof Error)
  assert.match(err.message, /sudo: a password is required/)
})

test('a failing step does not stop the ones after it', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', undefined)
  const spy = spyLogger()
  const written: string[][] = []
  await provisionDnsEntries('pw', {
    addDefaultDns: async () => {
      throw new Error('no sudo')
    },
    addHostsDns: async hosts => {
      if (hosts.includes('api2.cursor.sh')) throw new Error('agent step failed')
      written.push(hosts)
    },
    canElevate: () => true,
    getAgentStates: () => [
      { agent_id: 'cursor', dns_enabled: true },
      { agent_id: '__nonexistent_agent__', dns_enabled: true },
      { agent_id: 'codex', dns_enabled: false },
    ],
    listEnabledCustomHosts: () => [{ host: 'custom.example.com' }],
    logger: spy.logger,
  })
  assert.deepEqual(written, [['custom.example.com']])
  assert.equal(spy.errorCalls.length, 2)
})

test('the happy path forwards the password to every step and logs no error', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', 'false')
  const spy = spyLogger()
  const passwords: string[] = []
  const written: string[][] = []
  await provisionDnsEntries('pw', {
    addDefaultDns: async password => {
      passwords.push(password)
    },
    addHostsDns: async (hosts, password) => {
      passwords.push(password)
      written.push(hosts)
    },
    canElevate: () => true,
    getAgentStates: () => [{ agent_id: 'cursor', dns_enabled: true }],
    listEnabledCustomHosts: () => [{ host: 'custom.example.com' }],
    logger: spy.logger,
  })
  assert.deepEqual(passwords, ['pw', 'pw', 'pw'])
  assert.deepEqual(written, [['api2.cursor.sh'], ['custom.example.com']])
  assert.equal(spy.errorCalls.length, 0)
})

test('THYROX_MITM_SKIP_ANTIGRAVITY_DNS=true skips every step and says why', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', 'true')
  const spy = spyLogger()
  let called = 0
  await provisionDnsEntries('pw', {
    ...noState,
    addDefaultDns: async () => {
      called++
    },
    addHostsDns: async () => {
      called++
    },
    getAgentStates: () => [{ agent_id: 'cursor', dns_enabled: true }],
    logger: spy.logger,
  })
  assert.equal(called, 0)
  assert.ok(spy.infoCalls.some(c => String(c.payload).includes('THYROX_MITM_SKIP_ANTIGRAVITY_DNS')))
})

test('without elevation every step is skipped with a clear message', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', undefined)
  const spy = spyLogger()
  let called = 0
  await provisionDnsEntries('pw', {
    ...noState,
    canElevate: () => false,
    addDefaultDns: async () => {
      called++
    },
    logger: spy.logger,
  })
  assert.equal(called, 0)
  assert.equal(spy.errorCalls.length, 0)
  assert.ok(spy.infoCalls.some(c => String(c.payload).includes('sudo not available')))
})

test('the default readers take agents and enabled custom hosts from the store', async () => {
  withEnv('THYROX_MITM_SKIP_ANTIGRAVITY_DNS', undefined)
  const db = openMitmStateStore(':memory:')
  cleanups.push(() => db.close())
  upsertAgentBridgeState(db, { agent_id: 'cursor', dns_enabled: true })
  upsertAgentBridgeState(db, { agent_id: 'codex', dns_enabled: false })
  addCustomHost(db, 'on.example.com')
  addCustomHost(db, 'off.example.com')
  toggleCustomHost(db, 'off.example.com', false)
  const written: string[][] = []
  await provisionDnsEntries('pw', {
    db,
    canElevate: () => true,
    addDefaultDns: async () => {},
    addHostsDns: async hosts => {
      written.push(hosts)
    },
    logger: spyLogger().logger,
  })
  assert.deepEqual(written, [['api2.cursor.sh'], ['on.example.com']])
})
