/**
 * Porte de `ccnmt: packages/agent/__tests__/agentErrors.test.ts`.
 * Lo que un consumidor compara es el `code`, no el mensaje: por eso los casos
 * miden el codigo, su prefijo y su unicidad, no la prosa.
 */
import { describe, expect, test } from 'bun:test'
import {
  AgentBaseError,
  HostBindingsError,
  StateError,
  TaskCycleError,
  UserAbort,
} from '../errors.ts'

describe('AgentBaseError', () => {
  test('conserva el codigo explicito', () => {
    expect(new AgentBaseError('AGENT_X', 'boom').code).toBe('AGENT_X')
  })

  test('es una instancia de Error', () => {
    expect(new AgentBaseError('AGENT_X', 'boom')).toBeInstanceOf(Error)
  })

  test('propaga la causa', () => {
    const cause = new Error('raiz')
    expect(new AgentBaseError('AGENT_X', 'boom', { cause }).cause).toBe(cause)
  })

  test('su nombre por defecto es AgentBaseError', () => {
    expect(new AgentBaseError('AGENT_X', 'boom').name).toBe('AgentBaseError')
  })
})

describe('HostBindingsError', () => {
  test('su codigo es AGENT_HOST_BINDINGS_ERROR', () => {
    expect(new HostBindingsError('sin ataduras').code).toBe('AGENT_HOST_BINDINGS_ERROR')
  })

  test('su nombre es AgentHostBindingsError', () => {
    expect(new HostBindingsError('sin ataduras').name).toBe('AgentHostBindingsError')
  })

  test('extiende AgentBaseError', () => {
    expect(new HostBindingsError('sin ataduras')).toBeInstanceOf(AgentBaseError)
  })
})

describe('StateError', () => {
  test('su codigo es AGENT_STATE_ERROR', () => {
    expect(new StateError('estado roto').code).toBe('AGENT_STATE_ERROR')
  })

  test('su nombre es AgentStateError', () => {
    expect(new StateError('estado roto').name).toBe('AgentStateError')
  })

  test('extiende AgentBaseError', () => {
    expect(new StateError('estado roto')).toBeInstanceOf(AgentBaseError)
  })
})

describe('TaskCycleError', () => {
  test('lleva el camino que cerro el ciclo', () => {
    expect(new TaskCycleError(['A', 'B', 'A']).path).toEqual(['A', 'B', 'A'])
  })

  test('el mensaje nombra el camino, que es lo accionable', () => {
    expect(new TaskCycleError(['A', 'B', 'A']).message).toContain('A → B → A')
  })

  test('su codigo es AGENT_TASK_CYCLE', () => {
    expect(new TaskCycleError(['A', 'A']).code).toBe('AGENT_TASK_CYCLE')
  })
})

describe('UserAbort — marcador de simbolo unico', () => {
  test('es un simbolo, no una subclase de Error', () => {
    expect(typeof UserAbort).toBe('symbol')
  })

  test('su descripcion es UserAbort', () => {
    expect(UserAbort.description).toBe('UserAbort')
  })

  test('se compara por identidad', () => {
    const thrown: unknown = UserAbort
    expect(thrown === UserAbort).toBe(true)
  })

  test('NO es constructor: `new` sobre el simbolo revienta', () => {
    // @ts-expect-error — el contrato es justamente que no se puede construir
    expect(() => new UserAbort()).toThrow()
  })
})

describe('unicidad de los codigos', () => {
  const codes = [
    new HostBindingsError('x').code,
    new StateError('x').code,
    new TaskCycleError(['a', 'a']).code,
  ]

  test('los codigos de las subclases son distintos entre si', () => {
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('todos empiezan con el prefijo AGENT_', () => {
    for (const c of codes) expect(c.startsWith('AGENT_')).toBe(true)
  })
})
