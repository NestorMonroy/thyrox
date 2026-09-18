import React, { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Box, Text } from '@anthropic/ink'
import type { KeybindingAction } from '@anthropic/ink/keybindings'
import { useKeybindings } from '@anthropic/ink/keybindings'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { useSetAppState } from '../appStateHooks.js'
import { type OptionWithDescription, Select } from '@thyrox/repl/components/CustomSelect/select.js'

export type FeedbackType = 'accept' | 'reject'

export type PermissionPromptOption<T extends string> = {
  value: T
  label: ReactNode
  feedbackConfig?: {
    type: FeedbackType
    placeholder?: string
  }
  keybinding?: KeybindingAction
}

export type ToolAnalyticsContext = {
  toolName: string
  isMcp: boolean
}

type PermissionPromptProps<T extends string> = {
  options: PermissionPromptOption<T>[]
  onSelect: (value: T, feedback?: string) => void
  onCancel?: () => void
  question?: string | ReactNode
  toolAnalyticsContext?: ToolAnalyticsContext
}

const DEFAULT_PLACEHOLDERS: Record<FeedbackType, string> = {
  accept: 'tell Claude what to do next',
  reject: 'tell Claude what to do differently',
}

/**
 * Copia de `ccnmt: packages/permission/src/components/PermissionPrompt.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Componente compartido de los prompts de permiso, con campo de comentario
 * opcional.
 *
 * Se encarga de:
 * - La pregunta «Do you want to proceed?» con su pista opcional de Tab.
 * - La comprobación de la feature flag de la capacidad de comentar.
 * - Alternar el modo de entrada (Tab para desplegar el campo de comentario).
 * - Los eventos de analítica de las interacciones con el comentario.
 * - Transformar las opciones al formato que `Select` admite.
 */
export function PermissionPrompt<T extends string>({
  options,
  onSelect,
  onCancel,
  question = 'Do you want to proceed?',
  toolAnalyticsContext,
}: PermissionPromptProps<T>): React.ReactNode {
  const setAppState = useSetAppState()
  const [acceptFeedback, setAcceptFeedback] = useState('')
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [acceptInputMode, setAcceptInputMode] = useState(false)
  const [rejectInputMode, setRejectInputMode] = useState(false)
  const [focusedValue, setFocusedValue] = useState<T | null>(null)
  // Seguir si el usuario llegó a entrar al modo de comentario (se conserva tras plegarlo)
  const [acceptFeedbackModeEntered, setAcceptFeedbackModeEntered] =
    useState(false)
  const [rejectFeedbackModeEntered, setRejectFeedbackModeEntered] =
    useState(false)

  // Localizar qué opción tiene el foco y si trae configuración de comentario
  const focusedOption = options.find(opt => opt.value === focusedValue)
  const focusedFeedbackType = focusedOption?.feedbackConfig?.type

  // Mostrar la pista de Tab con el foco en una opción que admite comentario y no está ya en modo de entrada
  const showTabHint =
    (focusedFeedbackType === 'accept' && !acceptInputMode) ||
    (focusedFeedbackType === 'reject' && !rejectInputMode)

  // Transformar las opciones al formato que `Select` admite
  const selectOptions = useMemo((): OptionWithDescription<T>[] => {
    return options.map(opt => {
      const { value, label, feedbackConfig } = opt

      // Sin configuración de comentario, es una opción simple
      if (!feedbackConfig) {
        return {
          label,
          value,
        }
      }

      const { type, placeholder } = feedbackConfig
      const isInputMode = type === 'accept' ? acceptInputMode : rejectInputMode
      const onChange = type === 'accept' ? setAcceptFeedback : setRejectFeedback
      const defaultPlaceholder = DEFAULT_PLACEHOLDERS[type]

      // En modo de entrada, mostrar el campo
      if (isInputMode) {
        return {
          type: 'input' as const,
          label,
          value,
          placeholder: placeholder ?? defaultPlaceholder,
          onChange,
          allowEmptySubmitToCancel: true,
        }
      }

      // Fuera del modo de entrada, mostrar la opción simple
      return {
        label,
        value,
      }
    })
  }, [options, acceptInputMode, rejectInputMode])

  // Atender la tecla Tab para alternar el modo de entrada
  const handleInputModeToggle = useCallback(
    (value: T) => {
      const option = options.find(opt => opt.value === value)
      if (!option?.feedbackConfig) return

      const { type } = option.feedbackConfig
      const analyticsProps = {
        toolName:
          toolAnalyticsContext?.toolName as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        isMcp: toolAnalyticsContext?.isMcp ?? false,
      }

      if (type === 'accept') {
        if (acceptInputMode) {
          setAcceptInputMode(false)
          logEvent('tengu_accept_feedback_mode_collapsed', analyticsProps)
        } else {
          setAcceptInputMode(true)
          setAcceptFeedbackModeEntered(true)
          logEvent('tengu_accept_feedback_mode_entered', analyticsProps)
        }
      } else if (type === 'reject') {
        if (rejectInputMode) {
          setRejectInputMode(false)
          logEvent('tengu_reject_feedback_mode_collapsed', analyticsProps)
        } else {
          setRejectInputMode(true)
          setRejectFeedbackModeEntered(true)
          logEvent('tengu_reject_feedback_mode_entered', analyticsProps)
        }
      }
    },
    [options, acceptInputMode, rejectInputMode, toolAnalyticsContext],
  )

  // Atender la selección
  const handleSelect = useCallback(
    (value: T) => {
      const option = options.find(opt => opt.value === value)
      if (!option) return

      // Obtener el comentario si aplica
      let feedback: string | undefined
      if (option.feedbackConfig) {
        const rawFeedback =
          option.feedbackConfig.type === 'accept'
            ? acceptFeedback
            : rejectFeedback
        const trimmedFeedback = rawFeedback.trim()

        if (trimmedFeedback) {
          feedback = trimmedFeedback
        }

        // Registrar el envío de aceptación o rechazo con el contexto del comentario
        const analyticsProps = {
          toolName:
            toolAnalyticsContext?.toolName as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          isMcp: toolAnalyticsContext?.isMcp ?? false,
          has_instructions: !!trimmedFeedback,
          instructions_length: trimmedFeedback?.length ?? 0,
          entered_feedback_mode:
            option.feedbackConfig.type === 'accept'
              ? acceptFeedbackModeEntered
              : rejectFeedbackModeEntered,
        }

        if (option.feedbackConfig.type === 'accept') {
          logEvent('tengu_accept_submitted', analyticsProps)
        } else if (option.feedbackConfig.type === 'reject') {
          logEvent('tengu_reject_submitted', analyticsProps)
        }
      }

      onSelect(value, feedback)
    },
    [
      options,
      acceptFeedback,
      rejectFeedback,
      onSelect,
      toolAnalyticsContext,
      acceptFeedbackModeEntered,
      rejectFeedbackModeEntered,
    ],
  )

  // Registrar los manejadores de atajo de las opciones que tienen uno fijado
  const keybindingHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {}
    for (const opt of options) {
      if (opt.keybinding) {
        handlers[opt.keybinding] = () => handleSelect(opt.value)
      }
    }
    return handlers
  }, [options, handleSelect])

  useKeybindings(keybindingHandlers, { context: 'Confirmation' })

  // Atender la cancelación (Esc)
  const handleCancel = useCallback(() => {
    logEvent('tengu_permission_request_escape', {})
    // Incrementar el conteo de escapes, para la atribución
    setAppState(prev => ({
      ...prev,
      attribution: {
        ...prev.attribution,
        escapeCount: prev.attribution.escapeCount + 1,
      },
    }))
    onCancel?.()
  }, [onCancel, setAppState])

  return (
    <Box flexDirection="column">
      {typeof question === 'string' ? <Text>{question}</Text> : question}
      <Select
        options={selectOptions}
        inlineDescriptions
        onChange={handleSelect}
        onCancel={handleCancel}
        onFocus={value => {
          // Reiniciar el modo de entrada al navegar fuera, pero sólo si no se ha escrito texto
          const newOption = options.find(opt => opt.value === value)
          if (
            newOption?.feedbackConfig?.type !== 'accept' &&
            acceptInputMode &&
            !acceptFeedback.trim()
          ) {
            setAcceptInputMode(false)
          }
          if (
            newOption?.feedbackConfig?.type !== 'reject' &&
            rejectInputMode &&
            !rejectFeedback.trim()
          ) {
            setRejectInputMode(false)
          }
          setFocusedValue(value)
        }}
        onInputModeToggle={handleInputModeToggle}
      />
      <Box marginTop={1}>
        <Text dimColor>Esc to cancel{showTabHint && ' · Tab to amend'}</Text>
      </Box>
    </Box>
  )
}
