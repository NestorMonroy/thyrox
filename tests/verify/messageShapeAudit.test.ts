import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auditScope } from '../../src/verify/message_shape_audit.ts'

// Fixture minima con los nombres reales de los alias: la familia se decide
// por el alias del tipo, asi que un nombre inventado no ejercitaria nada.
const root = mkdtempSync(join(tmpdir(), 'shape-audit-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const scope = join(root, 'agent')
mkdirSync(scope, { recursive: true })
writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler' } }))
writeFileSync(join(scope, 'types.ts'), `
export type CoreAssistantMessage = { type: 'assistant'; content: unknown[]; [key: string]: unknown }
export type CoreMessage = CoreAssistantMessage
export type AgentMessage = { type: string; message?: { content?: unknown[] }; [key: string]: unknown }
`)
writeFileSync(join(scope, 'loop.ts'), `
import type { AgentMessage, CoreAssistantMessage, CoreMessage } from './types'
type ProviderEvent = { type: string; [key: string]: unknown }
export function readsBothShapes(m: CoreAssistantMessage) {
  const raw = m as CoreAssistantMessage & { message?: { content?: unknown[] } }
  return raw.message?.content ?? m.content
}
export function castsProviderEvent(e: ProviderEvent) {
  return e as unknown as CoreAssistantMessage
}
export function castsBackToAgent(ms: CoreMessage[]) {
  return ms as unknown as AgentMessage[]
}
export function toCoreMessages(ms: AgentMessage[]): CoreMessage[] {
  return ms as unknown as CoreMessage[]
}
export function readsFlatOnly(m: CoreAssistantMessage) {
  return m.content
}
export function readsAgentNested(m: AgentMessage) {
  return m.message?.content
}
`)

const { findings, files } = auditScope(root, join(root, 'tsconfig.json'), scope)
const at = (code: string) => findings.filter(f => f.code === code).map(f => `${f.file.split('/').pop()}:${f.line}`)

describe('message_shape_audit', () => {
  test('mide los dos archivos del alcance', () => {
    expect(files).toBe(2)
  })

  test('SHAPE001: la lectura .message sobre un CoreMessage, y solo esa', () => {
    // linea 6: raw.message?.content — readsFlatOnly (linea 18) no cuenta.
    expect(at('SHAPE001')).toEqual(['loop.ts:6'])
  })

  test('SHAPE002: los dos cruces sin adaptador, no el del adaptador', () => {
    // linea 9: evento ajeno -> Core; linea 12: Core -> Agent. El cast dentro
    // de toCoreMessages (linea 15) es la frontera nombrada y no cuenta.
    expect(at('SHAPE002')).toEqual(['loop.ts:9', 'loop.ts:12'])
  })

  test('no confunde la interseccion Core & {message} con un cruce', () => {
    // linea 5: Core -> Core & {...}; misma familia, no es frontera.
    expect(at('SHAPE002')).not.toContain('loop.ts:5')
  })
})
