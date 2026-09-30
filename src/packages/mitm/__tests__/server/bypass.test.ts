// Portado de omniroute: tests/unit/mitm-server-loop-guard.test.ts (MIT) y de los contratos de
// `_internal/bypass.cjs`, sobre bun:test. El servidor de thyrox importa estas piezas en TS:
// no hay shim CommonJS.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import {
  isLoopbackIp,
  isSelfLoopDestination,
  parseBypassJson,
  parseVerboseLevel,
  routeBypass,
} from '../../src/server/bypass.ts'

test('isSelfLoopDestination loops only for loopback on the listen port', () => {
  assert.equal(isSelfLoopDestination('127.0.0.1', 443, 443), true)
  assert.equal(isSelfLoopDestination('127.0.0.53', 443, 443), true)
  assert.equal(isSelfLoopDestination('::1', 443, 443), true)
  assert.equal(isSelfLoopDestination('::ffff:127.0.0.1', 443, 443), true)
  assert.equal(isSelfLoopDestination('1.2.3.4', 443, 443), false)
  assert.equal(isSelfLoopDestination('127.0.0.1', 8080, 443), false)
})

test('isLoopbackIp rejects non-strings and near misses', () => {
  assert.equal(isLoopbackIp(undefined as unknown as string), false)
  assert.equal(isLoopbackIp('10.127.0.1'), false)
  assert.equal(isLoopbackIp('::2'), false)
})

test('parseVerboseLevel defaults to 1 and keeps explicit levels, 0 included', () => {
  assert.equal(parseVerboseLevel(undefined), 1)
  assert.equal(parseVerboseLevel('not-a-number'), 1)
  assert.equal(parseVerboseLevel('-1'), 1)
  assert.equal(parseVerboseLevel('0'), 0)
  assert.equal(parseVerboseLevel('2'), 2)
})

test('parseBypassJson keeps non-empty string patterns, lowercased', () => {
  assert.deepEqual(parseBypassJson('{"patterns":["*.Corp.example", "", 3, "API.test"]}'), ['*.corp.example', 'api.test'])
  assert.deepEqual(parseBypassJson(''), [])
  assert.deepEqual(parseBypassJson('{not json'), [])
  assert.deepEqual(parseBypassJson('{"patterns":"*.x"}'), [])
})

test('routeBypass: bypass beats target, and unknown hosts pass through', () => {
  const targets = new Set(['api2.cursor.sh', 'login.okta.com'])
  assert.equal(routeBypass('login.okta.com', targets, []), 'bypass')
  assert.equal(routeBypass('API2.cursor.sh', targets, []), 'target')
  assert.equal(routeBypass('api2.cursor.sh', targets, ['*.cursor.sh']), 'bypass')
  assert.equal(routeBypass('example.com', targets, []), 'passthrough')
  assert.equal(routeBypass('', targets, []), 'passthrough')
  assert.equal(routeBypass('api2.cursor.sh', ['api2.cursor.sh'], []), 'target')
})
