import type {
  Base64ImageSource,
  ImageBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import React, {
  Suspense,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSettings } from '@claude-code-how-works/repl/hooks/useSettings.js'
import { Text, useTerminalSize } from '@anthropic/ink'
import { stringWidth, useTheme } from '@anthropic/ink'
import { useKeybindings } from '@anthropic/ink/keybindings'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { useAppState } from '../../appStateHooks.js'
import type { Question } from '@claude-code-how-works/tool-registry/tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { AskUserQuestionTool } from '@claude-code-how-works/tool-registry/tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { getInitialSettings } from '@claude-code-how-works/config/settings'
import { useQuestionAutoContinue } from './useQuestionAutoContinue.js'
import {
  type CliHighlight,
  getCliHighlightPromise,
} from '@claude-code-how-works/output/utils/cliHighlight.js'
import type { PastedContent } from '@claude-code-how-works/config'
import type { ImageDimensions } from '@claude-code-how-works/storage/imageResizer.js'
import { maybeResizeAndDownsampleImageBlock } from '@claude-code-how-works/storage/imageResizer.js'
import { cacheImagePath, storeImage } from '@claude-code-how-works/tool-registry/imageStore.js'
import { logError } from '@claude-code-how-works/local-observability/logging'
import { applyMarkdown } from '@claude-code-how-works/output/markdown.js'
import { isPlanModeInterviewPhaseEnabled } from '../../planModeV2.js'
import { getPlanFilePath } from '@claude-code-how-works/storage/plans.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'
import { QuestionView } from './QuestionView.js'
import { SubmitQuestionsView } from './SubmitQuestionsView.js'
import { useMultipleChoiceState } from './use-multiple-choice-state.js'

const MIN_CONTENT_HEIGHT = 12
const MIN_CONTENT_WIDTH = 40
// Copia de `ccnmt: packages/permission/src/components/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.tsx`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// Líneas que consume el marco alrededor del área de contenido (barra de
// navegación, título, pie, texto de ayuda, etc.)
const CONTENT_CHROME_OVERHEAD = 15

export function AskUserQuestionPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  const settings = useSettings()
  if (settings.syntaxHighlightingDisabled) {
    return <AskUserQuestionPermissionRequestBody {...props} highlight={null} />
  }
  return (
    <Suspense
      fallback={
        <AskUserQuestionPermissionRequestBody {...props} highlight={null} />
      }
    >
      <AskUserQuestionWithHighlight {...props} />
    </Suspense>
  )
}

function AskUserQuestionWithHighlight(
  props: PermissionRequestProps,
): React.ReactNode {
  const highlight = use(getCliHighlightPromise())
  return (
    <AskUserQuestionPermissionRequestBody {...props} highlight={highlight} />
  )
}

function AskUserQuestionPermissionRequestBody({
  toolUseConfirm,
  onDone,
  onReject,
  highlight,
}: PermissionRequestProps & {
  highlight: CliHighlight | null
}): React.ReactNode {
  // Memoizar el resultado del parseo: `safeParse` devuelve un objeto nuevo (y
  // un arreglo `questions` nuevo) en cada llamada. Sin esto, las escrituras de
  // ref en el cuerpo del render de abajo hacen que el React Compiler se salga
  // de este componente, así que nada queda memoizado de forma automática:
  // `questions` cambia de identidad en cada render y el `useMemo` de
  // `globalContentHeight` (que corre `applyMarkdown` sobre cada vista previa)
  // nunca acierta en su caché. `toolUseConfirm.input` es estable durante toda
  // la vida del diálogo (esta herramienta devuelve `behavior: 'ask'`
  // directamente y nunca pasa por el clasificador).
  const result = useMemo(
    () => AskUserQuestionTool.inputSchema.safeParse(toolUseConfirm.input),
    [toolUseConfirm.input],
  )
  const questions = result.success ? result.data.questions || [] : []
  const { rows: terminalRows } = useTerminalSize()
  const [theme] = useTheme()

  // Calcular unas dimensiones de contenido consistentes entre todas las
  // preguntas, para que no haya saltos de maquetación. `globalContentHeight`
  // es la altura total del área de contenido por debajo de la navegación y el
  // título, INCLUIDOS el pie y el texto de ayuda, para que todas las vistas
  // —preguntas, vistas previas y envío— coincidan.
  const { globalContentHeight, globalContentWidth } = useMemo(() => {
    let maxHeight = 0
    let maxWidth = 0

    // Pie (separador, «Chat about this» y el plan opcional) más el texto de ayuda ≈ 7 líneas
    const FOOTER_HELP_LINES = 7

    // Capar a la altura de la terminal menos lo que consume el marco, pero garantizando al menos MIN_CONTENT_HEIGHT
    const maxAllowedHeight = Math.max(
      MIN_CONTENT_HEIGHT,
      terminalRows - CONTENT_CHROME_OVERHEAD,
    )

    // PREVIEW_OVERHEAD coincide con la constante de `PreviewQuestionView.tsx`
    // — las líneas que consumen, dentro del área de contenido, los elementos
    // que no son la vista previa (márgenes, bordes, notas, pie, texto de
    // ayuda). Aquí se usa para capar el contenido de la vista previa, de modo
    // que `globalContentHeight` refleje la altura *truncada* y no la cruda.
    const PREVIEW_OVERHEAD = 11

    for (const q of questions) {
      const hasPreview = q.options.some(opt => opt.preview)

      if (hasPreview) {
        // Calcular el máximo de líneas de vista previa que de verdad se
        // mostrarían tras el truncado, con la misma lógica que
        // `PreviewQuestionView`.
        const maxPreviewContentLines = Math.max(
          1,
          maxAllowedHeight - PREVIEW_OVERHEAD,
        )

        // En una pregunta con vista previa, el total es la altura del par
        // lado a lado más el pie y la ayuda.
        // Lado a lado = max(panel izquierdo, panel derecho).
        // Panel derecho = caja de vista previa (contenido, bordes e indicador
        // de truncado) más las notas.
        let maxPreviewBoxHeight = 0
        for (const opt of q.options) {
          if (opt.preview) {
            // Medir el markdown ya *renderizado* (la misma transformación que
            // `PreviewBox`), para que el conteo de líneas y los anchos
            // coincidan con lo que de verdad se va a mostrar. `applyMarkdown`
            // quita los delimitadores de bloque de código, la sintaxis de
            // negrita y cursiva, etc.
            const rendered = applyMarkdown(opt.preview, theme, highlight)
            const previewLines = rendered.split('\n')
            const isTruncated = previewLines.length > maxPreviewContentLines
            const displayedLines = isTruncated
              ? maxPreviewContentLines
              : previewLines.length
            // Caja de vista previa: el contenido mostrado, el indicador de truncado y 2 bordes
            maxPreviewBoxHeight = Math.max(
              maxPreviewBoxHeight,
              displayedLines + (isTruncated ? 1 : 0) + 2,
            )
            for (const line of previewLines) {
              maxWidth = Math.max(maxWidth, stringWidth(line))
            }
          }
        }
        // Panel derecho: la caja de vista previa más las notas (2 líneas con margen)
        const rightPanelHeight = maxPreviewBoxHeight + 2
        // Panel izquierdo: las opciones y la descripción
        const leftPanelHeight = q.options.length + 2
        const sideByHeight = Math.max(leftPanelHeight, rightPanelHeight)
        maxHeight = Math.max(maxHeight, sideByHeight + FOOTER_HELP_LINES)
      } else {
        // En una pregunta corriente: las opciones, «Other», el pie y la ayuda
        maxHeight = Math.max(
          maxHeight,
          q.options.length + 3 + FOOTER_HELP_LINES,
        )
      }
    }

    return {
      globalContentHeight: Math.min(
        Math.max(maxHeight, MIN_CONTENT_HEIGHT),
        maxAllowedHeight,
      ),
      globalContentWidth: Math.max(maxWidth, MIN_CONTENT_WIDTH),
    }
  }, [questions, terminalRows, theme, highlight])
  const metadataSource = result.success
    ? result.data.metadata?.source
    : undefined

  const [pastedContentsByQuestion, setPastedContentsByQuestion] = useState<
    Record<string, Record<number, PastedContent>>
  >({})
  const nextPasteIdRef = useRef(0)

  function onImagePaste(
    questionText: string,
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
    setPastedContentsByQuestion(prev => ({
      ...prev,
      [questionText]: { ...(prev[questionText] ?? {}), [pasteId]: newContent },
    }))
  }

  const onRemoveImage = useCallback((questionText: string, id: number) => {
    setPastedContentsByQuestion(prev => {
      const questionContents = { ...(prev[questionText] ?? {}) }
      delete questionContents[id]
      return { ...prev, [questionText]: questionContents }
    })
  }, [])

  const allImageAttachments = Object.values(pastedContentsByQuestion)
    .flatMap(contents => Object.values(contents))
    .filter(c => c.type === 'image')

  const toolPermissionContextMode = useAppState(
    s => s.toolPermissionContext.mode,
  )
  const isInPlanMode = toolPermissionContextMode === 'plan'
  const planFilePath = isInPlanMode ? getPlanFilePath() : undefined

  const state = useMultipleChoiceState()
  const {
    currentQuestionIndex,
    answers,
    questionStates,
    isInTextInput,
    nextQuestion,
    prevQuestion,
    updateQuestionState,
    setAnswer,
    setTextInputMode,
  } = state

  const currentQuestion =
    currentQuestionIndex < (questions?.length || 0)
      ? questions?.[currentQuestionIndex]
      : null

  const isInSubmitView = currentQuestionIndex === (questions?.length || 0)
  const allQuestionsAnswered =
    questions?.every((q: Question) => q?.question && !!answers[q.question]) ??
    false

  // Ocultar la pestaña de envío cuando hay una sola pregunta y es de selección única (el caso de auto-envío)
  const hideSubmitTab = questions.length === 1 && !questions[0]?.multiSelect

  const handleCancel = useCallback(() => {
    // Registrar el rechazo con la procedencia de la metadata, si la hay
    if (metadataSource) {
      logEvent('tengu_ask_user_question_rejected', {
        source:
          metadataSource as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        questionCount: questions.length,
        isInPlanMode,
        interviewPhaseEnabled:
          isInPlanMode && isPlanModeInterviewPhaseEnabled(),
      })
    }
    onDone()
    onReject()
    toolUseConfirm.onReject()
  }, [
    onDone,
    onReject,
    toolUseConfirm,
    metadataSource,
    questions.length,
    isInPlanMode,
  ])

  const handleRespondToClaude = useCallback(async () => {
    const questionsWithAnswers = questions
      .map((q: Question) => {
        const answer = answers[q.question]
        if (answer) {
          return `- "${q.question}"\n  Answer: ${answer}`
        }
        return `- "${q.question}"\n  (No answer provided)`
      })
      .join('\n')

    const feedback = `The user wants to clarify these questions.
    This means they may have additional information, context or questions for you.
    Take their response into account and then reformulate the questions if appropriate.
    Start by asking them what they would like to clarify.

    Questions asked:\n${questionsWithAnswers}`

    if (metadataSource) {
      logEvent('tengu_ask_user_question_respond_to_claude', {
        source:
          metadataSource as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        questionCount: questions.length,
        isInPlanMode,
        interviewPhaseEnabled:
          isInPlanMode && isPlanModeInterviewPhaseEnabled(),
      })
    }

    const imageBlocks = await convertImagesToBlocks(allImageAttachments)

    onDone()
    toolUseConfirm.onReject(
      feedback,
      imageBlocks && imageBlocks.length > 0 ? imageBlocks : undefined,
    )
  }, [
    questions,
    answers,
    onDone,
    toolUseConfirm,
    metadataSource,
    isInPlanMode,
    allImageAttachments,
  ])

  const handleFinishPlanInterview = useCallback(async () => {
    const questionsWithAnswers = questions
      .map((q: Question) => {
        const answer = answers[q.question]
        if (answer) {
          return `- "${q.question}"\n  Answer: ${answer}`
        }
        return `- "${q.question}"\n  (No answer provided)`
      })
      .join('\n')

    const feedback = `The user has indicated they have provided enough answers for the plan interview.
Stop asking clarifying questions and proceed to finish the plan with the information you have.

Questions asked and answers provided:\n${questionsWithAnswers}`

    if (metadataSource) {
      logEvent('tengu_ask_user_question_finish_plan_interview', {
        source:
          metadataSource as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        questionCount: questions.length,
        isInPlanMode,
        interviewPhaseEnabled:
          isInPlanMode && isPlanModeInterviewPhaseEnabled(),
      })
    }

    const imageBlocks = await convertImagesToBlocks(allImageAttachments)

    onDone()
    toolUseConfirm.onReject(
      feedback,
      imageBlocks && imageBlocks.length > 0 ? imageBlocks : undefined,
    )
  }, [
    questions,
    answers,
    onDone,
    toolUseConfirm,
    metadataSource,
    isInPlanMode,
    allImageAttachments,
  ])

  const submitAnswers = useCallback(
    async (answersToSubmit: Record<string, string>) => {
      // Registrar la aceptación con la procedencia de la metadata, si la hay
      if (metadataSource) {
        logEvent('tengu_ask_user_question_accepted', {
          source:
            metadataSource as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          questionCount: questions.length,
          answerCount: Object.keys(answersToSubmit).length,
          isInPlanMode,
          interviewPhaseEnabled:
            isInPlanMode && isPlanModeInterviewPhaseEnabled(),
        })
      }
      // Construir las anotaciones desde `questionStates` (la vista previa elegida, las notas del usuario)
      const annotations: Record<string, { preview?: string; notes?: string }> =
        {}
      for (const q of questions) {
        const answer = answersToSubmit[q.question]
        const notes = questionStates[q.question]?.textInputValue
        // Localizar el contenido de vista previa de la opción elegida
        const selectedOption = answer
          ? q.options.find(opt => opt.label === answer)
          : undefined
        const preview = selectedOption?.preview
        if (preview || notes?.trim()) {
          annotations[q.question] = {
            ...(preview && { preview }),
            ...(notes?.trim() && { notes: notes.trim() }),
          }
        }
      }

      const updatedInput = {
        ...toolUseConfirm.input,
        answers: answersToSubmit,
        ...(Object.keys(annotations).length > 0 && { annotations }),
      }

      const contentBlocks = await convertImagesToBlocks(allImageAttachments)

      onDone()
      toolUseConfirm.onAllow(
        updatedInput,
        [],
        undefined,
        contentBlocks && contentBlocks.length > 0 ? contentBlocks : undefined,
      )
    },
    [
      toolUseConfirm,
      onDone,
      metadataSource,
      questions,
      questionStates,
      isInPlanMode,
      allImageAttachments,
    ],
  )
  const remainingAutoContinueSeconds = useQuestionAutoContinue(
    getQuestionTimeoutMs(getInitialSettings().askUserQuestionTimeout),
    () => void submitAnswers(answers).catch(logError),
  )
  const autoContinueHint = remainingAutoContinueSeconds === null ? null : (
    <Text dimColor>
      auto-continue in {remainingAutoContinueSeconds}s · any key to stay
    </Text>
  )

  const handleQuestionAnswer = useCallback(
    (
      questionText: string,
      label: string | string[],
      textInput?: string,
      shouldAdvance: boolean = true,
    ) => {
      let answer: string
      const isMultiSelect = Array.isArray(label)
      if (isMultiSelect) {
        answer = label.join(', ')
      } else {
        if (textInput) {
          const questionImages = Object.values(
            pastedContentsByQuestion[questionText] ?? {},
          ).filter(c => c.type === 'image')
          answer =
            questionImages.length > 0
              ? `${textInput} (Image attached)`
              : textInput
        } else if (label === '__other__') {
          // Envío sólo de imágenes: comprobar si esta pregunta las tiene
          const questionImages = Object.values(
            pastedContentsByQuestion[questionText] ?? {},
          ).filter(c => c.type === 'image')
          answer = questionImages.length > 0 ? '(Image attached)' : label
        } else {
          answer = label
        }
      }

      // Con selección única y una sola pregunta, auto-enviar en vez de mostrar la pantalla de revisión
      const isSingleQuestion = questions.length === 1
      if (!isMultiSelect && isSingleQuestion && shouldAdvance) {
        const updatedAnswers = {
          ...answers,
          [questionText]: answer,
        }
        void submitAnswers(updatedAnswers).catch(logError)
        return
      }

      setAnswer(questionText, answer, shouldAdvance)
    },
    [
      setAnswer,
      questions.length,
      answers,
      submitAnswers,
      pastedContentsByQuestion,
    ],
  )

  function handleFinalResponse(value: 'submit' | 'cancel'): void {
    if (value === 'cancel') {
      handleCancel()
      return
    }

    if (value === 'submit') {
      void submitAnswers(answers).catch(logError)
    }
  }

  // Con la pestaña de envío oculta, no permitir navegar más allá de la última pregunta
  const maxIndex = hideSubmitTab
    ? (questions?.length || 1) - 1
    : questions?.length || 0

  // Callbacks de navegación acotada para las pestañas de pregunta
  const handleTabPrev = useCallback(() => {
    if (currentQuestionIndex > 0) {
      prevQuestion()
    }
  }, [currentQuestionIndex, prevQuestion])

  const handleTabNext = useCallback(() => {
    if (currentQuestionIndex < maxIndex) {
      nextQuestion()
    }
  }, [currentQuestionIndex, maxIndex, nextQuestion])

  // Usar el sistema de atajos para navegar entre preguntas (flechas
  // izquierda y derecha, tab y shift+tab). Un `useInput` pelado no sirve
  // porque el sistema de atajos resuelve las flechas a `tabs:next` y
  // `tabs:previous` y puede llamar a `stopImmediatePropagation` antes de que
  // `useInput` se dispare. Los componentes hijos (`PreviewQuestionView`, por
  // ejemplo) también registran sus propios atajos `tabs:next`/`tabs:previous`
  // para que el manejo sea fiable sea cual sea el orden de los listeners.
  useKeybindings(
    {
      'tabs:previous': handleTabPrev,
      'tabs:next': handleTabNext,
    },
    { context: 'Tabs', isActive: !(isInTextInput && !isInSubmitView) },
  )

  if (currentQuestion) {
    return (
      <>
        <QuestionView
          question={currentQuestion}
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          questionStates={questionStates}
          hideSubmitTab={hideSubmitTab}
          minContentHeight={globalContentHeight}
          minContentWidth={globalContentWidth}
          planFilePath={planFilePath}
          onUpdateQuestionState={updateQuestionState}
          onAnswer={handleQuestionAnswer}
          onTextInputFocus={setTextInputMode}
          onCancel={handleCancel}
          onSubmit={nextQuestion}
          onTabPrev={handleTabPrev}
          onTabNext={handleTabNext}
          onRespondToClaude={handleRespondToClaude}
          onFinishPlanInterview={handleFinishPlanInterview}
          onImagePaste={(base64, mediaType, filename, dims, path) =>
            onImagePaste(
              currentQuestion.question,
              base64,
              mediaType,
              filename,
              dims,
              path,
            )
          }
          pastedContents={
            pastedContentsByQuestion[currentQuestion.question] ?? {}
          }
          onRemoveImage={id => onRemoveImage(currentQuestion.question, id)}
        />
        {autoContinueHint}
      </>
    )
  }

  if (isInSubmitView) {
    return (
      <>
        <SubmitQuestionsView
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          allQuestionsAnswered={allQuestionsAnswered}
          permissionResult={toolUseConfirm.permissionResult}
          minContentHeight={globalContentHeight}
          onFinalResponse={handleFinalResponse}
        />
        {autoContinueHint}
      </>
    )
  }

  // Esto no debería alcanzarse nunca
  return null
}

function getQuestionTimeoutMs(value: AskUserQuestionTimeout | undefined): number {
  if (value === '60s') return 60_000
  if (value === '5m') return 300_000
  if (value === '10m') return 600_000
  return 0
}

type AskUserQuestionTimeout = '60s' | '5m' | '10m' | 'never'

async function convertImagesToBlocks(
  images: PastedContent[],
): Promise<ImageBlockParam[] | undefined> {
  if (images.length === 0) return undefined
  return Promise.all(
    images.map(async img => {
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
