import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useTheme } from '@anthropic/ink'
import { useKeybinding } from '@anthropic/ink/keybindings'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { sanitizeToolNameForAnalytics } from '@thyrox/agent/eventMetadata.js'
import { getDestructiveCommandWarning } from '@thyrox/tool-registry/tools/PowerShellTool/destructiveCommandWarning.js'
import { PowerShellTool } from '@thyrox/tool-registry/tools/PowerShellTool/PowerShellTool.js'
import { isAllowlistedCommand } from '@thyrox/tool-registry/tools/PowerShellTool/readOnlyValidation.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import { getCompoundCommandPrefixesStatic } from '@thyrox/shell/powershell/staticPrefix.js'
import { Select } from '@thyrox/repl/components/CustomSelect/select.js'
import { type UnaryEvent, usePermissionRequestLogging } from '../hooks.js'
import { PermissionDecisionDebugInfo } from '../PermissionDecisionDebugInfo.js'
import { PermissionDialog } from '../PermissionDialog.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js'
import { useShellPermissionFeedback } from '../useShellPermissionFeedback.js'
import { logUnaryPermissionEvent } from '../utils.js'
import { powershellToolUseOptions } from './powershellToolUseOptions.js'

export function PowerShellPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  const { toolUseConfirm, toolUseContext, onDone, onReject, workerBadge } =
    props

  const { command, description } = PowerShellTool.inputSchema.parse(
    toolUseConfirm.input,
  )

  const [theme] = useTheme()
  const {
    yesInputMode,
    noInputMode,
    yesFeedbackModeEntered,
    noFeedbackModeEntered,
    acceptFeedback,
    rejectFeedback,
    setAcceptFeedback,
    setRejectFeedback,
    focusedOption,
    handleInputModeToggle,
    handleReject,
    handleFocus,
  } = useShellPermissionFeedback({
    toolUseConfirm,
    onDone,
    onReject,
  })
  const destructiveWarning = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_destructive_command_warning',
    false,
  )
    ? getDestructiveCommandWarning(command)
    : null

  const [showPermissionDebug, setShowPermissionDebug] = useState(false)

  // Copia de `ccnmt: packages/permission/src/components/PowerShellPermissionRequest/PowerShellPermissionRequest.tsx`
  // con los comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Prefijo editable — el prefijo estático se calcula en local, sin llamar al
  // LLM. Se inicializa de forma síncrona al comando en crudo cuando es de una
  // sola línea, para que el campo editable se renderice de inmediato, y
  // después se refina al prefijo extraído en cuanto el parser de AST resuelve.
  // Un comando de varias líneas (`# comment\n...`, un bucle `foreach`) recibe
  // `undefined` → `powershellToolUseOptions:64` oculta la opción de «no me lo
  // vuelvas a preguntar»: esos literales son de un solo uso (el corpus de
  // ajustes tiene 14 reglas de varias líneas y ninguna casa dos veces). En un
  // comando compuesto calcula un prefijo por subcomando, excluyendo los que ya
  // se auto-permiten por ser de sólo lectura.
  const [editablePrefix, setEditablePrefix] = useState<string | undefined>(
    command.includes('\n') ? undefined : command,
  )
  const hasUserEditedPrefix = useRef(false)
  useEffect(() => {
    let cancelled = false
    // El filtro recibe un `ParsedCommandElement` — `isAllowlistedCommand`
    // trabaja directamente desde `element.name`, `nameType` y `args`.
    // `isReadOnlyCommand(text)` tendría que volver a parsear (un `pwsh.exe`
    // lanzado por subcomando) y devuelve false sin el AST completo, con lo que
    // el filtro quedaría en un no-op.
    getCompoundCommandPrefixesStatic(command, element =>
      isAllowlistedCommand(element, element.text),
    )
      .then(prefixes => {
        if (cancelled || hasUserEditedPrefix.current) return
        if (prefixes.length > 0) {
          setEditablePrefix(`${prefixes[0]}:*`)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  const onEditablePrefixChange = useCallback((value: string) => {
    hasUserEditedPrefix.current = true
    setEditablePrefix(value)
  }, [])

  const unaryEvent = useMemo<UnaryEvent>(
    () => ({ completion_type: 'tool_use_single', language_name: 'none' }),
    [],
  )

  usePermissionRequestLogging(toolUseConfirm, unaryEvent)

  const options = useMemo(
    () =>
      powershellToolUseOptions({
        suggestions:
          toolUseConfirm.permissionResult.behavior === 'ask'
            ? toolUseConfirm.permissionResult.suggestions
            : undefined,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode,
        noInputMode,
        editablePrefix,
        onEditablePrefixChange,
      }),
    [
      toolUseConfirm,
      yesInputMode,
      noInputMode,
      editablePrefix,
      onEditablePrefixChange,
    ],
  )

  // Alternar la información de depuración de permiso con un atajo de teclado
  const handleToggleDebug = useCallback(() => {
    setShowPermissionDebug(prev => !prev)
  }, [])
  useKeybinding('permission:toggleDebug', handleToggleDebug, {
    context: 'Confirmation',
  })

  function onSelect(value: string) {
    // Mapear las opciones a valores numéricos para la analítica (`logEvent` no admite cadenas)
    const optionIndex: Record<string, number> = {
      yes: 1,
      'yes-apply-suggestions': 2,
      'yes-prefix-edited': 2,
      no: 3,
    }
    logEvent('tengu_permission_request_option_selected', {
      option_index: optionIndex[value],
    })

    const toolNameForAnalytics = sanitizeToolNameForAnalytics(
      toolUseConfirm.tool.name,
    ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS

    if (value === 'yes-prefix-edited') {
      const trimmedPrefix = (editablePrefix ?? '').trim()
      logUnaryPermissionEvent('tool_use_single', toolUseConfirm, 'accept')
      if (!trimmedPrefix) {
        toolUseConfirm.onAllow(toolUseConfirm.input, [])
      } else {
        const prefixUpdates: PermissionUpdate[] = [
          {
            type: 'addRules',
            rules: [
              {
                toolName: PowerShellTool.name,
                ruleContent: trimmedPrefix,
              },
            ],
            behavior: 'allow',
            destination: 'localSettings',
          },
        ]
        toolUseConfirm.onAllow(toolUseConfirm.input, prefixUpdates)
      }
      onDone()
      return
    }

    switch (value) {
      case 'yes': {
        const trimmedFeedback = acceptFeedback.trim()
        logUnaryPermissionEvent('tool_use_single', toolUseConfirm, 'accept')
        // Registrar el envío de aceptación con el contexto del comentario
        logEvent('tengu_accept_submitted', {
          toolName: toolNameForAnalytics,
          isMcp: toolUseConfirm.tool.isMcp ?? false,
          has_instructions: !!trimmedFeedback,
          instructions_length: trimmedFeedback.length,
          entered_feedback_mode: yesFeedbackModeEntered,
        })
        toolUseConfirm.onAllow(
          toolUseConfirm.input,
          [],
          trimmedFeedback || undefined,
        )
        onDone()
        break
      }
      case 'yes-apply-suggestions': {
        logUnaryPermissionEvent('tool_use_single', toolUseConfirm, 'accept')
        // Extraer las sugerencias si las hay (sirve tanto para el comportamiento 'ask' como para el 'passthrough')
        const permissionUpdates =
          'suggestions' in toolUseConfirm.permissionResult
            ? toolUseConfirm.permissionResult.suggestions || []
            : []
        toolUseConfirm.onAllow(toolUseConfirm.input, permissionUpdates)
        onDone()
        break
      }
      case 'no': {
        const trimmedFeedback = rejectFeedback.trim()

        // Registrar el envío de rechazo con el contexto del comentario
        logEvent('tengu_reject_submitted', {
          toolName: toolNameForAnalytics,
          isMcp: toolUseConfirm.tool.isMcp ?? false,
          has_instructions: !!trimmedFeedback,
          instructions_length: trimmedFeedback.length,
          entered_feedback_mode: noFeedbackModeEntered,
        })

        // Procesar el rechazo (con comentario o sin él)
        handleReject(trimmedFeedback || undefined)
        break
      }
    }
  }

  return (
    <PermissionDialog workerBadge={workerBadge} title="PowerShell command">
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text>
          {PowerShellTool.renderToolUseMessage(
            { command, description },
            { theme, verbose: true }, // always show the full command
          )}
        </Text>
        <Text dimColor>{toolUseConfirm.description}</Text>
      </Box>
      {showPermissionDebug ? (
        <>
          <PermissionDecisionDebugInfo
            permissionResult={toolUseConfirm.permissionResult}
            toolName="PowerShell"
          />
          {toolUseContext.options.debug && (
            <Box justifyContent="flex-end" marginTop={1}>
              <Text dimColor>Ctrl-D to hide debug info</Text>
            </Box>
          )}
        </>
      ) : (
        <>
          <Box flexDirection="column">
            <PermissionRuleExplanation
              permissionResult={toolUseConfirm.permissionResult}
              toolType="command"
            />
            {destructiveWarning && (
              <Box marginBottom={1}>
                <Text color="warning">{destructiveWarning}</Text>
              </Box>
            )}
            <Text>Do you want to proceed?</Text>
            <Select
              options={options}
              inlineDescriptions
              onChange={onSelect}
              onCancel={() => handleReject()}
              onFocus={handleFocus}
              onInputModeToggle={handleInputModeToggle}
            />
          </Box>
          <Box justifyContent="space-between" marginTop={1}>
            <Text dimColor>
              Esc to cancel
              {((focusedOption === 'yes' && !yesInputMode) ||
                (focusedOption === 'no' && !noInputMode)) &&
                ' · Tab to amend'}
            </Text>
            {toolUseContext.options.debug && (
              <Text dimColor>Ctrl+d to show debug info</Text>
            )}
          </Box>
        </>
      )}
    </PermissionDialog>
  )
}
