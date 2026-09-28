/**
 * El esquema de un destino del MITM valida lo que el registro de targets
 * declara por agente.
 */
import { expect, test } from 'bun:test'
import { MITM_AGENT_IDS, MitmTargetSchema } from '../src/types.ts'

const valid = {
  id: 'codex',
  name: 'Codex',
  icon: 'terminal',
  color: '#10A37F',
  hosts: ['chatgpt.com'],
  setupTutorial: { steps: ['paso'], detection: { command: 'codex --version', platform: 'all' } },
  riskNoticeKey: 'risk.codex',
}

test('un destino válido pasa y recibe los defectos', () => {
  const parsed = MitmTargetSchema.parse(valid)
  expect(parsed.port).toBe(443)
  expect(parsed.endpointPatterns).toEqual([])
  expect(parsed.defaultModels).toEqual([])
})

test('rechaza un agente fuera de la lista, un color mal formado y hosts vacíos', () => {
  expect(MitmTargetSchema.safeParse({ ...valid, id: 'otro' }).success).toBe(false)
  expect(MitmTargetSchema.safeParse({ ...valid, color: 'rojo' }).success).toBe(false)
  expect(MitmTargetSchema.safeParse({ ...valid, hosts: [] }).success).toBe(false)
})

test('la lista de agentes es la del registro de OmniRoute', () => {
  expect([...MITM_AGENT_IDS]).toEqual([
    'antigravity', 'kiro', 'copilot', 'codex', 'cursor', 'zed',
    'claude-code', 'open-code', 'trae', 'ghe-copilot',
  ])
})
