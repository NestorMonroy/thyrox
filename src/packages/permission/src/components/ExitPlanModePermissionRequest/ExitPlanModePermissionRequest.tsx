import { feature } from 'bun:bundle'
import type { UUID } from 'crypto'
import figures from 'figures'
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNotifications } from '@thyrox/repl/notifications.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import {
  useAppState,
  useAppStateStore,
  useSetAppState,
} from '../../appStateHooks.js'
import {
  getSdkBetas,
  getSessionId,
  isSessionPersistenceDisabled,
  setHasExitedPlanMode,
  setNeedsAutoModeExitAttachment,
  setNeedsPlanModeExitAttachment,
} from '@thyrox/app-host/bootstrap/state.js'
import { generateSessionName } from '../../commands/rename/generateSessionName.js'
import { launchUltraplan } from '@thyrox/repl/ultraplan.js'
import { type KeyboardEvent, Box, Text } from '@anthropic/ink'
type AppState = import('@thyrox/app-host/state/AppState.js').AppState
import { AGENT_TOOL_NAME } from '@thyrox/tool-registry/tools/AgentTool/constants.js'
import { EXIT_PLAN_MODE_V2_TOOL_NAME } from '@thyrox/tool-registry/tools/ExitPlanModeTool/constants.js'
import type { AllowedPrompt } from '@thyrox/tool-registry/tools/ExitPlanModeTool/ExitPlanModeV2Tool.js'
import { TEAM_CREATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TeamCreateTool/constants.js'
import { isAgentSwarmsEnabled } from '@thyrox/agent/agentSwarmsEnabled.js'
import {
  calculateContextPercentages,
  getContextWindowForModel,
} from '@thyrox/agent/context.js'
import { getExternalEditor } from '@thyrox/storage/editor.js'
import { getDisplayPath } from '@thyrox/storage/file.js'
import { toIDEDisplayName } from '@thyrox/ide/ide.js'
import { logError } from '@thyrox/local-observability/logging'
import { enqueuePendingNotification } from '@thyrox/agent/messageQueueManager.js'
import { createUserMessage } from '@thyrox/agent/messages.js'
import {
  getMainLoopModel,
  getRuntimeMainLoopModel,
} from '@thyrox/provider/model.js'
import {
  createPromptRuleContent,
  isClassifierPermissionsEnabled,
  PROMPT_PREFIX,
} from '../../bashClassifier.js'
import {
  type PermissionMode,
  toExternalPermissionMode,
} from '../../PermissionMode.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import {
  hasAutoModeOptInAnySource,
  isAutoModeGateEnabled,
  restoreDangerousPermissions,
  stripDangerousPermissionsForAutoMode,
} from '../../permissionSetup.js'
import {
  getPewterLedgerVariant,
  isPlanModeInterviewPhaseEnabled,
} from '../../planModeV2.js'
import { getPlan, getPlanFilePath } from '@thyrox/storage/plans.js'
import {
  editFileInEditor,
  editPromptInEditor,
} from '@thyrox/repl/promptEditor.js'
import {
  getCurrentSessionTitle,
  getTranscriptPath,
  saveAgentName,
  saveCustomTitle,
} from '@thyrox/storage/sessionStorage.js'
import { getSettings, getUseAutoModeDuringPlan } from '@thyrox/config/settings'
import { type OptionWithDescription, Select } from '@thyrox/repl/components/CustomSelect/index.js'
import { Markdown } from '@thyrox/repl/components/Markdown.js'
import { PermissionDialog } from '../PermissionDialog.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const autoModeStateModule = feature('TRANSCRIPT_CLASSIFIER')
  ? (require('../../autoModeState.js') as typeof import('../../autoModeState.js'))
  : null

import type {
  Base64ImageSource,
  ImageBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
/* eslint-enable @typescript-eslint/no-require-imports */
import type { PastedContent } from '@thyrox/config'
import type { ImageDimensions } from '@thyrox/storage/imageResizer.js'
import { maybeResizeAndDownsampleImageBlock } from '@thyrox/storage/imageResizer.js'
import { cacheImagePath, storeImage } from '@thyrox/tool-registry/imageStore.js'

type ResponseValue =
  | 'yes-bypass-permissions'
  | 'yes-accept-edits'
  | 'yes-accept-edits-keep-context'
  | 'yes-default-keep-context'
  | 'yes-resume-auto-mode'
  | 'yes-auto-clear-context'
  | 'ultraplan'
  | 'no'

/**
 * Copia de `ccnmt: packages/permission/src/components/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Construye las actualizaciones de permiso para la aprobación de un plan,
 * incluidas las reglas basadas en prompt si se pasan. Esas reglas sólo se
 * añaden cuando los permisos del clasificador están habilitados (sólo en Ant).
 */
export function buildPermissionUpdates(
  mode: PermissionMode,
  allowedPrompts?: AllowedPrompt[],
): PermissionUpdate[] {
  const updates: PermissionUpdate[] = [
    {
      type: 'setMode',
      mode: toExternalPermissionMode(mode),
      destination: 'session',
    },
  ]

  // Añadir las reglas de permiso basadas en prompt si se pasan (sólo en Ant)
  if (
    isClassifierPermissionsEnabled() &&
    allowedPrompts &&
    allowedPrompts.length > 0
  ) {
    updates.push({
      type: 'addRules',
      rules: allowedPrompts.map(p => ({
        toolName: p.tool,
        ruleContent: createPromptRuleContent(p.prompt),
      })),
      behavior: 'allow',
      destination: 'session',
    })
  }

  return updates
}

/**
 * Nombra la sesión automáticamente a partir del contenido del plan cuando el
 * usuario lo acepta, si no la había nombrado ya con /rename o --name. Dispara
 * y olvida. Replica a /rename: nombre en kebab-case, y actualiza la insignia
 * del borde del prompt.
 */
export function autoNameSessionFromPlan(
  plan: string,
  setAppState: (updater: (prev: AppState) => AppState) => void,
  isClearContext: boolean,
): void {
  if (
    isSessionPersistenceDisabled() ||
    getSettings()?.cleanupPeriodDays === 0
  ) {
    return
  }
  // Al limpiar el contexto, la sesión actual está a punto de abandonarse —
  // su título (que pudo fijarlo un auto-nombrado ANTERIOR) es irrelevante.
  // Comprobarlo haría que la funcionalidad se anulara a sí misma tras el
  // primer uso.
  if (!isClearContext && getCurrentSessionTitle(getSessionId())) return
  void generateSessionName(
    // `generateSessionName` recorta por la cola, a los últimos 1000
    // caracteres (lo correcto para una conversación, donde lo reciente es lo
    // que importa). Un plan pone el objetivo al principio y termina con los
    // pasos de prueba — así que aquí se recorta por la cabeza, para que Haiku
    // vea el resumen.
    [createUserMessage({ content: plan.slice(0, 1000) })],
    new AbortController().signal,
  )
    .then(async name => {
      // Al aceptar con limpieza de contexto, `regenerateSessionId()` ya ha
      // corrido a estas alturas — esto nombra a propósito la sesión NUEVA, la
      // de ejecución. No «arreglarlo» capturando `sessionId` una sola vez:
      // eso nombraría la sesión de planificación abandonada.
      if (!name || getCurrentSessionTitle(getSessionId())) return
      const sessionId = getSessionId() as UUID
      const fullPath = getTranscriptPath()
      await saveCustomTitle(sessionId, name, fullPath, 'auto')
      await saveAgentName(sessionId, name, fullPath, 'auto')
      setAppState(prev => {
        if (prev.standaloneAgentContext?.name === name) return prev
        return {
          ...prev,
          standaloneAgentContext: { ...prev.standaloneAgentContext, name },
        }
      })
    })
    .catch(logError)
}

export function ExitPlanModePermissionRequest({
  toolUseConfirm,
  onDone,
  onReject,
  workerBadge,
  setStickyFooter,
}: PermissionRequestProps): React.ReactNode {
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
  const setAppState = useSetAppState()
  const store = useAppStateStore()
  const { addNotification } = useNotifications()
  // El texto de comentario del campo de la opción 'No'. Se enhebra por
  // `onAllow` como `acceptFeedback` cuando el usuario aprueba — permite
  // anotar el plan («actualiza también el README») sin la ida y vuelta de
  // rechazar y volver a planificar.
  const [planFeedback, setPlanFeedback] = useState('')
  const [pastedContents, setPastedContents] = useState<
    Record<number, PastedContent>
  >({})
  const nextPasteIdRef = useRef(0)

  const showClearContext =
    useAppState(s => s.settings.showClearContextOnPlanAccept) ?? false
  const ultraplanSessionUrl = useAppState(s => s.ultraplanSessionUrl)
  const ultraplanLaunching = useAppState(s => s.ultraplanLaunching)
  // Ocultar el botón de Ultraplan mientras hay una sesión activa o
  // arrancando — seleccionarlo descartaría el diálogo y rechazaría en local
  // antes de que `launchUltraplan` pudiera notar que la sesión existe y
  // devolver «already polling». `feature()` tiene que ir directamente en un
  // `if` o en un ternario (restricción de la eliminación de código muerto de
  // bun:bundle).
  const showUltraplan = feature('ULTRAPLAN')
    ? !ultraplanSessionUrl && !ultraplanLaunching
    : false
  const usage = toolUseConfirm.assistantMessage.message.usage
  const normalizedUsage =
    typeof usage?.input_tokens === 'number'
      ? {
          input_tokens: usage.input_tokens,
          cache_creation_input_tokens:
            typeof usage.cache_creation_input_tokens === 'number'
              ? usage.cache_creation_input_tokens
              : undefined,
          cache_read_input_tokens:
            typeof usage.cache_read_input_tokens === 'number'
              ? usage.cache_read_input_tokens
              : undefined,
        }
      : undefined
  const { mode, isAutoModeAvailable, isBypassPermissionsModeAvailable } =
    toolPermissionContext
  const autoModeAvailableAndOptedIn =
    isAutoModeAvailable &&
    hasAutoModeOptInAnySource() &&
    getUseAutoModeDuringPlan()
  const options = useMemo(
    () =>
      buildPlanApprovalOptions({
        showClearContext,
        showUltraplan,
        usedPercent: showClearContext
          ? getContextUsedPercent(normalizedUsage, mode)
          : null,
        isAutoModeAvailable: autoModeAvailableAndOptedIn,
        isBypassPermissionsModeAvailable,
        onFeedbackChange: setPlanFeedback,
      }),
    [
      showClearContext,
      showUltraplan,
      usage,
      mode,
      autoModeAvailableAndOptedIn,
      isBypassPermissionsModeAvailable,
    ],
  )

  function onImagePaste(
    base64Image: string,
    mediaType?: string,
    filename?: string,
    dimensions?: ImageDimensions,
    _sourcePath?: string,
  ) {
    const pasteId = nextPasteIdRef.current++
    const newContent: PastedContent = {
      id: pasteId,
      type: 'image',
      content: base64Image,
      mediaType: mediaType || 'image/png',
      filename: filename || 'Pasted image',
      dimensions,
    }
    cacheImagePath(newContent)
    void storeImage(newContent)
    setPastedContents(prev => ({ ...prev, [pasteId]: newContent }))
  }

  const onRemoveImage = useCallback((id: number) => {
    setPastedContents(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const imageAttachments = Object.values(pastedContents).filter(
    c => c.type === 'image',
  )
  const hasImages = imageAttachments.length > 0

  // TODO: borrar la rama cuando se pase del todo a V2.
  // Se detecta V2 por el nombre de la herramienta en vez de comprobar
  // `input.plan`, porque el PR #10394 inyecta el contenido del plan en
  // `input.plan` para los hooks y el SDK, y eso rompió la detección vieja
  // (ver la incidencia #10878).
  const isV2 = toolUseConfirm.tool.name === EXIT_PLAN_MODE_V2_TOOL_NAME
  const inputPlan = isV2
    ? undefined
    : (toolUseConfirm.input.plan as string | undefined)
  const planFilePath = isV2 ? getPlanFilePath() : undefined

  // Extraer los prompts permitidos que el plan pide (sólo en Ant)
  const allowedPrompts = toolUseConfirm.input.allowedPrompts as
    | AllowedPrompt[]
    | undefined

  // Obtener el plan en crudo para comprobar si está vacío
  const rawPlan = inputPlan ?? getPlan()
  const isEmpty = !rawPlan || rawPlan.trim() === ''

  // Capturar la variante una sola vez al montar. GrowthBook lee de una caché
  // en disco, así que el valor es estable a lo largo de una misma sesión de
  // planificación. `undefined` es el brazo de control. La variante es un enum
  // fijo de tres literales cortos, no entrada del usuario.
  const [planStructureVariant] = useState(
    () =>
      (getPewterLedgerVariant() ??
        undefined) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  )

  const [currentPlan, setCurrentPlan] = useState(() => {
    if (inputPlan) return inputPlan
    const plan = getPlan()
    return (
      plan ?? 'No plan found. Please write your plan to the plan file first.'
    )
  })
  const [showSaveMessage, setShowSaveMessage] = useState(false)
  // Seguir las ediciones locales de Ctrl+G para que `updatedInput` pueda
  // incluir el plan (la herramienta sólo devuelve el plan en `tool_result`
  // cuando `input.plan` está fijado — si no, el modelo ya lo tiene en
  // contexto de haber escrito el archivo del plan).
  const [planEditedLocally, setPlanEditedLocally] = useState(false)

  // Ocultar el mensaje de guardado a los 5 segundos
  useEffect(() => {
    if (showSaveMessage) {
      const timer = setTimeout(setShowSaveMessage, 5000, false)
      return () => clearTimeout(timer)
    }
  }, [showSaveMessage])

  // Atender Ctrl+G para editar el plan en $EDITOR, y Shift+Tab para aceptar ediciones de forma automática
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrl && e.key === 'g') {
      e.preventDefault()
      logEvent('tengu_plan_external_editor_used', {})

      void (async () => {
        if (isV2 && planFilePath) {
          const result = await editFileInEditor(planFilePath)
          if (result.error) {
            addNotification({
              key: 'external-editor-error',
              text: result.error,
              color: 'warning',
              priority: 'high',
            })
          }
          if (result.content !== null) {
            if (result.content !== currentPlan) setPlanEditedLocally(true)
            setCurrentPlan(result.content)
            setShowSaveMessage(true)
          }
        } else {
          const result = await editPromptInEditor(currentPlan)
          if (result.error) {
            addNotification({
              key: 'external-editor-error',
              text: result.error,
              color: 'warning',
              priority: 'high',
            })
          }
          if (result.content !== null && result.content !== currentPlan) {
            setCurrentPlan(result.content)
            setShowSaveMessage(true)
          }
        }
      })()
      return
    }

    // Shift+Tab selecciona de inmediato «auto-accept edits»
    if (e.shift && e.key === 'tab') {
      e.preventDefault()
      void handleResponse(
        showClearContext ? 'yes-accept-edits' : 'yes-accept-edits-keep-context',
      )
      return
    }
  }

  async function handleResponse(value: ResponseValue): Promise<void> {
    const trimmedFeedback = planFeedback.trim()
    const acceptFeedback = trimmedFeedback || undefined

    // Ultraplan: rechazar en local y teletransportar el plan a CCR como
    // borrador semilla. El diálogo se descarta de inmediato para que el bucle
    // de consulta se desbloquee; el teletransporte corre desprendido y su
    // mensaje de arranque aterriza por la cola de comandos.
    if (value === 'ultraplan') {
      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          'ultraplan' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
      })
      onDone()
      onReject()
      toolUseConfirm.onReject(
        'Plan being refined via Ultraplan — please wait for the result.',
      )
      void launchUltraplan({
        blurb: '',
        seedPlan: currentPlan,
        getAppState: store.getState,
        setAppState: store.setState,
        signal: new AbortController().signal,
      })
        .then(msg =>
          enqueuePendingNotification({ value: msg, mode: 'task-notification' }),
        )
        .catch(logError)
      return
    }

    // V1: el plan va en `input`. V2: el plan está en disco, pero si el
    // usuario lo editó con Ctrl+G se pasa igual, para que la herramienta
    // devuelva la edición en `tool_result` (si no, el modelo nunca ve los
    // cambios del usuario).
    const updatedInput = isV2 && !planEditedLocally ? {} : { plan: currentPlan }

    // Si el modo automático estuvo activo durante el plan (por el propio
    // modo automático o porque el usuario lo pidió) y NO se va a automático,
    // desactivarlo, restaurar los permisos y disparar el attachment de
    // salida.
    if (feature('TRANSCRIPT_CLASSIFIER')) {
      const goingToAuto =
        (value === 'yes-resume-auto-mode' ||
          value === 'yes-auto-clear-context') &&
        isAutoModeGateEnabled()
      // `isAutoModeActive()` es la señal autoritativa — `prePlanMode` y
      // `strippedDangerousRules` quedan rancios después de que
      // `transitionPlanAutoMode` desactive a mitad de plan (produciría un
      // attachment de salida duplicado).
      const autoWasUsedDuringPlan =
        autoModeStateModule?.isAutoModeActive() ?? false
      if (value !== 'no' && !goingToAuto && autoWasUsedDuringPlan) {
        autoModeStateModule?.setAutoModeActive(false)
        setNeedsAutoModeExitAttachment(true)
        setAppState(prev => ({
          ...prev,
          toolPermissionContext: {
            ...restoreDangerousPermissions(prev.toolPermissionContext),
            prePlanMode: undefined,
          },
        }))
      }
    }

    // Opciones con limpieza de contexto: dejar pendiente la implementación
    // del plan y rechazar el diálogo. El REPL se encarga de limpiar el
    // contexto y de disparar una consulta nueva. Las opciones que conservan
    // el contexto se saltan este bloque y van por el flujo normal de abajo.
    const isResumeAutoOption = feature('TRANSCRIPT_CLASSIFIER')
      ? value === 'yes-resume-auto-mode'
      : false
    const isKeepContextOption =
      value === 'yes-accept-edits-keep-context' ||
      value === 'yes-default-keep-context' ||
      isResumeAutoOption

    if (value !== 'no') {
      autoNameSessionFromPlan(currentPlan, setAppState, !isKeepContextOption)
    }

    if (value !== 'no' && !isKeepContextOption) {
      // Determinar el modo de permiso a partir de la opción elegida
      let mode: PermissionMode = 'default'
      if (value === 'yes-bypass-permissions') {
        mode = 'bypassPermissions'
      } else if (value === 'yes-accept-edits') {
        mode = 'acceptEdits'
      } else if (
        feature('TRANSCRIPT_CLASSIFIER') &&
        value === 'yes-auto-clear-context' &&
        isAutoModeGateEnabled()
      ) {
        // El `processInitialMessage` del REPL se encarga de
        // `stripDangerousPermissions` y del modo, pero NO fija
        // `autoModeActive`. Con la puerta cerrada, cae a 'default'.
        mode = 'auto'
        autoModeStateModule?.setAutoModeActive(true)
      }

      // Registrar el evento de salida del plan
      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        clearContext: true,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
        hasFeedback: !!acceptFeedback,
      })

      // Fijar el mensaje inicial: el REPL se encargará de limpiar el
      // contexto y de la consulta nueva. Añadir la instrucción de
      // verificación si la funcionalidad está habilitada.
      // Eliminación de código muerto: en las builds externas
      // CLAUDE_CODE_VERIFY_PLAN vale 'false', así que la comparación
      // === 'true' le permite a Bun eliminar la cadena.
      const verificationInstruction =
        undefined === 'true'
          ? `\n\nIMPORTANT: When you have finished implementing the plan, you MUST call the "VerifyPlanExecution" tool directly (NOT the ${AGENT_TOOL_NAME} tool or an agent) to trigger background verification.`
          : ''

      // Capturar la ruta del transcript antes de que se limpie el contexto (el ID de sesión se va a regenerar)
      const transcriptPath = getTranscriptPath()
      const transcriptHint = `\n\nIf you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: ${transcriptPath}`

      const teamHint = isAgentSwarmsEnabled()
        ? `\n\nIf this plan can be broken down into multiple independent tasks, consider using the ${TEAM_CREATE_TOOL_NAME} tool to create a team and parallelize the work.`
        : ''

      const feedbackSuffix = acceptFeedback
        ? `\n\nUser feedback on this plan: ${acceptFeedback}`
        : ''

      setAppState(prev => ({
        ...prev,
        initialMessage: {
          message: {
            ...createUserMessage({
              content: `Implement the following plan:\n\n${currentPlan}${verificationInstruction}${transcriptHint}${teamHint}${feedbackSuffix}`,
            }),
            planContent: currentPlan,
          },
          clearContext: true,
          mode,
          allowedPrompts,
        },
      }))

      setHasExitedPlanMode(true)
      onDone()
      onReject()
      // Rechazar el uso de la herramienta para desbloquear el bucle de
      // consulta. El REPL verá `pendingInitialQuery` y disparará una consulta
      // nueva.
      toolUseConfirm.onReject()
      return
    }

    // Atender la opción de automático conservando el contexto — necesita
    // trato aparte porque `buildPermissionUpdates` mapea automático a
    // 'default' por `toExternalPermissionMode`. Aquí el modo se fija
    // directamente con `setAppState` y se sincroniza el estado de arranque.
    if (
      feature('TRANSCRIPT_CLASSIFIER') &&
      value === 'yes-resume-auto-mode' &&
      isAutoModeGateEnabled()
    ) {
      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        clearContext: false,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
        hasFeedback: !!acceptFeedback,
      })
      setHasExitedPlanMode(true)
      setNeedsPlanModeExitAttachment(true)
      autoModeStateModule?.setAutoModeActive(true)
      setAppState(prev => ({
        ...prev,
        toolPermissionContext: stripDangerousPermissionsForAutoMode({
          ...prev.toolPermissionContext,
          mode: 'auto',
          prePlanMode: undefined,
        }),
      }))
      onDone()
      toolUseConfirm.onAllow(updatedInput, [], acceptFeedback)
      return
    }

    // Atender las opciones que conservan el contexto (van por el flujo
    // normal de `onAllow`). `yes-resume-auto-mode` cae aquí cuando la puerta
    // del modo automático está cerrada (por ejemplo, si el cortacircuitos
    // saltó después de que el diálogo se renderizara). Sin esta caída de
    // vuelta la función volvería sin resolver el diálogo, dejando el bucle de
    // consulta bloqueado y el estado de seguridad corrompido.
    const keepContextModes: Record<string, PermissionMode> = {
      'yes-accept-edits-keep-context':
        toolPermissionContext.isBypassPermissionsModeAvailable
          ? 'bypassPermissions'
          : 'acceptEdits',
      'yes-default-keep-context': 'default',
      ...(feature('TRANSCRIPT_CLASSIFIER')
        ? { 'yes-resume-auto-mode': 'default' as const }
        : {}),
    }
    const keepContextMode = keepContextModes[value]
    if (keepContextMode) {
      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        clearContext: false,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
        hasFeedback: !!acceptFeedback,
      })
      setHasExitedPlanMode(true)
      setNeedsPlanModeExitAttachment(true)
      onDone()
      toolUseConfirm.onAllow(
        updatedInput,
        buildPermissionUpdates(keepContextMode, allowedPrompts),
        acceptFeedback,
      )
      return
    }

    // Atender las opciones de aprobación estándar
    const standardModes: Record<string, PermissionMode> = {
      'yes-bypass-permissions': 'bypassPermissions',
      'yes-accept-edits': 'acceptEdits',
    }
    const standardMode = standardModes[value]
    if (standardMode) {
      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
        hasFeedback: !!acceptFeedback,
      })
      setHasExitedPlanMode(true)
      setNeedsPlanModeExitAttachment(true)
      onDone()
      toolUseConfirm.onAllow(
        updatedInput,
        buildPermissionUpdates(standardMode, allowedPrompts),
        acceptFeedback,
      )
      return
    }

    // Atender el 'no': quedarse en modo plan
    if (value === 'no') {
      if (!trimmedFeedback && !hasImages) {
        // Todavía no hay comentario: el usuario sigue en el campo de entrada
        return
      }

      logEvent('tengu_plan_exit', {
        planLengthChars: currentPlan.length,
        outcome:
          'no' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
        planStructureVariant,
      })

      // Convertir las imágenes pegadas a ImageBlockParam[], redimensionándolas
      let imageBlocks: ImageBlockParam[] | undefined
      if (hasImages) {
        imageBlocks = await Promise.all(
          imageAttachments.map(async img => {
            const block: ImageBlockParam = {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (img.mediaType ||
                  'image/png') as Base64ImageSource['media_type'],
                data: img.content,
              },
            }
            const resized = await maybeResizeAndDownsampleImageBlock(block)
            return resized.block
          }),
        )
      }

      onDone()
      onReject()
      toolUseConfirm.onReject(
        trimmedFeedback || (hasImages ? '(See attached image)' : undefined),
        imageBlocks && imageBlocks.length > 0 ? imageBlocks : undefined,
      )
    }
  }

  const editor = getExternalEditor()
  const editorName = editor ? toIDEDisplayName(editor) : null

  // Pie pegajoso: cuando se pasa `setStickyFooter` (modo de pantalla
  // completa), las opciones del `Select` se renderizan en la ranura `bottom`
  // de `FullscreenLayout`, para que sigan visibles mientras el usuario
  // recorre un plan largo. `handleResponse` va envuelto en una ref para que
  // el JSX (que se fija una vez por cambio de opciones o de imágenes) pueda
  // llamar a la clausura más reciente sin volver a registrarse en cada
  // pulsación. React reconcilia el `Select` del pie pegajoso por tipo, y así
  // conserva el foco y el estado del campo.
  const handleResponseRef = useRef(handleResponse)
  handleResponseRef.current = handleResponse
  const handleCancelRef = useRef<() => void>(undefined)
  handleCancelRef.current = () => {
    logEvent('tengu_plan_exit', {
      planLengthChars: currentPlan.length,
      outcome:
        'no' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
      planStructureVariant,
    })
    onDone()
    onReject()
    toolUseConfirm.onReject()
  }
  const useStickyFooter = !isEmpty && !!setStickyFooter
  useLayoutEffect(() => {
    if (!useStickyFooter) return
    setStickyFooter(
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="planMode"
        borderLeft={false}
        borderRight={false}
        borderBottom={false}
        paddingX={1}
      >
        <Text dimColor>Would you like to proceed?</Text>
        <Box marginTop={1}>
          <Select
            options={options}
            onChange={v => void handleResponseRef.current(v)}
            onCancel={() => handleCancelRef.current?.()}
            onImagePaste={onImagePaste}
            pastedContents={pastedContents}
            onRemoveImage={onRemoveImage}
          />
        </Box>
        {editorName && (
          <Box flexDirection="row" gap={1} marginTop={1}>
            <Text dimColor>ctrl-g to edit in </Text>
            <Text bold dimColor>
              {editorName}
            </Text>
            {isV2 && planFilePath && (
              <Text dimColor> · {getDisplayPath(planFilePath)}</Text>
            )}
            {showSaveMessage && (
              <>
                <Text dimColor>{' · '}</Text>
                <Text color="success">{figures.tick}Plan saved!</Text>
              </>
            )}
          </Box>
        )}
      </Box>,
    )
    return () => setStickyFooter(null)
    // onImagePaste/onRemoveImage are stable (useCallback/useRef-backed above)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useStickyFooter,
    setStickyFooter,
    options,
    pastedContents,
    editorName,
    isV2,
    planFilePath,
    showSaveMessage,
  ])

  // Interfaz simplificada para los planes vacíos
  if (isEmpty) {
    function handleEmptyPlanResponse(value: 'yes' | 'no'): void {
      if (value === 'yes') {
        logEvent('tengu_plan_exit', {
          planLengthChars: 0,
          outcome:
            'yes-default' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
          planStructureVariant,
        })
        if (feature('TRANSCRIPT_CLASSIFIER')) {
          const autoWasUsedDuringPlan =
            autoModeStateModule?.isAutoModeActive() ?? false
          if (autoWasUsedDuringPlan) {
            autoModeStateModule?.setAutoModeActive(false)
            setNeedsAutoModeExitAttachment(true)
            setAppState(prev => ({
              ...prev,
              toolPermissionContext: {
                ...restoreDangerousPermissions(prev.toolPermissionContext),
                prePlanMode: undefined,
              },
            }))
          }
        }
        setHasExitedPlanMode(true)
        setNeedsPlanModeExitAttachment(true)
        onDone()
        toolUseConfirm.onAllow({}, [
          { type: 'setMode', mode: 'default', destination: 'session' },
        ])
      } else {
        logEvent('tengu_plan_exit', {
          planLengthChars: 0,
          outcome:
            'no' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
          planStructureVariant,
        })
        onDone()
        onReject()
        toolUseConfirm.onReject()
      }
    }

    return (
      <PermissionDialog
        color="planMode"
        title="Exit plan mode?"
        workerBadge={workerBadge}
      >
        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>Claude wants to exit plan mode</Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: 'Yes', value: 'yes' as const },
                { label: 'No', value: 'no' as const },
              ]}
              onChange={handleEmptyPlanResponse}
              onCancel={() => {
                logEvent('tengu_plan_exit', {
                  planLengthChars: 0,
                  outcome:
                    'no' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                  interviewPhaseEnabled: isPlanModeInterviewPhaseEnabled(),
                  planStructureVariant,
                })
                onDone()
                onReject()
                toolUseConfirm.onReject()
              }}
            />
          </Box>
        </Box>
      </PermissionDialog>
    )
  }

  return (
    <Box
      flexDirection="column"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      <PermissionDialog
        color="planMode"
        title="Ready to code?"
        innerPaddingX={0}
        workerBadge={workerBadge}
      >
        <Box flexDirection="column" marginTop={1}>
          <Box paddingX={1} flexDirection="column">
            <Text>Here is Claude&apos;s plan:</Text>
          </Box>
          <Box
            borderColor="subtle"
            borderStyle="dashed"
            flexDirection="column"
            borderLeft={false}
            borderRight={false}
            paddingX={1}
            marginBottom={1}
            // Necesario para que Windows Terminal renderice bien
            overflow="hidden"
          >
            <Markdown>{currentPlan}</Markdown>
          </Box>
          <Box flexDirection="column" paddingX={1}>
            <PermissionRuleExplanation
              permissionResult={toolUseConfirm.permissionResult}
              toolType="tool"
            />
            {isClassifierPermissionsEnabled() &&
              allowedPrompts &&
              allowedPrompts.length > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                  <Text bold>Requested permissions:</Text>
                  {allowedPrompts.map((p, i) => (
                    <Text key={i} dimColor>
                      {'  '}· {p.tool}({PROMPT_PREFIX} {p.prompt})
                    </Text>
                  ))}
                </Box>
              )}
            {!useStickyFooter && (
              <>
                <Text dimColor>
                  Claude has written up a plan and is ready to execute. Would
                  you like to proceed?
                </Text>
                <Box marginTop={1}>
                  <Select
                    options={options}
                    onChange={handleResponse}
                    onCancel={() => handleCancelRef.current?.()}
                    onImagePaste={onImagePaste}
                    pastedContents={pastedContents}
                    onRemoveImage={onRemoveImage}
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>
      </PermissionDialog>
      {!useStickyFooter && editorName && (
        <Box flexDirection="row" gap={1} paddingX={1} marginTop={1}>
          <Box>
            <Text dimColor>ctrl-g to edit in </Text>
            <Text bold dimColor>
              {editorName}
            </Text>
            {isV2 && planFilePath && (
              <Text dimColor> · {getDisplayPath(planFilePath)}</Text>
            )}
          </Box>
          {showSaveMessage && (
            <Box>
              <Text dimColor>{' · '}</Text>
              <Text color="success">{figures.tick}Plan saved!</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

/** @internal Exportado para los tests. */
export function buildPlanApprovalOptions({
  showClearContext,
  showUltraplan,
  usedPercent,
  isAutoModeAvailable,
  isBypassPermissionsModeAvailable,
  onFeedbackChange,
}: {
  showClearContext: boolean
  showUltraplan: boolean
  usedPercent: number | null
  isAutoModeAvailable: boolean | undefined
  isBypassPermissionsModeAvailable: boolean | undefined
  onFeedbackChange: (v: string) => void
}): OptionWithDescription<ResponseValue>[] {
  const options: OptionWithDescription<ResponseValue>[] = []
  const usedLabel = usedPercent !== null ? ` (${usedPercent}% used)` : ''

  if (showClearContext) {
    if (feature('TRANSCRIPT_CLASSIFIER') && isAutoModeAvailable) {
      options.push({
        label: `Yes, clear context${usedLabel} and use auto mode`,
        value: 'yes-auto-clear-context',
      })
    } else if (isBypassPermissionsModeAvailable) {
      options.push({
        label: `Yes, clear context${usedLabel} and bypass permissions`,
        value: 'yes-bypass-permissions',
      })
    } else {
      options.push({
        label: `Yes, clear context${usedLabel} and auto-accept edits`,
        value: 'yes-accept-edits',
      })
    }
  }

  // Ranura 2: conservar el contexto con el modo elevado (misma prioridad: auto > bypass > edits).
  if (feature('TRANSCRIPT_CLASSIFIER') && isAutoModeAvailable) {
    options.push({
      label: 'Yes, and use auto mode',
      value: 'yes-resume-auto-mode',
    })
  } else if (isBypassPermissionsModeAvailable) {
    options.push({
      label: 'Yes, and bypass permissions',
      value: 'yes-accept-edits-keep-context',
    })
  } else {
    options.push({
      label: 'Yes, auto-accept edits',
      value: 'yes-accept-edits-keep-context',
    })
  }

  options.push({
    label: 'Yes, manually approve edits',
    value: 'yes-default-keep-context',
  })

  if (showUltraplan) {
    options.push({
      label: 'No, refine with Ultraplan on Claude Code on the web',
      value: 'ultraplan',
    })
  }

  options.push({
    type: 'input',
    label: 'No, keep planning',
    value: 'no',
    placeholder: 'Tell Claude what to change',
    description: 'shift+tab to approve with this feedback',
    onChange: onFeedbackChange,
  })

  return options
}

function getContextUsedPercent(
  usage:
    | {
        input_tokens: number
        cache_creation_input_tokens?: number | null
        cache_read_input_tokens?: number | null
      }
    | undefined,
  permissionMode: PermissionMode,
): number | null {
  if (!usage) return null
  const runtimeModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: getMainLoopModel(),
    exceeds200kTokens: false,
  })
  const contextWindowSize = getContextWindowForModel(
    runtimeModel,
    getSdkBetas(),
  )
  const { used } = calculateContextPercentages(
    {
      input_tokens: usage.input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    },
    contextWindowSize,
  )
  return used
}
