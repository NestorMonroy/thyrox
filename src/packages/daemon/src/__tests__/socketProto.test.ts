import { describe, expect, test } from 'bun:test'

import { isYieldAck } from '../socketProto.js'

describe('isYieldAck', () => {
  test('an ok yield reply with yielding:true is an ack', () => {
    expect(isYieldAck({ ok: true, op: 'yield', yielding: true })).toBe(true)
  })

  test('a refusal, another op or an error is not an ack', () => {
    expect(isYieldAck({ ok: true, op: 'yield', yielding: false })).toBe(false)
    expect(isYieldAck({ ok: true, op: 'ping', yielding: true })).toBe(false)
    expect(isYieldAck({ ok: false, code: 'ENOCONN', error: 'x' })).toBe(false)
  })
})
