import { feature } from 'bun:bundle'
import { useEffect, useRef } from 'react'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { sanitizeToolNameForAnalytics } from '@claude-code-how-works/agent/eventMetadata.js'
import { BashTool } from '@claude-code-how-works/tool-registry/tools/BashTool/BashTool.js'
import { splitCommand } from '@claude-code-how-works/shell/bash/commands.js'
import type {
  PermissionDecisionReason,
  PermissionResult,
} from '../PermissionResult.js'
import {
  extractRules,
  hasRules,
} from '../PermissionUpdate.js'
import { permissionRuleValueToString } from '../permissionRuleParser.js'
import { SandboxManager } from '@claude-code-how-works/shell/sandbox.js'
import type { ToolUseConfirm } from './PermissionRequest.js'
import { useSetAppState } from '../appStateHooks.js'
import { env } from '@claude-code-how-works/config/env/paths'
import { jsonStringify } from '@claude-code-how-works/local-observability/slowOperations.js'
import { type CompletionType, logUnaryEvent } from '@claude-code-how-works/local-observability/logging'
import { readEnv } from '@claude-code-how-works/config/env'

export type UnaryEvent = {
  completion_type: CompletionType
  language_name: string | Promise<string>
}

function permissionResultToLog(permissionResult: PermissionResult): string {
  switch (permissionResult.behavior) {
    case 'allow':
      return 'allow'
    case 'ask': {
      const rules = extractRules(permissionResult.suggestions)
      const suggestions =
        rules.length > 0
          ? rules.map(r => permissionRuleValueToString(r)).join(', ')
          : 'none'
      return `ask: ${permissionResult.message}, 
suggestions: ${suggestions}
reason: ${decisionReasonToString(permissionResult.decisionReason)}`
    }
    case 'deny':
      return `deny: ${permissionResult.message},
reason: ${decisionReasonToString(permissionResult.decisionReason)}`
    case 'passthrough': {
      const rules = extractRules(permissionResult.suggestions)
      const suggestions =
        rules.length > 0
          ? rules.map(r => permissionRuleValueToString(r)).join(', ')
          : 'none'
      return `passthrough: ${permissionResult.message},
suggestions: ${suggestions}
reason: ${decisionReasonToString(permissionResult.decisionReason)}`
    }
  }
}

function decisionReasonToString(
  decisionReason: PermissionDecisionReason | undefined,
): string {
  if (!decisionReason) {
    return 'No decision reason'
  }
  if (
    (feature('BASH_CLASSIFIER') || feature('TRANSCRIPT_CLASSIFIER')) &&
    decisionReason.type === 'classifier'
  ) {
    return `Classifier: ${decisionReason.classifier}, Reason: ${decisionReason.reason}`
  }
  switch (decisionReason.type) {
    case 'rule':
      return `Rule: ${permissionRuleValueToString(decisionReason.rule.ruleValue)}`
    case 'mode':
      return `Mode: ${decisionReason.mode}`
    case 'subcommandResults':
      return `Subcommand Results: ${Array.from(decisionReason.reasons.entries())
        .map(([key, value]) => `${key}: ${permissionResultToLog(value)}`)
        .join(', \n')}`
    case 'permissionPromptTool':
      return `Permission Tool: ${decisionReason.permissionPromptToolName}, Result: ${jsonStringify(decisionReason.toolResult)}`
    case 'hook':
      return `Hook: ${decisionReason.hookName}${decisionReason.reason ? `, Reason: ${decisionReason.reason}` : ''}`
    case 'workingDir':
      return `Working Directory: ${decisionReason.reason}`
    case 'safetyCheck':
      return `Safety check: ${decisionReason.reason}`
    case 'other':
      return `Other: ${decisionReason.reason}`
    default:
      return jsonStringify(decisionReason, null, 2)
  }
}

/**
 * Copia de `ccnmt: packages/permission/src/components/hooks.ts` con los
 * comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Registra los eventos de petición de permiso con la analítica y con el
 * registro unario. Se ocupa de los dos: del evento de analítica y del registro
 * del evento unario.
 */
export function usePermissionRequestLogging(
  toolUseConfirm: ToolUseConfirm,
  unaryEvent: UnaryEvent,
): void {
  const setAppState = useSetAppState()
  // Guarda contra que el efecto se vuelva a disparar si la referencia del
  // objeto `toolUseConfirm` cambia durante la vida de un mismo diálogo (por
  // ejemplo, si el padre re-renderiza con un objeto nuevo). Sin esto, el
  // `setAppState` incondicional de abajo puede desatar un bucle infinito de
  // microtareas: cada re-disparo hace otra expansión de `setAppState` y, en
  // las builds de ant, un `splitCommand` con su expresión regular de
  // `shell-quote`, clavando la CPU al 100 % y filtrando unos 500 MB por minuto
  // en asignaciones de `JSRopeString` y `RegExp`. El componente lleva
  // `toolUseID` como clave, así que esta ref se reinicia al remontar — sólo
  // hace falta deduplicar los re-disparos DENTRO de una misma instancia del
  // diálogo.
  const loggedToolUseID = useRef<string | null>(null)

  useEffect(() => {
    if (loggedToolUseID.current === toolUseConfirm.toolUseID) {
      return
    }
    loggedToolUseID.current = toolUseConfirm.toolUseID

    // Incrementar el conteo de prompts de permiso, para la atribución
    setAppState(prev => ({
      ...prev,
      attribution: {
        ...prev.attribution,
        permissionPromptCount: prev.attribution.permissionPromptCount + 1,
      },
    }))

    // Registrar el evento de analítica
    logEvent('tengu_tool_use_show_permission_request', {
      messageID: toolUseConfirm.assistantMessage.message
        .id as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      toolName: sanitizeToolNameForAnalytics(toolUseConfirm.tool.name),
      isMcp: toolUseConfirm.tool.isMcp ?? false,
      decisionReasonType: toolUseConfirm.permissionResult.decisionReason
        ?.type as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      sandboxEnabled: SandboxManager.isSandboxingEnabled(),
    })

    if (process.env.USER_TYPE === 'ant') {
      const permissionResult = toolUseConfirm.permissionResult
      if (
        toolUseConfirm.tool.name === BashTool.name &&
        permissionResult.behavior === 'ask' &&
        !hasRules(permissionResult.suggestions)
      ) {
        // Registrar si no se proveen sugerencias de regla («always allow»)
        logEvent('tengu_internal_tool_use_permission_request_no_always_allow', {
          messageID: toolUseConfirm.assistantMessage.message
            .id as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          toolName: sanitizeToolNameForAnalytics(toolUseConfirm.tool.name),
          isMcp: toolUseConfirm.tool.isMcp ?? false,
          decisionReasonType: (permissionResult.decisionReason?.type ??
            'unknown') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          sandboxEnabled: SandboxManager.isSandboxingEnabled(),

          // ¡Esto SÍ contiene código y rutas de archivo, y no debe registrarse en la build pública!
          decisionReasonDetails: decisionReasonToString(
            permissionResult.decisionReason,
          ) as never,
        })
      }
    }

    // [SÓLO-ANT] Registrar las llamadas a la herramienta bash, para poder
    // categorizar y reducir las llamadas que deberían haberse permitido.
    if (process.env.USER_TYPE === 'ant') {
      const parsedInput = BashTool.inputSchema.safeParse(toolUseConfirm.input)
      if (
        toolUseConfirm.tool.name === BashTool.name &&
        toolUseConfirm.permissionResult.behavior === 'ask' &&
        parsedInput.success
      ) {
        // Nota: todos los campos de metadata de este evento contienen código y rutas de archivo
        let split = [parsedInput.data.command]
        try {
          split = splitCommand(parsedInput.data.command)
        } catch {
          // Ignore parse errors here - just log the full command
        }
        logEvent('tengu_internal_bash_tool_use_permission_request', {
          parts: jsonStringify(
            split,
          ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          input: jsonStringify(
            toolUseConfirm.input,
          ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          decisionReasonType: toolUseConfirm.permissionResult.decisionReason
            ?.type as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          decisionReason: decisionReasonToString(
            toolUseConfirm.permissionResult.decisionReason,
          ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      }
    }

    void logUnaryEvent({
      completion_type: unaryEvent.completion_type,
      event: 'response',
      metadata: {
        language_name: unaryEvent.language_name,
        message_id: toolUseConfirm.assistantMessage.message.id,
        platform: env.platform,
      },
    })
  }, [toolUseConfirm, unaryEvent, setAppState])
}
