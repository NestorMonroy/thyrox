/**
 * La mitad ROJA de los útiles TaskGet y TaskList.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/{TaskGetTool,
 * TaskListTool}/` (3 archivos cada uno: el útil, su constante de nombre y su
 * prompt). Ese árbol no declara licencia, así que los cuerpos se
 * reimplementan y no se copian.
 *
 * POR QUÉ AHORA. Los dos consultan `isTodoV2Enabled()` en su `isEnabled()`, y
 * esa función acaba de aterrizar en `@thyrox/agent/tasks.js` al cerrar su
 * bloqueo real (`getIsNonInteractiveSession`). Antes de eso el útil se podía
 * escribir pero no se podía habilitar.
 *
 * Métrica: qué devuelve cada útil ante un listado de tareas real en disco, y
 * qué texto arma para quien lee el resultado.
 * Ciega a: el despacho —si el bucle los llama— y el esquema de entrada más
 * allá de su forma; eso lo mide el registro de útiles, no esta suite.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { createTask, updateTask } from '@thyrox/agent/tasks.js'
import {
  resetStateForTests,
  setIsInteractive,
} from '@thyrox/app-host/bootstrap/state.js'
import { TaskGetTool } from '../TaskGetTool/TaskGetTool.ts'
import { TaskListTool } from '../TaskListTool/TaskListTool.ts'

const LISTA = 'task-tools-tests'
let configPrevio: string | undefined
let listaPrevia: string | undefined
let raiz: string

beforeEach(async () => {
  configPrevio = process.env.CLAUDE_CONFIG_DIR
  listaPrevia = process.env.CLAUDE_CODE_TASK_LIST_ID
  raiz = await mkdtemp('/dev/shm/tool-registry-tareas-')
  process.env.CLAUDE_CONFIG_DIR = raiz
  process.env.CLAUDE_CODE_TASK_LIST_ID = LISTA
  resetStateForTests()
  setIsInteractive(true)
})

afterEach(async () => {
  if (configPrevio === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = configPrevio
  if (listaPrevia === undefined) delete process.env.CLAUDE_CODE_TASK_LIST_ID
  else process.env.CLAUDE_CODE_TASK_LIST_ID = listaPrevia
  await rm(raiz, { recursive: true, force: true })
})

async function crear(
  subject: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  return createTask(LISTA, {
    subject,
    description: `descripción de ${subject}`,
    status: 'pending',
    owner: undefined,
    blocks: [],
    blockedBy: [],
    ...extra,
  } as never)
}

/** El contexto que `call` recibe; ninguno de los dos útiles lo mira. */
const CTX = {} as never

describe('TaskGetTool — 7 casos', () => {
  test('1. se nombra igual en el protocolo y ante la persona', () => {
    expect(TaskGetTool.name).toBe('TaskGet')
    expect(TaskGetTool.userFacingName()).toBe('TaskGet')
  })

  test('2. se apaga con la sesión no interactiva', () => {
    setIsInteractive(true)
    expect(TaskGetTool.isEnabled()).toBe(true)
    setIsInteractive(false)
    expect(TaskGetTool.isEnabled()).toBe(false)
  })

  test('3. es de sólo lectura y seguro ante concurrencia', () => {
    expect(TaskGetTool.isReadOnly()).toBe(true)
    expect(TaskGetTool.isConcurrencySafe()).toBe(true)
  })

  test('4. una tarea que existe vuelve con sus seis campos', async () => {
    const id = await crear('arreglar el login')
    const { data } = await TaskGetTool.call({ taskId: id }, CTX)
    expect(data.task).toEqual({
      id,
      subject: 'arreglar el login',
      description: 'descripción de arreglar el login',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    })
  })

  test('5. una tarea que NO existe vuelve nula, no revienta', async () => {
    const { data } = await TaskGetTool.call({ taskId: '9999' }, CTX)
    expect(data.task).toBeNull()
  })

  test('6. el bloque de resultado lo dice cuando no la halla', () => {
    const bloque = TaskGetTool.mapToolResultToToolResultBlockParam(
      { task: null },
      'uso-1',
    )
    expect(bloque.content).toBe('Task not found')
    expect(bloque.tool_use_id).toBe('uso-1')
  })

  test('7. el bloque nombra dependencias SÓLO cuando las hay', () => {
    const sin = TaskGetTool.mapToolResultToToolResultBlockParam(
      { task: { id: '1', subject: 's', description: 'd', status: 'pending', blocks: [], blockedBy: [] } },
      'uso-2',
    )
    expect(String(sin.content)).not.toContain('Blocked by')
    expect(String(sin.content)).not.toContain('Blocks:')

    const con = TaskGetTool.mapToolResultToToolResultBlockParam(
      { task: { id: '1', subject: 's', description: 'd', status: 'pending', blocks: ['3'], blockedBy: ['2'] } },
      'uso-3',
    )
    expect(String(con.content)).toContain('Blocked by: #2')
    expect(String(con.content)).toContain('Blocks: #3')
  })
})

describe('TaskListTool — 7 casos', () => {
  test('8. se nombra igual en el protocolo y ante la persona', () => {
    expect(TaskListTool.name).toBe('TaskList')
    expect(TaskListTool.userFacingName()).toBe('TaskList')
  })

  test('9. se apaga con la sesión no interactiva', () => {
    setIsInteractive(false)
    expect(TaskListTool.isEnabled()).toBe(false)
  })

  test('10. lista lo que hay en el listado', async () => {
    await crear('primera')
    await crear('segunda')
    const { data } = await TaskListTool.call({}, CTX)
    expect(data.tasks.map(t => t.subject).sort()).toEqual(['primera', 'segunda'])
  })

  test('11. las tareas internas NO se listan', async () => {
    await crear('visible')
    await crear('interna', { metadata: { _internal: true } })
    const { data } = await TaskListTool.call({}, CTX)
    expect(data.tasks.map(t => t.subject)).toEqual(['visible'])
  })

  test('12. un bloqueante YA completado deja de contarse como bloqueo', async () => {
    // Es la decisión no obvia del útil: sin este filtro, una tarea seguiría
    // reportándose bloqueada por algo que ya terminó, y quien lea la lista
    // no la tomaría.
    const hecha = await crear('la que ya terminó')
    const pendiente = await crear('la que espera', { blockedBy: [hecha] })
    await updateTask(LISTA, hecha, { status: 'completed' })

    const { data } = await TaskListTool.call({}, CTX)
    const fila = data.tasks.find(t => t.id === pendiente)!
    expect(fila.blockedBy).toEqual([])
  })

  test('13. sin tareas, el bloque lo dice', () => {
    const bloque = TaskListTool.mapToolResultToToolResultBlockParam(
      { tasks: [] },
      'uso-4',
    )
    expect(bloque.content).toBe('No tasks found')
  })

  test('14. el bloque marca dueño y bloqueo SÓLO cuando los hay', () => {
    const bloque = TaskListTool.mapToolResultToToolResultBlockParam(
      {
        tasks: [
          { id: '1', subject: 'sola', status: 'pending', blockedBy: [] },
          { id: '2', subject: 'con dueño', status: 'in_progress', owner: 'ana', blockedBy: ['1'] },
        ],
      },
      'uso-5',
    )
    const lineas = String(bloque.content).split('\n')
    expect(lineas[0]).toBe('#1 [pending] sola')
    expect(lineas[1]).toBe('#2 [in_progress] con dueño (ana) [blocked by #1]')
  })
})
