/**
 * Porte de `ccnmt: packages/agent/__tests__/taskSchema.behavior.test.ts`.
 *
 * Fija los invariantes del schema de Task. Las herramientas TaskCreate/
 * TaskUpdate/TaskList validan todas contra TaskSchema; cualquier drift
 * rompe el protocolo entero de la lista de tareas (validación de entrada
 * del LLM, forma del JSON persistido).
 */
import { describe, expect, test } from 'bun:test'

import { TASK_STATUSES, TaskSchema, TaskStatusSchema } from '../tasks.ts'

describe('Task schema invariants', () => {
  test('TASK_STATUSES = ["pending", "in_progress", "completed"] (exact order)', () => {
    // El orden a veces lo usan las capas de presentación — se fija.
    expect([...TASK_STATUSES]).toEqual(['pending', 'in_progress', 'completed'])
  })

  test('TaskStatusSchema accepts ONLY the 3 valid statuses', () => {
    const schema = TaskStatusSchema()
    expect(schema.parse('pending')).toBe('pending')
    expect(schema.parse('in_progress')).toBe('in_progress')
    expect(schema.parse('completed')).toBe('completed')
    expect(() => schema.parse('done')).toThrow()
    expect(() => schema.parse('')).toThrow()
    expect(() => schema.parse('PENDING')).toThrow()
  })

  test('TaskSchema requires id, subject, description, status, blocks, blockedBy', () => {
    const schema = TaskSchema()
    const valid = {
      id: '1',
      subject: 'Test',
      description: 'desc',
      status: 'pending' as const,
      blocks: [],
      blockedBy: [],
    }
    expect(() => schema.parse(valid)).not.toThrow()

    // Cada campo obligatorio, al faltar, → lanza
    for (const field of ['id', 'subject', 'description', 'status', 'blocks', 'blockedBy'] as const) {
      const partial = { ...valid }
      delete (partial as any)[field]
      expect(() => schema.parse(partial)).toThrow()
    }
  })

  test('blocks/blockedBy must be arrays of strings (not undefined, not nested)', () => {
    const schema = TaskSchema()
    const base = {
      id: '1',
      subject: 'T',
      description: 'D',
      status: 'pending' as const,
    }
    expect(() => schema.parse({ ...base, blocks: [], blockedBy: [] })).not.toThrow()
    expect(() => schema.parse({ ...base, blocks: ['2'], blockedBy: [] })).not.toThrow()
    expect(() => schema.parse({ ...base, blocks: [2 as any], blockedBy: [] })).toThrow()
    expect(() => schema.parse({ ...base, blocks: undefined as any, blockedBy: [] })).toThrow()
  })

  test('optional fields: activeForm, owner, metadata', () => {
    const schema = TaskSchema()
    const base = {
      id: '1',
      subject: 'T',
      description: 'D',
      status: 'pending' as const,
      blocks: [],
      blockedBy: [],
    }
    expect(() => schema.parse(base)).not.toThrow() // todos los opcionales omitidos
    expect(() =>
      schema.parse({ ...base, activeForm: 'Doing T', owner: 'agent-1', metadata: { x: 1 } }),
    ).not.toThrow()
  })

  test('metadata accepts arbitrary keys with unknown values', () => {
    const schema = TaskSchema()
    const base = {
      id: '1',
      subject: 'T',
      description: 'D',
      status: 'pending' as const,
      blocks: [],
      blockedBy: [],
    }
    // String, number, boolean, array, objeto anidado
    expect(() =>
      schema.parse({
        ...base,
        metadata: { str: 'x', num: 1, bool: true, arr: [1, 2], obj: { nested: 'y' } },
      }),
    ).not.toThrow()
  })

  test('id is a string (NOT number) — pin so TaskCreate doesn\'t accept numeric IDs', () => {
    // La marca de agua alta guarda el ID máximo como string; IDs numéricos
    // romperían la comparación lexicográfica y causarían colisiones.
    const schema = TaskSchema()
    const base = {
      id: 1 as any,
      subject: 'T',
      description: 'D',
      status: 'pending' as const,
      blocks: [],
      blockedBy: [],
    }
    expect(() => schema.parse(base)).toThrow()
  })

  test('rejects unknown statuses ("deleted" not in core schema)', () => {
    // "deleted" es un verbo solo-de-TaskUpdate que borra la tarea; no es
    // un estado persistente. Se fija para que un refactor "agreguemos
    // deleted al enum" que no auditó a todos los consumidores no se cuele.
    const schema = TaskSchema()
    const base = {
      id: '1',
      subject: 'T',
      description: 'D',
      status: 'deleted' as any,
      blocks: [],
      blockedBy: [],
    }
    expect(() => schema.parse(base)).toThrow()
  })
})
