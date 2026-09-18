import figures from 'figures'
import React, { useMemo } from 'react'
import { useTerminalSize } from '@anthropic/ink'
import { Box, Text, stringWidth } from '@anthropic/ink'
import type { Question } from '@claude-code-how-works/tool-registry/tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { truncateToWidth } from '@claude-code-how-works/output/formatters/truncate.js'

// Copia de `ccnmt: packages/permission/src/components/AskUserQuestionPermissionRequest/QuestionNavigationBar.tsx` con los
// comentarios traducidos; el cuerpo es el de la fuente.

type Props = {
  questions: Question[]
  currentQuestionIndex: number
  answers: Record<string, string>
  hideSubmitTab?: boolean
}

export function QuestionNavigationBar({
  questions,
  currentQuestionIndex,
  answers,
  hideSubmitTab = false,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()

  // Calcula el texto que muestra cada pestaña segun el ancho disponible.
  const tabDisplayTexts = useMemo(() => {
    // Los elementos de ancho fijo.
    const leftArrow = '← '
    const rightArrow = ' →'
    const submitText = hideSubmitTab ? '' : ` ${figures.tick} Submit `
    const checkboxWidth = 2 // checkbox + space
    const paddingPerTab = 2 // space before and after each tab text

    const fixedWidth =
      stringWidth(leftArrow) + stringWidth(rightArrow) + stringWidth(submitText)

    // El ancho disponible para todas las pestañas de pregunta.
    const availableForTabs = columns - fixedWidth

    if (availableForTabs <= 0) {
      // Terminal demasiado estrecha: se cae de vuelta a la vista minima.
      return questions.map((q: Question, index: number) => {
        const header = q?.header || `Q${index + 1}`
        return index === currentQuestionIndex ? header.slice(0, 3) : ''
      })
    }

    // El ancho ideal de cada pestaña (checkbox + padding + texto).
    const tabHeaders = questions.map(
      (q: Question, index: number) => q?.header || `Q${index + 1}`,
    )
    const idealWidths = tabHeaders.map(
      header => checkboxWidth + paddingPerTab + stringWidth(header),
    )

    // El ancho ideal total.
    const totalIdealWidth = idealWidths.reduce((sum, w) => sum + w, 0)

    // Si todo cabe, se usan los encabezados completos.
    if (totalIdealWidth <= availableForTabs) {
      return tabHeaders
    }

    // Hay que truncar: la pestaña actual tiene prioridad.
    const currentHeader = tabHeaders[currentQuestionIndex] || ''
    const currentIdealWidth =
      checkboxWidth + paddingPerTab + stringWidth(currentHeader)

    // Ancho minimo de las demas pestañas (checkbox + padding + 1 caracter +
    // puntos suspensivos).
    const minWidthPerTab = checkboxWidth + paddingPerTab + 2 // "X…"

    // El espacio de la pestaña actual: se intenta mostrar el texto completo.
    const currentTabWidth = Math.min(currentIdealWidth, availableForTabs / 2)
    const remainingWidth = availableForTabs - currentTabWidth

    // El espacio de las demas pestañas.
    const otherTabCount = questions.length - 1
    const widthPerOtherTab = Math.max(
      minWidthPerTab,
      Math.floor(remainingWidth / Math.max(otherTabCount, 1)),
    )

    return tabHeaders.map((header, index) => {
      if (index === currentQuestionIndex) {
        // Pestaña actual: se muestra todo lo que quepa.
        const maxTextWidth = currentTabWidth - checkboxWidth - paddingPerTab
        return truncateToWidth(header, maxTextWidth)
      } else {
        // Las demas pestañas se truncan hasta caber.
        const maxTextWidth = widthPerOtherTab - checkboxWidth - paddingPerTab
        return truncateToWidth(header, maxTextWidth)
      }
    })
  }, [questions, currentQuestionIndex, columns, hideSubmitTab])

  const hideArrows = questions.length === 1 && hideSubmitTab

  return (
    <Box flexDirection="row" marginBottom={1}>
      {!hideArrows && (
        <Text color={currentQuestionIndex === 0 ? 'inactive' : undefined}>
          ←{' '}
        </Text>
      )}
      {questions.map((q: Question, index: number) => {
        const isSelected = index === currentQuestionIndex
        const isAnswered = q?.question && !!answers[q.question]
        const checkbox = isAnswered ? figures.checkboxOn : figures.checkboxOff
        const displayText =
          tabDisplayTexts[index] || q?.header || `Q${index + 1}`

        return (
          <Box key={q?.question || `question-${index}`}>
            {isSelected ? (
              <Text backgroundColor="permission" color="inverseText">
                {' '}
                {checkbox} {displayText}{' '}
              </Text>
            ) : (
              <Text>
                {' '}
                {checkbox} {displayText}{' '}
              </Text>
            )}
          </Box>
        )
      })}
      {!hideSubmitTab && (
        <Box key="submit">
          {currentQuestionIndex === questions.length ? (
            <Text backgroundColor="permission" color="inverseText">
              {' '}
              {figures.tick} Submit{' '}
            </Text>
          ) : (
            <Text> {figures.tick} Submit </Text>
          )}
        </Box>
      )}
      {!hideArrows && (
        <Text
          color={
            currentQuestionIndex === questions.length ? 'inactive' : undefined
          }
        >
          {' '}
          →
        </Text>
      )}
    </Box>
  )
}
