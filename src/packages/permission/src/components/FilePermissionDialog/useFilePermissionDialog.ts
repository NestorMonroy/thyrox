import { useCallback, useMemo, useState } from 'react'
import { useAppState } from '../../appStateHooks.js'
import { useKeybindings } from '@anthropic/ink/keybindings'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { sanitizeToolNameForAnalytics } from '@thyrox/agent/eventMetadata.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import type { CompletionType } from '@thyrox/local-observability/logging'
import type { ToolUseConfirm } from '../PermissionRequest.js'
import {
  type FileOperationType,
  getFilePermissionOptions,
  type PermissionOption,
  type PermissionOptionWithLabel,
} from './permissionOptions.js'
import {
  PERMISSION_HANDLERS,
  type PermissionHandlerParams,
} from './usePermissionHandler.js'

export interface ToolInput {
  [key: string]: unknown
}

export type UseFilePermissionDialogProps<T extends ToolInput> = {
  filePath: string
  completionType: CompletionType
  languageName: string | Promise<string>
  toolUseConfirm: ToolUseConfirm
  onDone: () => void
  onReject: () => void
  parseInput: (input: unknown) => T
  operationType?: FileOperationType
}

export type UseFilePermissionDialogResult<T> = {
  options: PermissionOptionWithLabel[]
  onChange: (option: PermissionOption, input: T, feedback?: string) => void
  acceptFeedback: string
  rejectFeedback: string
  focusedOption: string
  setFocusedOption: (option: string) => void
  handleInputModeToggle: (value: string) => void
  yesInputMode: boolean
  noInputMode: boolean
}

/**
 * Copia de `ccnmt: packages/permission/src/components/FilePermissionDialog/
 * useFilePermissionDialog.ts` con los comentarios traducidos; el cuerpo es el
 * de la fuente.
 *
 * Hook que resuelve los diálogos de permiso de archivo con la lógica común.
 */
export function useFilePermissionDialog<T extends ToolInput>({
  filePath,
  completionType,
  languageName,
  toolUseConfirm,
  onDone,
  onReject,
  parseInput,
  operationType = 'write',
}: UseFilePermissionDialogProps<T>): UseFilePermissionDialogResult<T> {
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
  const [acceptFeedback, setAcceptFeedback] = useState('')
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [focusedOption, setFocusedOption] = useState('yes')
  const [yesInputMode, setYesInputMode] = useState(false)
  const [noInputMode, setNoInputMode] = useState(false)
  // Registra si el usuario llego a entrar en modo de feedback; persiste
  // después de colapsar.
  const [yesFeedbackModeEntered, setYesFeedbackModeEntered] = useState(false)
  const [noFeedbackModeEntered, setNoFeedbackModeEntered] = useState(false)

  // Genera las opciones a partir del contexto.
  const options = useMemo(
    () =>
      getFilePermissionOptions({
        filePath,
        toolPermissionContext,
        operationType,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode,
        noInputMode,
      }),
    [filePath, toolPermissionContext, operationType, yesInputMode, noInputMode],
  )

  // Resuelve la selección de opción con los handlers compartidos.
  const onChange = useCallback(
    (option: PermissionOption, input: T, feedback?: string) => {
      const params: PermissionHandlerParams = {
        messageId: toolUseConfirm.assistantMessage.message.id,
        path: filePath,
        toolUseConfirm,
        toolPermissionContext,
        onDone,
        onReject,
        completionType,
        languageName,
        operationType,
      }

      // Sobreescribe el input de toolUseConfirm para pasar el input ya
      // parseado.
      const originalOnAllow = toolUseConfirm.onAllow
      toolUseConfirm.onAllow = (
        _input: unknown,
        permissionUpdates: PermissionUpdate[],
        feedback?: string,
      ) => {
        originalOnAllow(input, permissionUpdates, feedback)
      }

      const handler = PERMISSION_HANDLERS[option.type]
      handler(params, {
        feedback,
        hasFeedback: !!feedback,
        enteredFeedbackMode:
          option.type === 'accept-once'
            ? yesFeedbackModeEntered
            : noFeedbackModeEntered,
        scope: option.type === 'accept-session' ? option.scope : undefined,
      })
    },
    [
      filePath,
      completionType,
      languageName,
      toolUseConfirm,
      toolPermissionContext,
      onDone,
      onReject,
      operationType,
      yesFeedbackModeEntered,
      noFeedbackModeEntered,
    ],
  )

  // Handler de confirm:cycleMode: selecciona la opción accept-session.
  const handleCycleMode = useCallback(() => {
    const sessionOption = options.find(o => o.option.type === 'accept-session')
    if (sessionOption) {
      const parsedInput = parseInput(toolUseConfirm.input)
      onChange(sessionOption.option, parsedInput)
    }
  }, [options, parseInput, toolUseConfirm.input, onChange])

  // Registra el handler del atajo de teclado por el sistema de keybindings.
  useKeybindings(
    { 'confirm:cycleMode': handleCycleMode },
    { context: 'Confirmation' },
  )

  // Envuelve setFocusedOption y reinicia el modo de entrada al salir
  // navegando.
  const handleFocusedOptionChange = useCallback(
    (value: string) => {
      // Reinicia el modo de entrada al salir navegando, pero solo si no se
      // tecleo texto.
      if (value !== 'yes' && yesInputMode && !acceptFeedback.trim()) {
        setYesInputMode(false)
      }
      if (value !== 'no' && noInputMode && !rejectFeedback.trim()) {
        setNoInputMode(false)
      }
      setFocusedOption(value)
    },
    [yesInputMode, noInputMode, acceptFeedback, rejectFeedback],
  )

  // La tecla Tab alterna el modo de entrada de las opciones Sí/No.
  const handleInputModeToggle = useCallback(
    (value: string) => {
      const analyticsProps = {
        toolName: sanitizeToolNameForAnalytics(
          toolUseConfirm.tool.name,
        ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        isMcp: toolUseConfirm.tool.isMcp ?? false,
      }

      if (value === 'yes') {
        if (yesInputMode) {
          setYesInputMode(false)
          logEvent('tengu_accept_feedback_mode_collapsed', analyticsProps)
        } else {
          setYesInputMode(true)
          setYesFeedbackModeEntered(true)
          logEvent('tengu_accept_feedback_mode_entered', analyticsProps)
        }
      } else if (value === 'no') {
        if (noInputMode) {
          setNoInputMode(false)
          logEvent('tengu_reject_feedback_mode_collapsed', analyticsProps)
        } else {
          setNoInputMode(true)
          setNoFeedbackModeEntered(true)
          logEvent('tengu_reject_feedback_mode_entered', analyticsProps)
        }
      }
    },
    [yesInputMode, noInputMode, toolUseConfirm],
  )

  return {
    options,
    onChange,
    acceptFeedback,
    rejectFeedback,
    focusedOption,
    setFocusedOption: handleFocusedOptionChange,
    handleInputModeToggle,
    yesInputMode,
    noInputMode,
  }
}
