/**
 * Porte de `ccnmt: packages/agent/__tests__/agentIdUtils.test.ts`.
 * La direccion de un agente dentro de un equipo, y la del pedido que se
 * le hace: dos formas compuestas que se arman y se desarman sin ambiguedad.
 */
import { describe, expect, test } from 'bun:test'
import {
  formatAgentId,
  generateRequestId,
  parseAgentId,
  parseRequestId,
} from '../src/agentIdUtils.ts'

describe('formatAgentId', () => {
  test('une el nombre del agente y el del equipo con arroba', () => {
    expect(formatAgentId('researcher', 'my-team')).toBe('researcher@my-team')
  })
  test('admite el equipo vacio: degenerado pero dentro del contrato', () => {
    expect(formatAgentId('alice', '')).toBe('alice@')
  })
  test('admite guiones y guiones bajos en los nombres', () => {
    expect(formatAgentId('team-lead_2', 'proj_alpha')).toBe('team-lead_2@proj_alpha')
  })
})

describe('parseAgentId', () => {
  test('parte en la PRIMERA arroba', () => {
    expect(parseAgentId('researcher@my-team')).toEqual({ agentName: 'researcher', teamName: 'my-team' })
  })
  test('devuelve nulo sin arroba', () => {
    expect(parseAgentId('plain-name')).toBeNull()
  })
  test('cierra el ciclo con formatAgentId', () => {
    expect(parseAgentId(formatAgentId('alice', 'beta'))).toEqual({ agentName: 'alice', teamName: 'beta' })
  })
  test('gana la primera arroba: el equipo puede contener arrobas', () => {
    expect(parseAgentId('alice@team@nested')).toEqual({ agentName: 'alice', teamName: 'team@nested' })
  })
  test('admite el nombre o el equipo vacios', () => {
    expect(parseAgentId('@team')).toEqual({ agentName: '', teamName: 'team' })
    expect(parseAgentId('alice@')).toEqual({ agentName: 'alice', teamName: '' })
  })
})

describe('generateRequestId', () => {
  test('la forma es <tipo>-<marca de tiempo>@<agente>', () => {
    expect(/^shutdown-\d+@alice@team$/.test(generateRequestId('shutdown', 'alice@team'))).toBe(true)
  })
  test('la marca de tiempo es la epoca en milisegundos del momento', () => {
    const before = Date.now()
    const id = generateRequestId('plan', 'alice@team')
    const after = Date.now()
    const ts = parseInt(id.match(/^plan-(\d+)@/)![1]!, 10)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
  test('conserva las arrobas del agente', () => {
    expect(generateRequestId('test', 'a@b').includes('@a@b')).toBe(true)
  })
})

describe('parseRequestId', () => {
  test('desarma un identificador bien formado', () => {
    expect(parseRequestId('shutdown-1700000000000@alice@team')).toEqual({
      requestType: 'shutdown',
      timestamp: 1700000000000,
      agentId: 'alice@team',
    })
  })
  test('admite guiones dentro del tipo: el ULTIMO separa la marca de tiempo', () => {
    expect(parseRequestId('plan-approval-1700000000000@alice@team')).toEqual({
      requestType: 'plan-approval',
      timestamp: 1700000000000,
      agentId: 'alice@team',
    })
  })
  test('devuelve nulo sin arroba', () => {
    expect(parseRequestId('plain-1234567')).toBeNull()
  })
  test('devuelve nulo si el prefijo no tiene guion', () => {
    expect(parseRequestId('foo@alice')).toBeNull()
  })
  test('devuelve nulo si la marca de tiempo no es numerica', () => {
    expect(parseRequestId('shutdown-NaN@alice')).toBeNull()
    expect(parseRequestId('shutdown-abc@alice')).toBeNull()
  })
  test('cierra el ciclo con generateRequestId', () => {
    const parsed = parseRequestId(generateRequestId('test', 'a@b'))
    expect(parsed?.requestType).toBe('test')
    expect(parsed?.agentId).toBe('a@b')
    expect(typeof parsed?.timestamp).toBe('number')
  })
})
