/**
 * Control de `@thyrox/repl/testing`: los dobles de la superficie del REPL que
 * otros paquetes necesitan en sus pruebas.
 *
 * Existe porque dos paquetes los fabricaban a mano: el motor de `Workflow`
 * (`agent/workflow/__tests__/engine.test.ts`) un `CanUseToolFn` que siempre
 * permite, y `powerup` (`command-runtime`) un `Select` que no renderiza.
 *
 * Qué haría fallar a este control:
 * - que el doble permisivo no devuelva la entrada que recibió: el contrato de
 *   `PermissionAllowDecision` es que `updatedInput` sustituye a la entrada, y
 *   un `{}` fijo borraría los argumentos de la herramienta;
 * - que el registro no conserve el orden ni el `toolUseID` de cada llamada;
 * - que una decisión declarada no se devuelva tal cual;
 * - que el `Select` sustituto intente renderizar en vez de exponer sus props.
 */
import { describe, expect, test } from 'bun:test'
import {
  createRecordingCanUseTool,
  selectStubModule,
} from '../../testing/index.js'

const tool = { name: 'Bash' } as never
const context = {} as never
const message = {} as never

describe('createRecordingCanUseTool', () => {
  test('por defecto permite y devuelve la entrada recibida como updatedInput', async () => {
    const { canUseTool } = createRecordingCanUseTool()
    const decision = await canUseTool(tool, { command: 'ls' }, context, message, 'tu-1')
    expect(decision).toEqual({ behavior: 'allow', updatedInput: { command: 'ls' } })
  })

  test('registra cada llamada, en orden, con su herramienta, entrada e id', async () => {
    const { canUseTool, calls } = createRecordingCanUseTool()
    await canUseTool(tool, { a: 1 }, context, message, 'tu-1')
    await canUseTool(tool, { b: 2 }, context, message, 'tu-2')
    expect(calls.map(call => [call.toolName, call.input, call.toolUseID])).toEqual([
      ['Bash', { a: 1 }, 'tu-1'],
      ['Bash', { b: 2 }, 'tu-2'],
    ])
  })

  test('una decisión declarada se devuelve tal cual', async () => {
    const deny = { behavior: 'deny', message: 'no', decisionReason: { type: 'other', reason: 'x' } } as never
    const { canUseTool } = createRecordingCanUseTool(() => deny)
    expect(await canUseTool(tool, {}, context, message, 'tu-1')).toBe(deny)
  })
})

describe('selectStubModule', () => {
  test('el Select sustituto expone sus props sin renderizar', () => {
    const { Select } = selectStubModule()
    const props = { options: [{ label: 'a', value: 'a' }] }
    expect(Select(props)).toEqual({ props, _stub: 'select' })
  })
})
