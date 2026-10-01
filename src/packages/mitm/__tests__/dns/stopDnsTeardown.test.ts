// La retirada de DNS de stopMitm (omniroute: src/mitm/stopDnsTeardown.ts, MIT). El orden
// frente a la muerte del servidor (#1809) lo prueba el gestor; aquí, el paso en sí.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import { removeStopDnsEntries } from '../../src/stopDnsTeardown.ts'

function deps(events: string[], managed: () => string[]) {
  return {
    removeDNSEntry: async (password: string) => {
      events.push(`default:${password}`)
    },
    removeDNSEntries: async (hosts: string[], password: string) => {
      events.push(`managed:${hosts.join(',')}:${password}`)
    },
    collectManagedHosts: managed,
  }
}

test('removes the default hosts first, then every managed host', async () => {
  const events: string[] = []
  await removeStopDnsEntries(deps(events, () => ['a.test', 'b.test']), 'pw')
  assert.deepEqual(events, ['default:pw', 'managed:a.test,b.test:pw'])
})

test('with no managed hosts only the default removal runs', async () => {
  const events: string[] = []
  await removeStopDnsEntries(deps(events, () => []), 'pw')
  assert.deepEqual(events, ['default:pw'])
})

test('a failure listing managed hosts is swallowed after the default removal', async () => {
  const events: string[] = []
  await removeStopDnsEntries(
    deps(events, () => {
      throw new Error('store unreadable')
    }),
    'pw',
  )
  assert.deepEqual(events, ['default:pw'])
})

test('a failure removing the default hosts reaches the caller', async () => {
  await assert.rejects(
    removeStopDnsEntries(
      {
        removeDNSEntry: async () => {
          throw new Error('sudo failed')
        },
        removeDNSEntries: async () => {},
        collectManagedHosts: () => [],
      },
      'pw',
    ),
    /sudo failed/,
  )
})
