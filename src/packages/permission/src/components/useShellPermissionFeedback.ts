import { useState } from 'react'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { sanitizeToolNameForAnalytics } from '@claude-code-how-works/agent/eventMetadata.js'
import { useSetAppState } from '../appStateHooks.js'
import type { ToolUseConfirm } from './PermissionRequest.js'
import { logUnaryPermissionEvent } from './utils.js'

/**
 * Copia de `ccnmt: packages/permission/src/components/
 * useShellPermissionFeedback.ts` con los comentarios traducidos; el cuerpo es
 * el de la fuente.
 *
 * El estado y los handlers del modo de feedback, compartidos por los dialogos
 * de permiso de shell (Bash, PowerShell). Encapsula el alternador del modo de
 * entrada si/no, el estado del texto de feedback, el seguimiento del foco y el
 * manejo del rechazo.
 */
export function useShellPermissionFeedback({
  toolUseConfirm,
  onDone,
  onReject,
}: {
  toolUseConfirm: ToolUseConfirm
  onDone: () => void
  onReject: () => void
}): {
  yesInputMode: boolean
  noInputMode: boolean
  yesFeedbackModeEntered: boolean
  noFeedbackModeEntered: boolean
  acceptFeedback: string
  rejectFeedback: string
  setAcceptFeedback: (v: string) => void
  setRejectFeedback: (v: string) => void
  focusedOption: string
  handleInputModeToggle: (option: string) => void
  handleReject: (feedback?: string) => void
  handleFocus: (value: string) => void
} {
  const setAppState = useSetAppState()
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [acceptFeedback, setAcceptFeedback] = useState('')
  const [yesInputMode, setYesInputMode] = useState(false)
  const [noInputMode, setNoInputMode] = useState(false)
  const [focusedOption, setFocusedOption] = useState('yes')
  // Registra si el usuario llego a entrar en modo de feedback; persiste
  // despues de colapsar.
  const [yesFeedbackModeEntered, setYesFeedbackModeEntered] = useState(false)
  const [noFeedbackModeEntered, setNoFeedbackModeEntered] = useState(false)

  // La tecla Tab alterna el modo de entrada de las opciones Si/No.
  function handleInputModeToggle(option: string) {
    // Avisa de que el usuario esta interactuando con el dialogo.
    toolUseConfirm.onUserInteraction()
    const analyticsProps = {
      toolName: sanitizeToolNameForAnalytics(
        toolUseConfirm.tool.name,
      ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      isMcp: toolUseConfirm.tool.isMcp ?? false,
    }

    if (option === 'yes') {
      if (yesInputMode) {
        setYesInputMode(false)
        logEvent('tengu_accept_feedback_mode_collapsed', analyticsProps)
      } else {
        setYesInputMode(true)
        setYesFeedbackModeEntered(true)
        logEvent('tengu_accept_feedback_mode_entered', analyticsProps)
      }
    } else if (option === 'no') {
      if (noInputMode) {
        setNoInputMode(false)
        logEvent('tengu_reject_feedback_mode_collapsed', analyticsProps)
      } else {
        setNoInputMode(true)
        setNoFeedbackModeEntered(true)
        logEvent('tengu_reject_feedback_mode_entered', analyticsProps)
      }
    }
  }

  function handleReject(feedback?: string) {
    const trimmedFeedback = feedback?.trim()
    const hasFeedback = !!trimmedFeedback

    // Registra el escape si no hubo feedback: el usuario pulso ESC.
    if (!hasFeedback) {
      logEvent('tengu_permission_request_escape', {})
      // Incrementa el conteo de escapes para el seguimiento de atribucion.
      setAppState(prev => ({
        ...prev,
        attribution: {
          ...prev.attribution,
          escapeCount: prev.attribution.escapeCount + 1,
        },
      }))
    }

    logUnaryPermissionEvent(
      'tool_use_single',
      toolUseConfirm,
      'reject',
      hasFeedback,
    )

    if (trimmedFeedback) {
      toolUseConfirm.onReject(trimmedFeedback)
    } else {
      toolUseConfirm.onReject()
    }

    onReject()
    onDone()
  }

  function handleFocus(value: string) {
    // Avisa de que el usuario esta interactuando con el dialogo, solo si el
    // foco cambio. Esto evita dispararlo en el montaje o render inicial.
    if (value !== focusedOption) {
      toolUseConfirm.onUserInteraction()
    }
    // Reinicia el modo de entrada al salir navegando, pero solo si no se
    // tecleo texto.
    if (value !== 'yes' && yesInputMode && !acceptFeedback.trim()) {
      setYesInputMode(false)
    }
    if (value !== 'no' && noInputMode && !rejectFeedback.trim()) {
      setNoInputMode(false)
    }
    setFocusedOption(value)
  }

  return {
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
  }
}
