/**
 * `TaskList` — el resumen de todas las tareas del listado.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/TaskListTool/TaskListTool.ts`.
 * Ese árbol no declara licencia, así que el cuerpo se reimplementa y no se
 * copia. Porte COMPLETO.
 *
 * LA DECISIÓN QUE NO ES OBVIA: un bloqueante YA completado se retira del
 * `blockedBy` que se publica. Sin ese filtro una tarea seguiría reportándose
 * bloqueada por algo que terminó, y quien lea la lista no la tomaría — el
 * listado diría «esperá» sobre trabajo que ya está disponible.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { z } from 'zod/v4'
import {
  getTaskListId,
  isTodoV2Enabled,
  listTasks,
  TaskStatusSchema,
} from '@thyrox/agent/tasks.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { TASK_LIST_TOOL_NAME } from './constants.js'
import { DESCRIPTION, getPrompt } from './prompt.js'

const inputSchema = lazySchema(() => z.strictObject({}))
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    tasks: z.array(
      z.object({
        id: z.string(),
        subject: z.string(),
        status: TaskStatusSchema(),
        owner: z.string().optional(),
        blockedBy: z.array(z.string()),
      }),
    ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TaskListTool = buildTool({
  name: TASK_LIST_TOOL_NAME,
  searchHint: 'list all tasks',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return getPrompt()
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'TaskList'
  },
  shouldDefer: true,
  isEnabled() {
    return isTodoV2Enabled()
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  renderToolUseMessage() {
    return null
  },
  async call() {
    const todas = (await listTasks(getTaskListId())).filter(
      t => !t.metadata?._internal,
    )

    const resueltas = new Set(
      todas.filter(t => t.status === 'completed').map(t => t.id),
    )

    const tasks = todas.map(task => ({
      id: task.id,
      subject: task.subject,
      status: task.status,
      owner: task.owner,
      blockedBy: task.blockedBy.filter(id => !resueltas.has(id)),
    }))

    return { data: { tasks } }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const { tasks } = content as Output
    if (tasks.length === 0) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: 'No tasks found',
      }
    }

    const lines = tasks.map(task => {
      const owner = task.owner ? ` (${task.owner})` : ''
      const blocked =
        task.blockedBy.length > 0
          ? ` [blocked by ${task.blockedBy.map(id => `#${id}`).join(', ')}]`
          : ''
      return `#${task.id} [${task.status}] ${task.subject}${owner}${blocked}`
    })

    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
