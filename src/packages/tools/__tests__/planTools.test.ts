/**
 * Las herramientas `EnterPlanMode` y `ExitPlanMode` sobre el modo de
 * `@thyrox/plan/mode` (TASK-API-0059). El contrato del modo en sí —ruta,
 * mensaje, puerta, estados, variantes— se prueba en su paquete.
 *
 * Fuente: los esquemas del binario 2.1.261 — `EnterPlanMode` no recibe
 * parámetros; `ExitPlanMode` no recibe el contenido y lo lee del archivo.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PlanMode } from '@thyrox/plan/mode'
import { planTools } from '../src/plan.ts'
import type { ToolContext } from '@thyrox/agent/loop/types'

function raiz(): string {
  return mkdtempSync(join(tmpdir(), 'planmode-'))
}

function contexto(cwd: string): ToolContext {
  return { cwd, sessionId: 's1', abort: new AbortController().signal, messages: [] }
}

describe('ExitPlanMode lee del archivo, no de un parámetro', () => {
  test('rehúsa sin archivo y rehúsa con archivo vacío', async () => {
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    modo.enter()
    const [, exit] = planTools(modo)
    expect((await exit!.run({}, contexto(root))).isError).toBe(true)
    modo.write('   \n  ')
    expect((await exit!.run({}, contexto(root))).isError).toBe(true)
    expect(modo.current()).toBe('planning')
  })

  test('con plan escrito pasa a esperar aprobación y devuelve el texto', async () => {
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    modo.enter()
    modo.write('# Plan\n\n1. Medir\n2. Portar\n')
    const [, exit] = planTools(modo)
    const r = await exit!.run({}, contexto(root))
    expect(r.isError).toBe(false)
    expect(r.content).toContain('2. Portar')
    expect(modo.current()).toBe('awaitingApproval')
  })
})

describe('EnterPlanMode', () => {
  test('no recibe parámetros y entrega las instrucciones con la ruta', async () => {
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    const [enter] = planTools(modo)
    expect(Object.keys(enter!.input_schema.properties ?? {})).toHaveLength(0)
    const r = await enter!.run({}, contexto(root))
    expect(r.content).toContain(modo.path)
    expect(modo.current()).toBe('planning')
  })

  test('entrar dos veces es idempotente y no pierde el estado de aprobación', async () => {
    const root = raiz()
    const modo = new PlanMode('s1', { projectRoot: root, plansDir: 'plans' })
    const [enter] = planTools(modo)
    await enter!.run({}, contexto(root))
    modo.write('# Plan')
    modo.requestApproval()
    await enter!.run({}, contexto(root))
    expect(modo.current()).toBe('awaitingApproval')
  })
})
