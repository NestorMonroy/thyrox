import figures from 'figures'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTerminalSize } from '@anthropic/ink'
import { type KeyboardEvent, Box, Text } from '@anthropic/ink'
import {
  useKeybinding,
  useKeybindings,
} from '@anthropic/ink/keybindings'
import { useAppState } from '../../appStateHooks.js'
import type { Question } from '@thyrox/tool-registry/tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { getExternalEditor } from '@thyrox/storage/editor.js'
import { toIDEDisplayName } from '@thyrox/ide/ide.js'
import { editPromptInEditor } from '@thyrox/repl/promptEditor.js'
import { Divider } from '@anthropic/ink'
import TextInput from '@thyrox/repl/components/TextInput.js'
import { PermissionRequestTitle } from '../PermissionRequestTitle.js'
import { PreviewBox } from './PreviewBox.js'
import { QuestionNavigationBar } from './QuestionNavigationBar.js'
import type { QuestionState } from './use-multiple-choice-state.js'

type Props = {
  question: Question
  questions: Question[]
  currentQuestionIndex: number
  answers: Record<string, string>
  questionStates: Record<string, QuestionState>
  hideSubmitTab?: boolean
  minContentHeight?: number
  minContentWidth?: number
  onUpdateQuestionState: (
    questionText: string,
    updates: Partial<QuestionState>,
    isMultiSelect: boolean,
  ) => void
  onAnswer: (
    questionText: string,
    label: string | string[],
    textInput?: string,
    shouldAdvance?: boolean,
  ) => void
  onTextInputFocus: (isInInput: boolean) => void
  onCancel: () => void
  onTabPrev?: () => void
  onTabNext?: () => void
  onRespondToClaude: () => void
  onFinishPlanInterview: () => void
}

/**
 * Copia de `ccnmt: packages/permission/src/components/AskUserQuestionPermissionRequest/PreviewQuestionView.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Vista lado a lado para las preguntas que traen contenido de vista previa.
 * Muestra una lista vertical de opciones a la izquierda y un panel de vista
 * previa a la derecha.
 */
export function PreviewQuestionView({
  question,
  questions,
  currentQuestionIndex,
  answers,
  questionStates,
  hideSubmitTab = false,
  minContentHeight,
  minContentWidth,
  onUpdateQuestionState,
  onAnswer,
  onTextInputFocus,
  onCancel,
  onTabPrev,
  onTabNext,
  onRespondToClaude,
  onFinishPlanInterview,
}: Props): React.ReactNode {
  const isInPlanMode = useAppState(s => s.toolPermissionContext.mode) === 'plan'
  const [isFooterFocused, setIsFooterFocused] = useState(false)
  const [footerIndex, setFooterIndex] = useState(0)
  const [isInNotesInput, setIsInNotesInput] = useState(false)
  const [cursorOffset, setCursorOffset] = useState(0)

  const editor = getExternalEditor()
  const editorName = editor ? toIDEDisplayName(editor) : null

  const questionText = question.question
  const questionState = questionStates[questionText]

  // Sólo opciones reales: en una pregunta con vista previa no hay «Other»
  const allOptions = question.options

  // Seguir qué opción tiene el foco, para saber qué vista previa mostrar
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Reiniciar `focusedIndex` al navegar a otra pregunta
  const prevQuestionText = useRef(questionText)
  if (prevQuestionText.current !== questionText) {
    prevQuestionText.current = questionText
    const selected = questionState?.selectedValue as string | undefined
    const idx = selected
      ? allOptions.findIndex(opt => opt.label === selected)
      : -1
    setFocusedIndex(idx >= 0 ? idx : 0)
  }

  const focusedOption = allOptions[focusedIndex]
  const selectedValue = questionState?.selectedValue as string | undefined
  const notesValue = questionState?.textInputValue || ''

  const handleSelectOption = useCallback(
    (index: number) => {
      const option = allOptions[index]
      if (!option) return

      setFocusedIndex(index)
      onUpdateQuestionState(
        questionText,
        { selectedValue: option.label },
        false,
      )

      onAnswer(questionText, option.label)
    },
    [allOptions, questionText, onUpdateQuestionState, onAnswer],
  )

  const handleNavigate = useCallback(
    (direction: 'up' | 'down' | number) => {
      if (isInNotesInput) return

      let newIndex: number
      if (typeof direction === 'number') {
        newIndex = direction
      } else if (direction === 'up') {
        newIndex = focusedIndex > 0 ? focusedIndex - 1 : focusedIndex
      } else {
        newIndex =
          focusedIndex < allOptions.length - 1 ? focusedIndex + 1 : focusedIndex
      }

      if (newIndex >= 0 && newIndex < allOptions.length) {
        setFocusedIndex(newIndex)
      }
    },
    [focusedIndex, allOptions.length, isInNotesInput],
  )

  // Atender ctrl+g para abrir el editor externo y escribir las notas
  useKeybinding(
    'chat:externalEditor',
    async () => {
      const currentValue = questionState?.textInputValue || ''
      const result = await editPromptInEditor(currentValue)
      if (result.content !== null && result.content !== currentValue) {
        onUpdateQuestionState(
          questionText,
          { textInputValue: result.content },
          false,
        )
      }
    },
    { context: 'Chat', isActive: isInNotesInput && !!editor },
  )

  // Atender las flechas izquierda y derecha y el tab para navegar entre
  // preguntas. Tiene que estar en el componente hijo, y no sólo en el padre,
  // porque los manejadores de `useInput` del hijo se registran primero en el
  // emisor de eventos y se disparan antes que los del padre. Sin esto, el
  // `useKeybindings` del padre puede no dispararse de forma fiable, según el
  // orden de los listeners en el emisor.
  useKeybindings(
    {
      'tabs:previous': () => onTabPrev?.(),
      'tabs:next': () => onTabNext?.(),
    },
    { context: 'Tabs', isActive: !isInNotesInput && !isFooterFocused },
  )

  // Reenviar la respuesta (la etiqueta a secas) al salir del campo de notas.
  // Las notas se guardan en `questionStates` y se recogen al enviar, por las
  // anotaciones.
  const handleNotesExit = useCallback(() => {
    setIsInNotesInput(false)
    onTextInputFocus(false)
    if (selectedValue) {
      onAnswer(questionText, selectedValue)
    }
  }, [selectedValue, questionText, onAnswer, onTextInputFocus])

  const handleDownFromPreview = useCallback(() => {
    setIsFooterFocused(true)
  }, [])

  const handleUpFromFooter = useCallback(() => {
    setIsFooterFocused(false)
  }, [])

  // Atender el teclado para navegar entre opciones, pie y notas. Siempre
  // activo — el manejador enruta por dentro según `isFooterFocused` e
  // `isInNotesInput`.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isFooterFocused) {
        if (e.key === 'up' || (e.ctrl && e.key === 'p')) {
          e.preventDefault()
          if (footerIndex === 0) {
            handleUpFromFooter()
          } else {
            setFooterIndex(0)
          }
          return
        }

        if (e.key === 'down' || (e.ctrl && e.key === 'n')) {
          e.preventDefault()
          if (isInPlanMode && footerIndex === 0) {
            setFooterIndex(1)
          }
          return
        }

        if (e.key === 'return') {
          e.preventDefault()
          if (footerIndex === 0) {
            onRespondToClaude()
          } else {
            onFinishPlanInterview()
          }
          return
        }

        if (e.key === 'escape') {
          e.preventDefault()
          onCancel()
        }
        return
      }

      if (isInNotesInput) {
        // En modo de entrada de notas, interceptar escape y enter como
        // respaldo, por si los manejadores de la fase del EventEmitter
        // (`useInput`) los consumen antes de que lleguen a `TextInput`. El
        // análisis completo de la cadena de despacho de eventos está en el
        // mensaje del commit.
        if (e.key === 'escape') {
          e.preventDefault()
          handleNotesExit()
        } else if (e.key === 'return') {
          e.preventDefault()
          handleNotesExit()
        }
        return
      }

      // Atender la navegación entre opciones (vertical)
      if (e.key === 'up' || (e.ctrl && e.key === 'p')) {
        e.preventDefault()
        if (focusedIndex > 0) {
          handleNavigate('up')
        }
      } else if (e.key === 'down' || (e.ctrl && e.key === 'n')) {
        e.preventDefault()
        if (focusedIndex === allOptions.length - 1) {
          // Al final de las opciones, pasar al pie
          handleDownFromPreview()
        } else {
          handleNavigate('down')
        }
      } else if (e.key === 'return') {
        e.preventDefault()
        handleSelectOption(focusedIndex)
      } else if (e.key === 'n' && !e.ctrl && !e.meta) {
        // Pulsar 'n' para dar el foco al campo de notas
        e.preventDefault()
        setIsInNotesInput(true)
        onTextInputFocus(true)
      } else if (e.key === 'escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key.length === 1 && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key, 10) - 1
        if (idx < allOptions.length) {
          handleNavigate(idx)
        }
      }
    },
    [
      isFooterFocused,
      footerIndex,
      isInPlanMode,
      isInNotesInput,
      focusedIndex,
      allOptions.length,
      handleUpFromFooter,
      handleDownFromPreview,
      handleNavigate,
      handleSelectOption,
      handleNotesExit,
      onRespondToClaude,
      onFinishPlanInterview,
      onCancel,
      onTextInputFocus,
    ],
  )

  const previewContent = focusedOption?.preview || null

  // El ancho disponible del panel derecho es el de la terminal menos el panel izquierdo y el hueco.
  const LEFT_PANEL_WIDTH = 30
  const GAP = 4
  const { columns } = useTerminalSize()
  const previewMaxWidth = columns - LEFT_PANEL_WIDTH - GAP

  // Líneas que, dentro del área de contenido, no son contenido de vista
  // previa:
  // 1: el `marginTop` de la caja lado a lado
  // 2: los bordes de `PreviewBox` (arriba y abajo)
  // 2: la sección de notas (`marginTop=1` más el texto)
  // 2: la sección del pie (`marginTop=1` más el separador)
  // 1: la línea de «Chat about this»
  // 1: la línea de modo plan (puede mostrarse o no)
  // 2: el texto de ayuda (`marginTop=1` más el texto)
  const PREVIEW_OVERHEAD = 11

  // Calcular el máximo de líneas disponibles para el contenido de vista
  // previa a partir del presupuesto de altura del padre, para no desbordar la
  // terminal. NO se rellenan las opciones más cortas hasta igualar a la más
  // alta — de la consistencia de maquetación entre preguntas se encarga el
  // `minHeight` de la caja exterior, y los saltos dentro de una misma pregunta
  // son aceptables.
  const previewMaxLines = useMemo(() => {
    return minContentHeight
      ? Math.max(1, minContentHeight - PREVIEW_OVERHEAD)
      : undefined
  }, [minContentHeight])

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      <Divider color="inactive" />
      <Box flexDirection="column" paddingTop={0}>
        <QuestionNavigationBar
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          hideSubmitTab={hideSubmitTab}
        />
        <PermissionRequestTitle title={question.question} color={'text'} />

        <Box flexDirection="column" minHeight={minContentHeight}>
          {/* Side-by-side layout: options on left, preview on right */}
          <Box marginTop={1} flexDirection="row" gap={4}>
            {/* Left panel: vertical option list */}
            <Box flexDirection="column" width={30}>
              {allOptions.map((option, index) => {
                const isFocused = focusedIndex === index
                const isSelected = selectedValue === option.label

                return (
                  <Box key={option.label} flexDirection="row">
                    {isFocused ? (
                      <Text color="suggestion">{figures.pointer}</Text>
                    ) : (
                      <Text> </Text>
                    )}
                    <Text dimColor> {index + 1}.</Text>
                    <Text
                      color={
                        isSelected
                          ? 'success'
                          : isFocused
                            ? 'suggestion'
                            : undefined
                      }
                      bold={isFocused}
                    >
                      {' '}
                      {option.label}
                    </Text>
                    {isSelected && <Text color="success"> {figures.tick}</Text>}
                  </Box>
                )
              })}
            </Box>

            {/* Right panel: preview + notes */}
            <Box flexDirection="column" flexGrow={1}>
              <PreviewBox
                content={previewContent || 'No preview available'}
                maxLines={previewMaxLines}
                minWidth={minContentWidth}
                maxWidth={previewMaxWidth}
              />
              <Box marginTop={1} flexDirection="row" gap={1}>
                <Text color="suggestion">Notes:</Text>
                {isInNotesInput ? (
                  <TextInput
                    value={notesValue}
                    placeholder="Add notes on this design…"
                    onChange={value => {
                      onUpdateQuestionState(
                        questionText,
                        { textInputValue: value },
                        false,
                      )
                    }}
                    onSubmit={handleNotesExit}
                    onExit={handleNotesExit}
                    focus={true}
                    showCursor={true}
                    columns={60}
                    cursorOffset={cursorOffset}
                    onChangeCursorOffset={setCursorOffset}
                  />
                ) : (
                  <Text dimColor italic>
                    {notesValue || 'press n to add notes'}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>

          {/* Footer section */}
          <Box flexDirection="column" marginTop={1}>
            <Divider color="inactive" />
            <Box flexDirection="row" gap={1}>
              {isFooterFocused && footerIndex === 0 ? (
                <Text color="suggestion">{figures.pointer}</Text>
              ) : (
                <Text> </Text>
              )}
              <Text
                color={
                  isFooterFocused && footerIndex === 0
                    ? 'suggestion'
                    : undefined
                }
              >
                Chat about this
              </Text>
            </Box>
            {isInPlanMode && (
              <Box flexDirection="row" gap={1}>
                {isFooterFocused && footerIndex === 1 ? (
                  <Text color="suggestion">{figures.pointer}</Text>
                ) : (
                  <Text> </Text>
                )}
                <Text
                  color={
                    isFooterFocused && footerIndex === 1
                      ? 'suggestion'
                      : undefined
                  }
                >
                  Skip interview and plan immediately
                </Text>
              </Box>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color="inactive" dimColor>
              Enter to select · {figures.arrowUp}/{figures.arrowDown} to
              navigate · n to add notes
              {questions.length > 1 && <> · Tab to switch questions</>}
              {isInNotesInput && editorName && (
                <> · ctrl+g to edit in {editorName}</>
              )}{' '}
              · Esc to cancel
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
