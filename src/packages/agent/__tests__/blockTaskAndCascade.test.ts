/**
 * Porte de `ccnmt: packages/agent/__tests__/blockTaskAndCascade.test.ts`.
 *
 * Tests para los invariantes del grafo de dependencias en tasks.ts:
 *
 *   - blockTask debe rechazar ciclos (auto-lazo, A↔B, A→B→C→A) al momento
 *     de escribir. La implementacion anterior los aceptaba en silencio y
 *     el ciclo interbloqueaba a claimTask.
 *   - blockTask es bipartito: todo (A.blocks ∋ B) debe tener su
 *     (B.blockedBy ∋ A) correspondiente, y las llamadas concurrentes no
 *     deben romper esto.
 *   - cascadeUnblockOnCompletion debe scrubbear el ID de la tarea
 *     completada del blockedBy de cada otra tarea, y reportar cuales
 *     tareas quedaron completamente desbloqueadas. Sin esto, el filtro
 *     del lado de lectura de claimTask tapa el sintoma pero la salida
 *     de TaskGet sigue mostrando dependencias fantasma.
 *
 * Cada test corre contra un CLAUDE_CONFIG_DIR aislado (mkdtemp) para no
 * colisionar con `~/.claude/tasks` real de quien opera. El candado (en
 * esta version portada: un mutex en proceso indexado por ruta — ver el
 * docstring de tasks.ts) es compartido entre archivos, asi que se corren
 * los tests en serie (sin `test.concurrent`) para evitar contencion de
 * candado entre casos no relacionados.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { TaskCycleError } from '../errors.ts'
import {
  blockTask,
  cascadeUnblockOnCompletion,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../tasks.ts'

const TASK_LIST_ID = 'block-task-tests'

let originalConfigDir: string | undefined
let tmpRoot: string

beforeEach(async () => {
  originalConfigDir = process.env.CLAUDE_CONFIG_DIR
  tmpRoot = await mkdtemp(join(tmpdir(), 'ccb-tasks-'))
  process.env.CLAUDE_CONFIG_DIR = tmpRoot
})

afterEach(async () => {
  if (originalConfigDir === undefined) {
    delete process.env.CLAUDE_CONFIG_DIR
  } else {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  }
  await rm(tmpRoot, { recursive: true, force: true })
})

async function makeTask(subject: string): Promise<string> {
  return createTask(TASK_LIST_ID, {
    subject,
    description: subject,
    status: 'pending',
    owner: undefined,
    blocks: [],
    blockedBy: [],
  })
}

describe('blockTask — cycle detection', () => {
  test('self-loop is rejected', async () => {
    const a = await makeTask('a')
    expect(blockTask(TASK_LIST_ID, a, a)).rejects.toBeInstanceOf(TaskCycleError)
  })

  test('two-node cycle (A↔B) is rejected', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    await blockTask(TASK_LIST_ID, a, b) // ok: a → b
    expect(blockTask(TASK_LIST_ID, b, a)).rejects.toBeInstanceOf(
      TaskCycleError,
    )
  })

  test('three-node cycle (A→B→C→A) is rejected', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    await blockTask(TASK_LIST_ID, a, b)
    await blockTask(TASK_LIST_ID, b, c)
    expect(blockTask(TASK_LIST_ID, c, a)).rejects.toBeInstanceOf(
      TaskCycleError,
    )
  })

  test('cycle error includes the offending path', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    await blockTask(TASK_LIST_ID, a, b)
    await blockTask(TASK_LIST_ID, b, c)
    let caught: TaskCycleError | undefined
    try {
      await blockTask(TASK_LIST_ID, c, a)
    } catch (err) {
      if (err instanceof TaskCycleError) caught = err
    }
    expect(caught).toBeDefined()
    // El camino empieza y termina con la fuente ofensora (`c`, el
    // fromTaskId de la llamada blockTask rechazada) — ese es el ciclo
    // que habriamos cerrado al aceptar la arista.
    expect(caught!.path[0]).toBe(c)
    expect(caught!.path.at(-1)).toBe(c)
    // Y la cadena intermedia visita las aristas existentes (a, b).
    expect(caught!.path).toContain(a)
    expect(caught!.path).toContain(b)
  })

  test('non-cyclic edge passes', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    expect(blockTask(TASK_LIST_ID, a, b)).resolves.toBe(true)
    const taskA = await getTask(TASK_LIST_ID, a)
    const taskB = await getTask(TASK_LIST_ID, b)
    expect(taskA?.blocks).toEqual([b])
    expect(taskB?.blockedBy).toEqual([a])
  })
})

describe('blockTask — bipartite invariant', () => {
  test('idempotent: calling twice does not duplicate', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    await blockTask(TASK_LIST_ID, a, b)
    await blockTask(TASK_LIST_ID, a, b)
    const taskA = await getTask(TASK_LIST_ID, a)
    const taskB = await getTask(TASK_LIST_ID, b)
    expect(taskA?.blocks).toEqual([b])
    expect(taskB?.blockedBy).toEqual([a])
  })

  test('concurrent blockTask of distinct edges keeps invariant', async () => {
    // El trabajo se reparte entre varias fuentes/destinos para que las
    // aristas sean independientes — el test verifica si el candado a
    // nivel de lista las serializa lo suficientemente bien para
    // mantener el invariante bipartito honesto. Con la implementacion
    // vieja de candado por tarea, las aristas hacia el mismo destino
    // competian y una direccion podia perderse.
    const sources = await Promise.all([
      makeTask('s1'),
      makeTask('s2'),
      makeTask('s3'),
      makeTask('s4'),
    ])
    const target = await makeTask('t')

    await Promise.all(sources.map(s => blockTask(TASK_LIST_ID, s, target)))

    const all = await listTasks(TASK_LIST_ID)
    const t = all.find(x => x.id === target)!
    expect(t.blockedBy.sort()).toEqual([...sources].sort())
    for (const s of sources) {
      const sTask = all.find(x => x.id === s)!
      expect(sTask.blocks).toEqual([target])
    }
  })

  test('repairs missing reverse edge when one side already has it', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    // Se crea manualmente un estado inconsistente (solo la arista hacia
    // adelante).
    await updateTask(TASK_LIST_ID, a, { blocks: [b] })
    expect((await getTask(TASK_LIST_ID, b))?.blockedBy).toEqual([])

    await blockTask(TASK_LIST_ID, a, b)
    expect((await getTask(TASK_LIST_ID, b))?.blockedBy).toEqual([a])
    expect((await getTask(TASK_LIST_ID, a))?.blocks).toEqual([b])
  })
})

describe('cascadeUnblockOnCompletion', () => {
  test('removes completed task ID from other tasks blockedBy', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    await blockTask(TASK_LIST_ID, a, b)
    await blockTask(TASK_LIST_ID, a, c)

    await updateTask(TASK_LIST_ID, a, { status: 'completed' })
    const result = await cascadeUnblockOnCompletion(TASK_LIST_ID, a)
    expect(result.newlyUnblockedIds.sort()).toEqual([b, c].sort())

    const taskB = await getTask(TASK_LIST_ID, b)
    const taskC = await getTask(TASK_LIST_ID, c)
    expect(taskB?.blockedBy).toEqual([])
    expect(taskC?.blockedBy).toEqual([])
    // La propia lista .blocks de la tarea completada tambien se
    // scrubbea (las entradas ahora son referencias obsoletas — se
    // restaura la simetria).
    const taskA = await getTask(TASK_LIST_ID, a)
    expect(taskA?.blocks).toEqual([])
  })

  test('does not report still-blocked tasks as newly unblocked', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    // c bloqueada por a y por b
    await blockTask(TASK_LIST_ID, a, c)
    await blockTask(TASK_LIST_ID, b, c)

    await updateTask(TASK_LIST_ID, a, { status: 'completed' })
    const result = await cascadeUnblockOnCompletion(TASK_LIST_ID, a)
    // c sigue bloqueada por b; NO deberia estar en newlyUnblockedIds
    expect(result.newlyUnblockedIds).toEqual([])

    const taskC = await getTask(TASK_LIST_ID, c)
    expect(taskC?.blockedBy).toEqual([b])
  })

  test('completing the last blocker unblocks the dependent', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    await blockTask(TASK_LIST_ID, a, c)
    await blockTask(TASK_LIST_ID, b, c)

    await updateTask(TASK_LIST_ID, a, { status: 'completed' })
    await cascadeUnblockOnCompletion(TASK_LIST_ID, a)

    await updateTask(TASK_LIST_ID, b, { status: 'completed' })
    const result = await cascadeUnblockOnCompletion(TASK_LIST_ID, b)
    expect(result.newlyUnblockedIds).toEqual([c])
  })
})

describe('deleteTask cascade', () => {
  test('removes references from both blocks and blockedBy', async () => {
    const a = await makeTask('a')
    const b = await makeTask('b')
    const c = await makeTask('c')
    await blockTask(TASK_LIST_ID, a, b)
    await blockTask(TASK_LIST_ID, b, c)

    expect(await deleteTask(TASK_LIST_ID, b)).toBe(true)
    const taskA = await getTask(TASK_LIST_ID, a)
    const taskC = await getTask(TASK_LIST_ID, c)
    expect(taskA?.blocks).toEqual([]) // b removida
    expect(taskC?.blockedBy).toEqual([]) // b removida
  })

  test('high water mark advances on delete to block ID reuse', async () => {
    // deleteTask corre la escritura de la marca de agua alta dentro del
    // mismo candado de lista que el borrado del archivo + la cascada.
    // Sin esto, un createTask concurrente podria asignar el mismo ID
    // que estamos borrando antes de que corra la cascada, y la tarea
    // nueva heredaria las aristas a punto de scrubbearse. Se verifica
    // borrando una tarea y confirmando luego que el siguiente
    // createTask obtiene un ID mas alto (la marca de agua alta subio
    // el contador).
    const a = await makeTask('first') // id "1"
    expect(await deleteTask(TASK_LIST_ID, a)).toBe(true)
    const b = await makeTask('second') // NO debe reciclar "1"
    expect(b).not.toBe(a)
    expect(parseInt(b, 10)).toBeGreaterThan(parseInt(a, 10))
  })
})
