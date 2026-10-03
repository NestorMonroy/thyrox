/**
 * Contrato de las cotas de longitud del esquema de SendMessage
 * (TASK-THYROX-0638, ejecutable 2.1.283, `chunk-zzjp4jq7.js`).
 *
 * `to`: una sola línea, hasta `max(200 + 15, 300)` caracteres.
 * `request_id`: no vacío, una sola línea, hasta `200 + 100` caracteres.
 * `summary`: hasta 200 caracteres.
 */
import { describe, expect, test } from 'bun:test'

import {
  MAX_PEER_ADDRESS_LENGTH,
  MAX_REQUEST_ID_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_TO_LENGTH,
  REQUEST_ID_SLACK,
  SINGLE_LINE,
} from '../constants.js'
import { SendMessageTool } from '../SendMessageTool.js'

const schema = SendMessageTool.inputSchema

const parse = (input: Record<string, unknown>) => schema.safeParse(input)
const shutdownResponse = (requestId: string) => ({
  to: 'lead',
  message: { type: 'shutdown_response', request_id: requestId, approve: true },
})

describe('constantes de cota', () => {
  test('replican los valores del ejecutable', () => {
    expect(MAX_PEER_ADDRESS_LENGTH).toBe(200)
    expect(REQUEST_ID_SLACK).toBe(100)
    expect(MAX_REQUEST_ID_LENGTH).toBe(300)
    expect(MAX_TO_LENGTH).toBe(300)
    expect(MAX_SUMMARY_LENGTH).toBe(200)
  })
})

describe('to', () => {
  test('acepta hasta el máximo', () => {
    expect(parse({ to: 'a'.repeat(MAX_TO_LENGTH), message: 'hi' }).success).toBe(true)
  })
  test('rechaza un carácter más', () => {
    expect(parse({ to: 'a'.repeat(MAX_TO_LENGTH + 1), message: 'hi' }).success).toBe(false)
  })
  test('rechaza saltos de línea', () => {
    expect(parse({ to: 'a\nb', message: 'hi' }).success).toBe(false)
    expect(parse({ to: 'a\rb', message: 'hi' }).success).toBe(false)
  })
})

describe('summary', () => {
  test('acepta hasta el máximo', () => {
    expect(parse({ to: 'x', summary: 's'.repeat(MAX_SUMMARY_LENGTH), message: 'hi' }).success).toBe(true)
  })
  test('rechaza un carácter más', () => {
    expect(parse({ to: 'x', summary: 's'.repeat(MAX_SUMMARY_LENGTH + 1), message: 'hi' }).success).toBe(false)
  })
})

describe('request_id de los mensajes estructurados', () => {
  test('acepta hasta el máximo', () => {
    expect(parse(shutdownResponse('r'.repeat(MAX_REQUEST_ID_LENGTH))).success).toBe(true)
  })
  test('rechaza un carácter más', () => {
    expect(parse(shutdownResponse('r'.repeat(MAX_REQUEST_ID_LENGTH + 1))).success).toBe(false)
  })
  test('rechaza vacío', () => {
    expect(parse(shutdownResponse('')).success).toBe(false)
  })
  test('rechaza saltos de línea', () => {
    expect(parse(shutdownResponse('a\nb')).success).toBe(false)
  })
  test('plan_approval_response aplica las mismas cotas', () => {
    const base = { type: 'plan_approval_response', approve: true }
    const ok = parse({ to: 'lead', message: { ...base, request_id: 'r'.repeat(MAX_REQUEST_ID_LENGTH) } })
    const long = parse({ to: 'lead', message: { ...base, request_id: 'r'.repeat(MAX_REQUEST_ID_LENGTH + 1) } })
    expect(ok.success).toBe(true)
    expect(long.success).toBe(false)
  })
})

describe('SINGLE_LINE', () => {
  test('rechaza \\n y \\r, acepta texto plano', () => {
    expect(SINGLE_LINE.test('abc')).toBe(true)
    expect(SINGLE_LINE.test('a\nb')).toBe(false)
    expect(SINGLE_LINE.test('a\rb')).toBe(false)
  })
})
