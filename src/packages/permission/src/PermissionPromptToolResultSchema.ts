/**
 * El contrato de la herramienta de solicitud de permiso: qué entra, qué puede
 * responder un anfitrión SDK, y cómo esa respuesta se normaliza a una decisión.
 *
 * Procedencia: `ccnmt: packages/permission/src/PermissionPromptToolResultSchema.ts`
 * (130 líneas, 5 exports). Ese árbol declara `"license": "UNLICENSED"`, así
 * que los cuerpos se **reimplementan** y no se copian.
 *
 * Este es un borde de PROCESO: lo que llega viene de un anfitrión que no
 * controlamos. Por eso el esquema es zod y no un tipo — el tipo se borra al
 * compilar y no valida nada de lo que cruza el borde.
 *
 * Su criterio de tolerancia recorre el archivo entero y conviene leerlo junto:
 * un campo AUXILIAR mal formado cae a indefinido en vez de tumbar la decisión,
 * porque rechazarla entera convertiría un permiso concedido en una denegación
 * silenciosa. Lo que NO tolera es que falte lo esencial —el comportamiento, el
 * mensaje de una denegación— porque ahí no hay valor por defecto seguro.
 *
 * DIVERGENCIA DECLARADA: `Tool` y `ToolUseContext` van como tipos inline
 * laxos, igual que en la fuente, que ya los declara así con el comentario
 * "inlined type-only imports from Tool.ts". No se amplía.
 */
import z from 'zod/v4'
import { getPermissionHostBindings } from './host.js'

type Tool = { name: string; [key: string]: unknown }
type ToolUseContext = {
  setAppState: (updater: (prev: never) => unknown) => void
  abortController: { abort: () => void }
}

import { lazySchema } from '../internal/lazySchema.js'
import type {
  PermissionDecision,
  PermissionDecisionReason,
} from './PermissionResult.js'
import {
  applyPermissionUpdates,
  persistPermissionUpdates,
} from './PermissionUpdate.js'
import { permissionUpdateSchema } from './PermissionUpdateSchema.js'

export const inputSchema = lazySchema(() =>
  z.object({
    tool_name: z.string().describe('The name of the tool requesting permission'),
    input: z.record(z.string(), z.unknown()).describe('The input for the tool'),
    tool_use_id: z.string().optional().describe('The unique tool use request ID'),
  }),
)

export type Input = z.infer<ReturnType<typeof inputSchema>>

/**
 * Quién tomó la decisión y con qué alcance. Un valor desconocido cae a
 * indefinido en vez de rechazar: es metadata de atribución, no la decisión.
 */
const decisionClassificationField = lazySchema(() =>
  z
    .enum(['user_temporary', 'user_permanent', 'user_reject'])
    .optional()
    .catch(undefined),
)

const PermissionAllowResultSchema = lazySchema(() =>
  z.object({
    behavior: z.literal('allow'),
    updatedInput: z.record(z.string(), z.unknown()),
    updatedPermissions: z
      .array(permissionUpdateSchema())
      .optional()
      .catch(ctx => {
        getPermissionHostBindings().logDebug?.(
          `Malformed updatedPermissions from SDK host ignored: ${ctx.error.issues[0]?.message ?? 'unknown'}`,
          { level: 'warn' },
        )
        return undefined
      }),
    toolUseID: z.string().optional(),
    decisionClassification: decisionClassificationField(),
  }),
)

const PermissionDenyResultSchema = lazySchema(() =>
  z.object({
    behavior: z.literal('deny'),
    message: z.string(),
    interrupt: z.boolean().optional(),
    toolUseID: z.string().optional(),
    decisionClassification: decisionClassificationField(),
  }),
)

export const outputSchema = lazySchema(() =>
  z.union([PermissionAllowResultSchema(), PermissionDenyResultSchema()]),
)

export type Output = z.infer<ReturnType<typeof outputSchema>>

/**
 * Normaliza lo que respondió el anfitrión a una decisión de permiso, aplicando
 * de paso los cambios de permiso que traiga.
 */
export function permissionPromptToolResultToPermissionDecision(
  result: Output,
  tool: Tool,
  input: { [key: string]: unknown },
  toolUseContext: ToolUseContext,
): PermissionDecision {
  const decisionReason: PermissionDecisionReason = {
    type: 'permissionPromptTool',
    permissionPromptToolName: tool.name,
    toolResult: result,
  } as PermissionDecisionReason

  if (result.behavior === 'allow') {
    const updatedPermissions = result.updatedPermissions
    if (updatedPermissions) {
      toolUseContext.setAppState(prev => ({
        ...(prev as object),
        toolPermissionContext: applyPermissionUpdates(
          (prev as { toolPermissionContext: never }).toolPermissionContext,
          updatedPermissions,
        ),
      }))
      persistPermissionUpdates(updatedPermissions)
    }
    // Un cliente móvil que responde desde una notificación no tiene la entrada
    // original y manda `{}` sólo para satisfacer el esquema. Tomarlo al pie de
    // la letra ejecutaría la herramienta SIN argumentos, que es peor que
    // ejecutarla con los que el usuario ya había visto al aprobarla.
    const updatedInput =
      Object.keys(result.updatedInput).length > 0 ? result.updatedInput : input
    return {
      ...result,
      updatedInput,
      decisionReason,
    } as PermissionDecision
  } else if (result.behavior === 'deny' && result.interrupt) {
    getPermissionHostBindings().logDebug?.(
      `SDK permission prompt deny+interrupt: tool=${tool.name} message=${result.message}`,
    )
    toolUseContext.abortController.abort()
  }
  return {
    ...result,
    decisionReason,
  } as PermissionDecision
}
