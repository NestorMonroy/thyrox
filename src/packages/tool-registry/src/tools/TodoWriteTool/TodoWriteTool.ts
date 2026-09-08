/**
 * El útil que lleva la lista de pendientes de la sesión.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/TodoWriteTool/
 * TodoWriteTool.ts` (108 líneas, 2 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * SE HABILITA AL REVÉS QUE LA FAMILIA Task, y ésa es la decisión que hace
 * que las dos no coexistan: `TaskGet`/`TaskList`/`TaskCreate` se encienden
 * con `isTodoV2Enabled()`, éste con su negación. Una sesión tiene una lista
 * de pendientes o la tiene la otra familia, nunca las dos — dos paneles con
 * dos verdades sobre el mismo trabajo es peor que ninguno.
 *
 * DIVERGENCIA DECLARADA — la macro de compilación. La fuente gatea el
 * empujón de verificación con `feature('VERIFICATION_AGENT')` de
 * `bun:bundle`, que es el sistema de flags de compilación propio de `ccnmt`
 * y aquí no resuelve (medido). Se usa el sustituto de
 * `internal/pendingCrossPackageDeps.ts`, que devuelve `false` siempre: cada
 * rama gateada por esa macro es una capacidad opcional que, apagada, deja
 * intacto el camino base. El texto del empujón SÍ se porta completo — lo
 * arma `mapToolResultToToolResultBlockParam`, que no depende de la macro.
 */
import { z } from 'zod/v4'
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { isTodoV2Enabled } from '@thyrox/agent/tasks.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { feature } from '../../internal/pendingCrossPackageDeps.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { TodoListSchema } from '../../todo/types.js'
import { VERIFICATION_AGENT_TYPE } from '../AgentTool/constants.js'
import { TODO_WRITE_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    todos: TodoListSchema().describe('The updated todo list'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    oldTodos: TodoListSchema().describe('The todo list before the update'),
    newTodos: TodoListSchema().describe('The todo list after the update'),
    verificationNudgeNeeded: z.boolean().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TodoWriteTool = buildTool({
  name: TODO_WRITE_TOOL_NAME,
  searchHint: 'manage the session task checklist',
  maxResultSizeChars: 100_000,
  strict: true,
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
  // Vacío a propósito: el útil no aparece en la línea de estado, sólo su
  // efecto en el panel de pendientes.
  userFacingName() {
    return ''
  },
  shouldDefer: true,
  isEnabled() {
    return !isTodoV2Enabled()
  },
  toAutoClassifierInput(input) {
    return `${input.todos.length} items`
  },
  async checkPermissions(input) {
    // Escribir la lista de pendientes no toca nada fuera del estado de la
    // sesión: no hay qué autorizar.
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call({ todos }, context) {
    const appState = context.getAppState()
    // Un subagente escribe bajo SU identificador; sin esa separación dos
    // subagentes concurrentes se pisarían la lista.
    const todoKey = context.agentId ?? getSessionId()
    const oldTodos = appState.todos[todoKey] ?? []
    const allDone = todos.every(_ => _.status === 'completed')
    // La lista toda completada se VACÍA en el estado: dejar el panel con
    // tareas hechas hace que la siguiente vuelta las lea como trabajo vivo.
    const newTodos = allDone ? [] : todos

    // Empujón estructural: si el hilo principal cierra una lista de 3 o más
    // y ninguna de esas entradas era un paso de verificación, se recuerda
    // levantar al verificador. Dispara en el instante exacto de salida del
    // bucle, que es donde el salto ocurre.
    let verificationNudgeNeeded = false
    if (
      feature('VERIFICATION_AGENT') &&
      getFeatureValue_CACHED_MAY_BE_STALE('tengu_hive_evidence', false) &&
      !context.agentId &&
      allDone &&
      todos.length >= 3 &&
      !todos.some(t => /verif/i.test(t.content))
    ) {
      verificationNudgeNeeded = true
    }

    context.setAppState(prev => ({
      ...prev,
      todos: {
        ...prev.todos,
        [todoKey]: newTodos,
      },
    }))

    return {
      data: {
        oldTodos,
        // La lista COMPLETA, no la vaciada: el estado se vacía para el
        // panel, pero quien lee el resultado tiene que ver qué se cerró.
        newTodos: todos,
        verificationNudgeNeeded,
      },
    }
  },
  mapToolResultToToolResultBlockParam({ verificationNudgeNeeded }, toolUseID) {
    const base = `Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable`
    const nudge = verificationNudgeNeeded
      ? `\n\nNOTE: You just closed out 3+ tasks and none of them was a verification step. Before writing your final summary, spawn the verification agent (subagent_type="${VERIFICATION_AGENT_TYPE}"). You cannot self-assign PARTIAL by listing caveats in your summary — only the verifier issues a verdict.`
      : ''
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: base + nudge,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
