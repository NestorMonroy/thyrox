// Copia de `ccnmt: packages/permission/src/toolPermission/permissionLogging.ts`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// Registro centralizado de analítica y telemetría de las decisiones de
// permiso de herramienta. Todos los eventos de aprobación y rechazo pasan por
// `logPermissionDecision()`, que los reparte a la analítica de Statsig, a la
// telemetría de OTel y a las métricas de edición de código.
import { feature } from 'bun:bundle'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { sanitizeToolNameForAnalytics } from '@claude-code-how-works/agent/eventMetadata.js'
import { getCodeEditToolDecisionCounter } from '@claude-code-how-works/app-host/bootstrap/state.js'
import type { Tool as ToolType, ToolUseContext } from '@claude-code-how-works/tool-registry/Tool.js'
import { getLanguageName } from '@claude-code-how-works/output/utils/cliHighlight.js'
import { SandboxManager } from '@claude-code-how-works/shell/sandbox.js'
import { logOTelEvent } from '@claude-code-how-works/local-observability/telemetryEvents.js'
import type {
  PermissionApprovalSource,
  PermissionRejectionSource,
} from './permissionSourceTypes.js'

type PermissionLogContext = {
  tool: ToolType
  input: unknown
  toolUseContext: ToolUseContext
  messageId: string
  toolUseID: string
}

// Unión discriminada: 'accept' se empareja con las fuentes de aprobación, y 'reject' con las de rechazo
type PermissionDecisionArgs =
  | { decision: 'accept'; source: PermissionApprovalSource | 'config' }
  | { decision: 'reject'; source: PermissionRejectionSource | 'config' }

const CODE_EDITING_TOOLS = ['Edit', 'Write', 'NotebookEdit']

function isCodeEditingTool(toolName: string): boolean {
  return CODE_EDITING_TOOLS.includes(toolName)
}

// Construye los atributos del contador de OTel para las herramientas de
// edición de código, enriqueciéndolos con el lenguaje cuando la ruta del
// archivo de destino se puede extraer de la entrada.
async function buildCodeEditToolAttributes(
  tool: ToolType,
  input: unknown,
  decision: 'accept' | 'reject',
  source: string,
): Promise<Record<string, string>> {
  // Derivar el lenguaje de la ruta del archivo si la herramienta expone una (Edit, Write)
  let language: string | undefined
  if (tool.getPath && input) {
    const parseResult = tool.inputSchema.safeParse(input)
    if (parseResult.success) {
      const filePath = tool.getPath(parseResult.data)
      if (filePath) {
        language = await getLanguageName(filePath)
      }
    }
  }

  return {
    decision,
    source,
    tool_name: tool.name,
    ...(language && { language }),
  }
}

// Aplana la fuente estructurada a una etiqueta de cadena para los eventos de analítica y de OTel
function sourceToString(
  source: PermissionApprovalSource | PermissionRejectionSource,
): string {
  if (
    (feature('BASH_CLASSIFIER') || feature('TRANSCRIPT_CLASSIFIER')) &&
    source.type === 'classifier'
  ) {
    return 'classifier'
  }
  switch (source.type) {
    case 'hook':
      return 'hook'
    case 'user':
      return source.permanent ? 'user_permanent' : 'user_temporary'
    case 'user_abort':
      return 'user_abort'
    case 'user_reject':
      return 'user_reject'
    default:
      return 'unknown'
  }
}

function baseMetadata(
  messageId: string,
  toolName: string,
  waitMs: number | undefined,
): { [key: string]: boolean | number | undefined } {
  return {
    messageID:
      messageId as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    toolName: sanitizeToolNameForAnalytics(toolName),
    sandboxEnabled: SandboxManager.isSandboxingEnabled(),
    // Incluir el tiempo de espera sólo cuando de verdad se le preguntó al usuario (no si se auto-aprobó)
    ...(waitMs !== undefined && { waiting_for_user_permission_ms: waitMs }),
  }
}

// Emite un nombre de evento de analítica distinto por cada fuente de aprobación, para el análisis de embudo
function logApprovalEvent(
  tool: ToolType,
  messageId: string,
  source: PermissionApprovalSource | 'config',
  waitMs: number | undefined,
): void {
  if (source === 'config') {
    // Auto-aprobado por la lista de permitidos de los ajustes: sin tiempo de espera del usuario
    logEvent(
      'tengu_tool_use_granted_in_config',
      baseMetadata(messageId, tool.name, undefined),
    )
    return
  }
  if (
    (feature('BASH_CLASSIFIER') || feature('TRANSCRIPT_CLASSIFIER')) &&
    source.type === 'classifier'
  ) {
    logEvent(
      'tengu_tool_use_granted_by_classifier',
      baseMetadata(messageId, tool.name, waitMs),
    )
    return
  }
  switch (source.type) {
    case 'user':
      logEvent(
        source.permanent
          ? 'tengu_tool_use_granted_in_prompt_permanent'
          : 'tengu_tool_use_granted_in_prompt_temporary',
        baseMetadata(messageId, tool.name, waitMs),
      )
      break
    case 'hook':
      logEvent('tengu_tool_use_granted_by_permission_hook', {
        ...baseMetadata(messageId, tool.name, waitMs),
        permanent: source.permanent ?? false,
      })
      break
    default:
      break
  }
}

// Los rechazos comparten un único nombre de evento, y se diferencian por los campos de metadata
function logRejectionEvent(
  tool: ToolType,
  messageId: string,
  source: PermissionRejectionSource | 'config',
  waitMs: number | undefined,
): void {
  if (source === 'config') {
    // Denegado por la lista de denegados de los ajustes
    logEvent(
      'tengu_tool_use_denied_in_config',
      baseMetadata(messageId, tool.name, undefined),
    )
    return
  }
  logEvent('tengu_tool_use_rejected_in_prompt', {
    ...baseMetadata(messageId, tool.name, waitMs),
    // Distinguir el rechazo de un hook del rechazo del usuario con campos aparte
    ...(source.type === 'hook'
      ? { isHook: true }
      : {
          hasFeedback:
            source.type === 'user_reject' ? source.hasFeedback : false,
        }),
  })
}

// Punto de entrada único para todo el registro de decisiones de permiso. Lo
// llaman los manejadores de permiso tras cada aprobación o rechazo. Reparte a
// los eventos de analítica, a la telemetría de OTel, a los contadores de OTel
// de edición de código y al almacén de decisiones de `toolUseContext`.
function logPermissionDecision(
  ctx: PermissionLogContext,
  args: PermissionDecisionArgs,
  permissionPromptStartTimeMs?: number,
): void {
  const { tool, input, toolUseContext, messageId, toolUseID } = ctx
  const { decision, source } = args

  const waiting_for_user_permission_ms =
    permissionPromptStartTimeMs !== undefined
      ? Date.now() - permissionPromptStartTimeMs
      : undefined

  // Registrar el evento de analítica
  if (args.decision === 'accept') {
    logApprovalEvent(
      tool,
      messageId,
      args.source,
      waiting_for_user_permission_ms,
    )
  } else {
    logRejectionEvent(
      tool,
      messageId,
      args.source,
      waiting_for_user_permission_ms,
    )
  }

  const sourceString = source === 'config' ? 'config' : sourceToString(source)

  // Seguir las métricas de las herramientas de edición de código
  if (isCodeEditingTool(tool.name)) {
    void buildCodeEditToolAttributes(tool, input, decision, sourceString).then(
      attributes => getCodeEditToolDecisionCounter()?.add(1, attributes),
    )
  }

  // Persistir la decisión en el contexto, para que el código de aguas abajo pueda inspeccionar qué pasó
  if (!toolUseContext.toolDecisions) {
    toolUseContext.toolDecisions = new Map()
  }
  toolUseContext.toolDecisions.set(toolUseID, {
    source: sourceString,
    decision,
    timestamp: Date.now(),
  })

  void logOTelEvent('tool_decision', {
    decision,
    source: sourceString,
    tool_name: sanitizeToolNameForAnalytics(tool.name),
    tool_use_id: toolUseID, // ant 3144.js: required for span-correlation
  })
}

export { isCodeEditingTool, buildCodeEditToolAttributes, logPermissionDecision }
export type { PermissionLogContext, PermissionDecisionArgs }
