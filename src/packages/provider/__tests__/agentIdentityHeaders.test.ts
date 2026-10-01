/**
 * Las cabeceras con que el cliente identifica al subagente que hace la
 * petición: porte del tramo `V`/`n3n` de `EV` (constructor del cliente del
 * ejecutable 2.1.283; extracción en
 * `.claude/workbench/session-headers-20260927T183409/outputs/`). El hilo principal no las
 * manda; un subagente manda su id y, si lo tiene, el de su agente padre, con
 * los caracteres no imprimibles y `%` codificados.
 */
import { describe, expect, test } from 'bun:test'
import { AGENT_ID_HEADER, PARENT_AGENT_ID_HEADER, agentIdentityHeaders, encodeHeaderValue } from '../src/anthropic/agentIdentityHeaders.ts'

describe('agentIdentityHeaders (EV, tramo V)', () => {
  test('sin contexto de agente no hay cabeceras', () => {
    expect(agentIdentityHeaders(undefined)).toEqual({})
  })

  test('el hilo principal no se identifica', () => {
    expect(agentIdentityHeaders({ agentType: 'main', agentId: 'a1' })).toEqual({})
  })

  test('un subagente manda su id, y el de su padre cuando lo tiene', () => {
    expect(agentIdentityHeaders({ agentType: 'subagent', agentId: 'a1' })).toEqual({ [AGENT_ID_HEADER]: 'a1' })
    expect(agentIdentityHeaders({ agentType: 'subagent', agentId: 'a2', parentAgentId: 'a1' })).toEqual({
      [AGENT_ID_HEADER]: 'a2',
      [PARENT_AGENT_ID_HEADER]: 'a1',
    })
  })

  test('los ids viajan codificados', () => {
    expect(agentIdentityHeaders({ agentType: 'subagent', agentId: 'niño%1' })).toEqual({ [AGENT_ID_HEADER]: 'ni%C3%B1o%251' })
  })

  test('los nombres son los de thyrox', () => {
    expect(AGENT_ID_HEADER).toBe('x-thyrox-agent-id')
    expect(PARENT_AGENT_ID_HEADER).toBe('x-thyrox-parent-agent-id')
  })
})

describe('encodeHeaderValue (n3n)', () => {
  test('codifica % y lo que no es ASCII imprimible; deja el resto', () => {
    expect(encodeHeaderValue('agente-1')).toBe('agente-1')
    expect(encodeHeaderValue('100%')).toBe('100%25')
    expect(encodeHeaderValue('niño')).toBe('ni%C3%B1o')
    expect(encodeHeaderValue('a\nb')).toBe('a%0Ab')
  })
})
