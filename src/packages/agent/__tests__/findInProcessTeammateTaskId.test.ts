/**
 * Porte de `ccnmt: packages/agent/__tests__/findInProcessTeammateTaskId.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 *
 * Tests de findInProcessTeammateTaskId — helper puro que ubica el task ID
 * de un teammate in-process por nombre de agente. El líder lo usa para
 * encontrar la tarea a la que enviarle mensajes, actualizar
 * awaitingPlanApproval, etc.
 *
 * Equivocarse = el líder no encuentra la tarea → el mensaje no llega a
 * ningún lado → ruptura silenciosa de la coordinación entre teammates.
 *
 * Búsqueda discriminada por tipo: sólo hacen match las tareas donde
 * type === 'in_process_teammate' Y identity.agentName === input.
 */
import { describe, expect, test } from 'bun:test'
import { findInProcessTeammateTaskId } from '../inProcessTeammateHelpers.js'

type AppState = Parameters<typeof findInProcessTeammateTaskId>[1]

const buildAppState = (tasks: Record<string, unknown>): AppState =>
  ({ tasks }) as AppState

const teammateTask = (
  id: string,
  agentName: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  type: 'in_process_teammate',
  identity: { agentName, teamName: 'team' },
  ...overrides,
})

describe('findInProcessTeammateTaskId — búsqueda básica', () => {
  test('nombre de agente coincidente → task id', () => {
    const r = findInProcessTeammateTaskId(
      'researcher',
      buildAppState({
        t1: teammateTask('t1', 'researcher'),
      }),
    )
    expect(r).toBe('t1')
  })

  test('nombre de agente sin coincidencia → undefined', () => {
    const r = findInProcessTeammateTaskId(
      'unknown',
      buildAppState({
        t1: teammateTask('t1', 'researcher'),
      }),
    )
    expect(r).toBeUndefined()
  })

  test('tasks vacío → undefined', () => {
    expect(
      findInProcessTeammateTaskId('researcher', buildAppState({})),
    ).toBeUndefined()
  })
})

describe('findInProcessTeammateTaskId — discriminación por tipo', () => {
  test('tareas que no son in-process se ignoran aunque el nombre coincida', () => {
    // local_bash con el mismo agentName NO debe hacer match.
    const r = findInProcessTeammateTaskId(
      'researcher',
      buildAppState({
        t1: {
          id: 't1',
          type: 'local_bash',
          identity: { agentName: 'researcher' },
        },
      }),
    )
    expect(r).toBeUndefined()
  })

  test('tareas que no son objeto se saltan sin crashear', () => {
    expect(() =>
      findInProcessTeammateTaskId(
        'researcher',
        buildAppState({
          t1: null,
          t2: 'string',
          t3: 42,
        }),
      ),
    ).not.toThrow()
  })

  test('tarea con type=in_process_teammate pero sin identity → LANZA', () => {
    // Bug FIJADO (locked): isInProcessTeammateTask sólo chequea `type`, no
    // la forma de identity. Así que una tarea malformada pasa el
    // predicado, y luego `task.identity.agentName` lanza TypeError.
    //
    // Es responsabilidad del llamador asegurar que las tareas estén bien
    // formadas; el predicado se podría endurecer para chequear identity
    // también, pero eso es un cambio aparte. Este test fija el
    // comportamiento actual para que un refactor no cambie en silencio
    // crash → retorno-undefined.
    expect(() =>
      findInProcessTeammateTaskId(
        'researcher',
        buildAppState({
          t1: {
            id: 't1',
            type: 'in_process_teammate',
            // Sin campo identity
          },
        }),
      ),
    ).toThrow(TypeError)
  })
})

describe('findInProcessTeammateTaskId — múltiples tareas', () => {
  test('devuelve la primera tarea que hace match en orden de iteración', () => {
    // Object.values itera en orden de inserción; el helper devuelve el
    // primer match.
    const r = findInProcessTeammateTaskId(
      'researcher',
      buildAppState({
        t1: teammateTask('t1', 'other'),
        t2: teammateTask('t2', 'researcher'),
        t3: teammateTask('t3', 'researcher'), // nombre duplicado (no debería pasar, pero fija el comportamiento)
      }),
    )
    expect(r).toBe('t2')
  })

  test('tipos de tarea mixtos: sólo cuenta el in-process teammate', () => {
    const r = findInProcessTeammateTaskId(
      'researcher',
      buildAppState({
        t1: { id: 't1', type: 'local_bash', identity: { agentName: 'researcher' } },
        t2: teammateTask('t2', 'other'),
        t3: teammateTask('t3', 'researcher'),
      }),
    )
    expect(r).toBe('t3')
  })
})

describe('findInProcessTeammateTaskId — casos límite', () => {
  test('el match del nombre de agente distingue mayúsculas/minúsculas', () => {
    const r = findInProcessTeammateTaskId(
      'Researcher',
      buildAppState({
        t1: teammateTask('t1', 'researcher'),
      }),
    )
    expect(r).toBeUndefined()
  })

  test('nombre de agente vacío → sólo hace match con la tarea de nombre vacío', () => {
    expect(
      findInProcessTeammateTaskId(
        '',
        buildAppState({
          t1: teammateTask('t1', 'researcher'),
        }),
      ),
    ).toBeUndefined()
    expect(
      findInProcessTeammateTaskId(
        '',
        buildAppState({
          t1: teammateTask('t1', ''),
        }),
      ),
    ).toBe('t1')
  })

  test('un espacio en el nombre de agente se trata como parte del nombre', () => {
    expect(
      findInProcessTeammateTaskId(
        'researcher ',
        buildAppState({
          t1: teammateTask('t1', 'researcher'),
        }),
      ),
    ).toBeUndefined()
  })
})
