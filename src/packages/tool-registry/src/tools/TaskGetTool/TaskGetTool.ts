/**
 * `TaskGet` — una tarea completa, por su identificador.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/TaskGetTool/TaskGetTool.ts`.
 * Ese árbol no declara licencia, así que el cuerpo se reimplementa y no se
 * copia. Porte COMPLETO.
 *
 * `isEnabled()` consulta `isTodoV2Enabled()`, que hasta el pase anterior no
 * existía en este árbol: el útil se podía escribir pero no se podía habilitar.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { z } from 'zod/v4'
import {
  getTask,
  getTaskListId,
  isTodoV2Enabled,
  TaskStatusSchema,
} from '@thyrox/agent/tasks.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { TASK_GET_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    taskId: z.string().describe('The ID of the task to retrieve'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    task: z
      .object({
        id: z.string(),
        subject: z.string(),
        description: z.string(),
        status: TaskStatusSchema(),
        blocks: z.array(z.string()),
        blockedBy: z.array(z.string()),
      })
      .nullable(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TaskGetTool = buildTool({
  name: TASK_GET_TOOL_NAME,
  searchHint: 'retrieve a task by ID',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'TaskGet'
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
  toAutoClassifierInput(input) {
    return input.taskId
  },
  renderToolUseMessage() {
    return null
  },
  async call({ taskId }) {
    const task = await getTask(getTaskListId(), taskId)

    // Una tarea ausente NO es un error: quien pregunta puede tener un id
    // viejo, y reventar obligaría a envolver cada consulta en un intento.
    if (!task) return { data: { task: null } }

    return {
      data: {
        task: {
          id: task.id,
          subject: task.subject,
          description: task.description,
          status: task.status,
          blocks: task.blocks,
          blockedBy: task.blockedBy,
        },
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const { task } = content as Output
    if (!task) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: 'Task not found',
      }
    }

    const lines = [
      `Task #${task.id}: ${task.subject}`,
      `Status: ${task.status}`,
      `Description: ${task.description}`,
    ]

    // Las dependencias aparecen SÓLO cuando las hay: una lista vacía impresa
    // como `Blocked by: ` se lee como un dato faltante, no como su ausencia.
    if (task.blockedBy.length > 0) {
      lines.push(`Blocked by: ${task.blockedBy.map(id => `#${id}`).join(', ')}`)
    }
    if (task.blocks.length > 0) {
      lines.push(`Blocks: ${task.blocks.map(id => `#${id}`).join(', ')}`)
    }

    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
