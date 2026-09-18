import { feature } from 'bun:bundle'
import figures from 'figures'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useTheme } from '@anthropic/ink'
import { useKeybinding } from '@anthropic/ink/keybindings'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@claude-code-how-works/config/feature-flags'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { sanitizeToolNameForAnalytics } from '@claude-code-how-works/agent/eventMetadata.js'
import { useAppState } from '../../appStateHooks.js'
import { BashTool } from '@claude-code-how-works/tool-registry/tools/BashTool/BashTool.js'
import {
  getFirstWordPrefix,
  getSimpleCommandPrefix,
} from '@claude-code-how-works/tool-registry/tools/BashTool/bashPermissions.js'
import { getDestructiveCommandWarning } from '@claude-code-how-works/tool-registry/tools/BashTool/destructiveCommandWarning.js'
import { parseSedEditCommand } from '@claude-code-how-works/tool-registry/tools/BashTool/sedEditParser.js'
import { shouldUseSandbox } from '@claude-code-how-works/tool-registry/tools/BashTool/shouldUseSandbox.js'
import { getCompoundCommandPrefixesStatic } from '@claude-code-how-works/shell/bash/prefix.js'
import {
  createPromptRuleContent,
  generateGenericDescription,
  getBashPromptAllowDescriptions,
  isClassifierPermissionsEnabled,
} from '../../bashClassifier.js'
import { extractRules } from '../../PermissionUpdate.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import { SandboxManager } from '@claude-code-how-works/shell/sandbox.js'
import { Select } from '@claude-code-how-works/repl/components/CustomSelect/select.js'
import { ShimmerChar } from '@claude-code-how-works/repl/components/Spinner/ShimmerChar.js'
import { useShimmerAnimation } from '@claude-code-how-works/repl/components/Spinner/useShimmerAnimation.js'
import { type UnaryEvent, usePermissionRequestLogging } from '../hooks.js'
import {
  PermissionExplanation,
  usePermissionExplainer,
} from '../PermissionExplanation.js'
import { PermissionDecisionDebugInfo } from '../PermissionDecisionDebugInfo.js'
import { PermissionDialog } from '../PermissionDialog.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js'
import { SedEditPermissionRequest } from '../SedEditPermissionRequest/SedEditPermissionRequest.js'
import { useShellPermissionFeedback } from '../useShellPermissionFeedback.js'
import { logUnaryPermissionEvent } from '../utils.js'
import { bashToolUseOptions } from './bashToolUseOptions.js'

const CHECKING_TEXT = 'Attempting to auto-approve\u2026'

// Copia de `ccnmt: packages/permission/src/components/BashPermissionRequest/BashPermissionRequest.tsx`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// Aísla el reloj del shimmer a 20 fps de `BashPermissionRequestInner`. Antes de
// esta extracción `useShimmerAnimation` vivía dentro del cuerpo de 535 líneas
// de `Inner`, así que cada tic de 50 ms re-renderizaba el diálogo entero
// (`PermissionDialog` + `Select` + todos los hijos) durante el segundo a tres
// que el clasificador suele tardar. `Inner` además tiene una salida del
// Compiler (ver abajo), así que nada quedaba memoizado de forma automática —
// el árbol JSX completo se reconstruía entre 20 y 60 veces por comprobación
// del clasificador.
function ClassifierCheckingSubtitle(): React.ReactNode {
  const [ref, glimmerIndex] = useShimmerAnimation(
    'requesting',
    CHECKING_TEXT,
    false,
  )
  return (
    <Box ref={ref}>
      <Text>
        {[...CHECKING_TEXT].map((char, i) => (
          <ShimmerChar
            key={i}
            char={char}
            index={i}
            glimmerIndex={glimmerIndex}
            messageColor="inactive"
            shimmerColor="subtle"
          />
        ))}
      </Text>
    </Box>
  )
}

export function BashPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  const {
    toolUseConfirm,
    toolUseContext,
    onDone,
    onReject,
    verbose,
    workerBadge,
  } = props

  const { command, description } = BashTool.inputSchema.parse(
    toolUseConfirm.input,
  )

  // Detectar los comandos de edición en sitio de sed y delegar en
  // `SedEditPermissionRequest`, que los renderiza como una edición de archivo,
  // con vista de diff.
  const sedInfo = parseSedEditCommand(command)

  if (sedInfo) {
    return (
      <SedEditPermissionRequest
        toolUseConfirm={toolUseConfirm}
        toolUseContext={toolUseContext}
        onDone={onDone}
        onReject={onReject}
        verbose={verbose}
        workerBadge={workerBadge}
        sedInfo={sedInfo}
      />
    )
  }

  // Comando de bash corriente: renderizar con hooks
  return (
    <BashPermissionRequestInner
      toolUseConfirm={toolUseConfirm}
      toolUseContext={toolUseContext}
      onDone={onDone}
      onReject={onReject}
      verbose={verbose}
      workerBadge={workerBadge}
      command={command}
      description={description}
    />
  )
}

// Componente interior que usa hooks: sólo se llama para comandos de CLI que no son de MCP
function BashPermissionRequestInner({
  toolUseConfirm,
  toolUseContext,
  onDone,
  onReject,
  verbose: _verbose,
  workerBadge,
  command,
  description,
}: PermissionRequestProps & {
  command: string
  description?: string
}): React.ReactNode {
  const [theme] = useTheme()
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
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
  const [showPermissionDebug, setShowPermissionDebug] = useState(false)
  const [classifierDescription, setClassifierDescription] = useState(
    description || '',
  )
  // Seguir si la descripción inicial (la de la prop o la generada de forma
  // asíncrona) venía vacía. En cuanto llega una no vacía, esto se queda en
  // false.
  const [
    initialClassifierDescriptionEmpty,
    setInitialClassifierDescriptionEmpty,
  ] = useState(!description?.trim())

  // Generar de forma asíncrona una descripción genérica para el clasificador
  useEffect(() => {
    if (!isClassifierPermissionsEnabled()) return

    const abortController = new AbortController()
    generateGenericDescription(command, description, abortController.signal)
      .then(generic => {
        if (generic && !abortController.signal.aborted) {
          setClassifierDescription(generic)
          setInitialClassifierDescriptionEmpty(false)
        }
      })
      .catch(() => {}) // Conservar la original si hay error
    return () => abortController.abort()
  }, [command, description])

  // GH#11380: para un comando compuesto (`cd src && git status && npm test`),
  // el backend ya calculó las sugerencias correctas por subcomando, partiendo
  // con tree-sitter y comprobando permiso subcomando a subcomando.
  // `decisionReason.type === 'subcommandResults'` marca ese camino. Las
  // heurísticas síncronas de prefijo de abajo (`getSimpleCommandPrefix` y
  // `getFirstWordPrefix`) operan sobre la cadena compuesta ENTERA y toman las
  // dos primeras palabras — produciendo reglas muertas como `Bash(cd src:*)` o
  // `Bash(./script.sh && npm test)` que ya nunca vuelven a coincidir. Los
  // usuarios acumulan más de 150 de ésas en `settings.local.json`.
  //
  // Cuando el compuesto tiene exactamente una regla de Bash (por ejemplo
  // `cd src && npm test`, donde `cd` es de sólo lectura y sólo `npm test`
  // necesita aprobación), se siembra el campo editable con la regla del
  // backend. Cuando tiene dos o más, `editablePrefix` se queda en `undefined`
  // para que `bashToolUseOptions` caiga a `yes-apply-suggestions`, que guarda
  // todas las reglas por subcomando de forma atómica.
  const isCompound =
    toolUseConfirm.permissionResult.decisionReason?.type === 'subcommandResults'

  // Prefijo editable — se inicializa de forma síncrona con el mejor prefijo
  // que se pueda extraer sin tree-sitter, y después se refina con tree-sitter
  // para los comandos compuestos. El camino síncrono importa porque
  // TREE_SITTER_BASH está tras una puerta de sólo-ant: en las builds externas
  // el refinamiento asíncrono de abajo siempre resuelve a [] y este valor
  // inicial es lo que el usuario ve.
  //
  // Inicializador perezoso: dejado en el cuerpo del render, esto corre una
  // expresión regular y un `split` en cada render; sólo hace falta para el
  // estado inicial.
  const [editablePrefix, setEditablePrefix] = useState<string | undefined>(
    () => {
      if (isCompound) {
        // Para un comando compuesto, la sugerencia del backend es la fuente
        // de verdad. Una sola regla → sembrar el campo editable para que el
        // usuario la refine. Varias o ninguna → `undefined` → de eso se
        // encarga `yes-apply-suggestions`.
        const backendBashRules = extractRules(
          'suggestions' in toolUseConfirm.permissionResult
            ? toolUseConfirm.permissionResult.suggestions
            : undefined,
        ).filter(r => r.toolName === BashTool.name && r.ruleContent)
        return backendBashRules.length === 1
          ? backendBashRules[0]!.ruleContent
          : undefined
      }
      const two = getSimpleCommandPrefix(command)
      if (two) return `${two}:*`
      const one = getFirstWordPrefix(command)
      if (one) return `${one}:*`
      return command
    },
  )
  const hasUserEditedPrefix = useRef(false)
  const onEditablePrefixChange = useCallback((value: string) => {
    hasUserEditedPrefix.current = true
    setEditablePrefix(value)
  }, [])
  useEffect(() => {
    // Saltarse el refinamiento asíncrono en los comandos compuestos — el
    // backend ya corrió el análisis completo por subcomando y su sugerencia
    // es correcta.
    if (isCompound) return
    let cancelled = false
    getCompoundCommandPrefixesStatic(command, subcmd =>
      BashTool.isReadOnly({ command: subcmd }),
    )
      .then(prefixes => {
        if (cancelled || hasUserEditedPrefix.current) return
        if (prefixes.length > 0) {
          setEditablePrefix(`${prefixes[0]}:*`)
        }
      })
      .catch(() => {}) // Conservar el prefijo síncrono si tree-sitter falla
    return () => {
      cancelled = true
    }
  }, [command, isCompound])

  // Seguir si la comprobación del clasificador llegó a estar en marcha (se
  // conserva tras terminar). `classifierCheckInProgress` se fija una sola vez,
  // al empujar a la cola (`interactiveHandler`), y sólo transita de true a
  // false, así que capturar el valor del montaje basta — no hace falta un
  // cerrojo ni una ref. El ternario de `feature()` mantiene la lectura de la
  // propiedad fuera de las builds externas (la comprobación de cadenas
  // prohibidas).
  const [classifierWasChecking] = useState(
    feature('BASH_CLASSIFIER')
      ? !!toolUseConfirm.classifierCheckInProgress
      : false,
  )

  // Éstos se derivan sólo de la entrada de la herramienta (fija durante toda
  // la vida del diálogo). El reloj del shimmer vivía en este componente y lo
  // re-renderizaba a 20 fps mientras el clasificador corría (ver
  // `ClassifierCheckingSubtitle` arriba, donde se extrajo). El React Compiler
  // no puede memoizar de forma automática una función importada (no puede
  // probar que no tiene efectos secundarios), así que este `useMemo` sigue
  // protegiendo contra cualquier fuente de re-render (una actualización de
  // estado de `Inner`, por ejemplo). Mismo patrón que el PR#20730.
  const { destructiveWarning, sandboxingEnabled, isSandboxed } = useMemo(() => {
    const destructiveWarning = getFeatureValue_CACHED_MAY_BE_STALE(
      'tengu_destructive_command_warning',
      false,
    )
      ? getDestructiveCommandWarning(command)
      : null

    const sandboxingEnabled = SandboxManager.isSandboxingEnabled()
    const isSandboxed =
      sandboxingEnabled && shouldUseSandbox(toolUseConfirm.input)

    return { destructiveWarning, sandboxingEnabled, isSandboxed }
  }, [command, toolUseConfirm.input])

  const unaryEvent = useMemo<UnaryEvent>(
    () => ({ completion_type: 'tool_use_single', language_name: 'none' }),
    [],
  )

  usePermissionRequestLogging(toolUseConfirm, unaryEvent)

  const existingAllowDescriptions = useMemo(
    () => getBashPromptAllowDescriptions(toolPermissionContext),
    [toolPermissionContext],
  )

  const options = useMemo(
    () =>
      bashToolUseOptions({
        suggestions:
          toolUseConfirm.permissionResult.behavior === 'ask'
            ? toolUseConfirm.permissionResult.suggestions
            : undefined,
        decisionReason: toolUseConfirm.permissionResult.decisionReason,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        onClassifierDescriptionChange: setClassifierDescription,
        classifierDescription,
        initialClassifierDescriptionEmpty,
        existingAllowDescriptions,
        yesInputMode,
        noInputMode,
        editablePrefix,
        onEditablePrefixChange,
      }),
    [
      toolUseConfirm,
      classifierDescription,
      initialClassifierDescriptionEmpty,
      existingAllowDescriptions,
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

  // ctrl+e — explicador por LLM, de un solo disparo, del comando pendiente.
  const explainer = usePermissionExplainer({
    toolName: toolUseConfirm.tool.name,
    toolInput: toolUseConfirm.input,
    toolDescription: toolUseConfirm.description,
    messages: toolUseContext.messages,
  })

  // Permitir que Esc descarte el checkmark tras la auto-aprobación
  const handleDismissCheckmark = useCallback(() => {
    toolUseConfirm.onDismissCheckmark?.()
  }, [toolUseConfirm])
  useKeybinding('confirm:no', handleDismissCheckmark, {
    context: 'Confirmation',
    isActive: feature('BASH_CLASSIFIER')
      ? !!toolUseConfirm.classifierAutoApproved
      : false,
  })

  function onSelect(value: string) {
    // Mapear las opciones a valores numéricos para la analítica (`logEvent` no admite cadenas)
    let optionIndex: Record<string, number> = {
      yes: 1,
      'yes-apply-suggestions': 2,
      'yes-prefix-edited': 2,
      no: 3,
    }
    if (feature('BASH_CLASSIFIER')) {
      optionIndex = {
        yes: 1,
        'yes-apply-suggestions': 2,
        'yes-prefix-edited': 2,
        'yes-classifier-reviewed': 3,
        no: 4,
      }
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
                toolName: BashTool.name,
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

    if (feature('BASH_CLASSIFIER') && value === 'yes-classifier-reviewed') {
      const trimmedDescription = classifierDescription.trim()
      logUnaryPermissionEvent('tool_use_single', toolUseConfirm, 'accept')
      if (!trimmedDescription) {
        toolUseConfirm.onAllow(toolUseConfirm.input, [])
      } else {
        const permissionUpdates: PermissionUpdate[] = [
          {
            type: 'addRules',
            rules: [
              {
                toolName: BashTool.name,
                ruleContent: createPromptRuleContent(trimmedDescription),
              },
            ],
            behavior: 'allow',
            destination: 'session',
          },
        ]
        toolUseConfirm.onAllow(toolUseConfirm.input, permissionUpdates)
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

  const classifierSubtitle = feature('BASH_CLASSIFIER') ? (
    toolUseConfirm.classifierAutoApproved ? (
      <Text>
        <Text color="success">{figures.tick} Auto-approved</Text>
        {toolUseConfirm.classifierMatchedRule && (
          <Text dimColor>
            {' \u00b7 matched "'}
            {toolUseConfirm.classifierMatchedRule}
            {'"'}
          </Text>
        )}
      </Text>
    ) : toolUseConfirm.classifierCheckInProgress ? (
      <ClassifierCheckingSubtitle />
    ) : classifierWasChecking ? (
      <Text dimColor>Requires manual approval</Text>
    ) : undefined
  ) : undefined

  return (
    <PermissionDialog
      workerBadge={workerBadge}
      title={
        sandboxingEnabled && !isSandboxed
          ? 'Bash command (unsandboxed)'
          : 'Bash command'
      }
      subtitle={classifierSubtitle}
    >
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text>
          {BashTool.renderToolUseMessage(
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
            toolName="Bash"
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
                <Text
                  color="warning"
                  dimColor={
                    feature('BASH_CLASSIFIER')
                      ? toolUseConfirm.classifierAutoApproved
                      : false
                  }
                >
                  {destructiveWarning}
                </Text>
              </Box>
            )}
            <Text
              dimColor={
                feature('BASH_CLASSIFIER')
                  ? toolUseConfirm.classifierAutoApproved
                  : false
              }
            >
              Do you want to proceed?
            </Text>
            <Select
              options={
                feature('BASH_CLASSIFIER')
                  ? toolUseConfirm.classifierAutoApproved
                    ? options.map(o => ({ ...o, disabled: true }))
                    : options
                  : options
              }
              isDisabled={
                feature('BASH_CLASSIFIER')
                  ? toolUseConfirm.classifierAutoApproved
                  : false
              }
              inlineDescriptions
              onChange={onSelect}
              onCancel={() => handleReject()}
              onFocus={handleFocus}
              onInputModeToggle={handleInputModeToggle}
            />
            <PermissionExplanation
              visible={explainer.visible}
              promise={explainer.promise}
            />
          </Box>
          <Box justifyContent="space-between" marginTop={1}>
            <Text dimColor>
              Esc to cancel
              {((focusedOption === 'yes' && !yesInputMode) ||
                (focusedOption === 'no' && !noInputMode)) &&
                ' · Tab to amend'}
              {explainer.enabled &&
                ` · ${explainer.chord} to ${
                  explainer.visible ? 'hide' : 'explain'
                }`}
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
