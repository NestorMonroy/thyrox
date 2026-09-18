import { relative } from 'path'
import React, { useMemo } from 'react'
import { useDiffInIDE } from '@thyrox/ide/hooks/useDiffInIDE.js'
import { Box, Text } from '@anthropic/ink'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import { getLanguageName } from '@thyrox/output/utils/cliHighlight.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import {
  getFsImplementation,
  safeResolvePath,
} from '@thyrox/storage/fsOperations.js'
import { expandPath } from '@thyrox/storage/path.js'
import type { CompletionType } from '@thyrox/local-observability/logging'
import { Select } from '@thyrox/repl/components/CustomSelect/index.js'
import { ShowInIDEPrompt } from '@thyrox/repl/components/ShowInIDEPrompt.js'
import { usePermissionRequestLogging } from '../hooks.js'
import { PermissionDialog } from '../PermissionDialog.js'
import type { ToolUseConfirm } from '../PermissionRequest.js'
import type { WorkerBadgeProps } from '../WorkerBadge.js'
import type { IDEDiffSupport } from './ideDiffConfig.js'
import type {
  FileOperationType,
  PermissionOption,
} from './permissionOptions.js'
import {
  type ToolInput,
  useFilePermissionDialog,
} from './useFilePermissionDialog.js'

type FilePermissionDialogProps<T extends ToolInput = ToolInput> = {
  // Copia de `ccnmt: packages/permission/src/components/FilePermissionDialog/FilePermissionDialog.tsx`
  // con los comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Props obligatorias que vienen de `PermissionRequestProps`
  toolUseConfirm: ToolUseConfirm
  toolUseContext: ToolUseContext
  onDone: () => void
  onReject: () => void

  // Personalización del diálogo
  title: string
  subtitle?: React.ReactNode
  question?: string | React.ReactNode
  content?: React.ReactNode // Puede ser contenido general o un componente de diff

  // Registro
  completionType?: CompletionType
  languageName?: string // sobrescritura — si se omite, se deriva de la ruta

  // Operaciones de archivo y de directorio
  path: string | null
  parseInput: (input: unknown) => T
  operationType?: FileOperationType

  // Soporte de diff en el IDE
  ideDiffSupport?: IDEDiffSupport<T>

  // Insignia de trabajador para las peticiones de permiso de un compañero
  workerBadge: WorkerBadgeProps | undefined
}

export function FilePermissionDialog<T extends ToolInput = ToolInput>({
  toolUseConfirm,
  toolUseContext,
  onDone,
  onReject,
  title,
  subtitle,
  question = 'Do you want to proceed?',
  content,
  completionType = 'tool_use_single',
  path,
  parseInput,
  operationType = 'write',
  ideDiffSupport,
  workerBadge,
  languageName: languageNameOverride,
}: FilePermissionDialogProps<T>): React.ReactNode {
  // Derivar de la ruta, salvo que quien llama pase una sobrescritura
  // explícita (`NotebookEdit` pasa 'python' o 'markdown' según `cell_type`).
  // `getLanguageName` es asíncrona; aguas abajo, `UnaryEvent.language_name` y
  // `logPermissionEvent` ya aceptan `Promise<string>`. El `useMemo` mantiene
  // la promesa estable entre renders.
  const languageName = useMemo(
    () => languageNameOverride ?? (path ? getLanguageName(path) : 'none'),
    [languageNameOverride, path],
  )
  const unaryEvent = useMemo(
    () => ({
      completion_type: completionType,
      language_name: languageName,
    }),
    [completionType, languageName],
  )
  usePermissionRequestLogging(toolUseConfirm, unaryEvent)

  const symlinkTarget = useMemo(() => {
    if (!path || operationType === 'read') {
      return null
    }
    const expandedPath = expandPath(path)
    const fs = getFsImplementation()
    const { resolvedPath, isSymlink } = safeResolvePath(fs, expandedPath)
    if (isSymlink) {
      return resolvedPath
    }
    return null
  }, [path, operationType])

  const fileDialogResult = useFilePermissionDialog({
    filePath: path || '',
    completionType,
    languageName,
    toolUseConfirm,
    onDone,
    onReject,
    parseInput,
    operationType,
  })

  // Usar los resultados del diálogo de archivo para las opciones
  const {
    options,
    acceptFeedback,
    rejectFeedback,
    setFocusedOption,
    handleInputModeToggle,
    focusedOption,
    yesInputMode,
    noInputMode,
  } = fileDialogResult

  // Parsear la entrada con el parser que se pase
  const parsedInput = parseInput(toolUseConfirm.input)

  // Montar el soporte de diff en el IDE si está habilitado. Memoizado:
  // `getConfig` puede hacer entrada/salida de disco (el `getConfig` de
  // `FileWrite` llama a `readFileSync` para el diff del contenido antiguo). La
  // clave es la entrada en crudo — `parseInput` es un parseo Zod puro cuyo
  // resultado sólo depende de `toolUseConfirm.input`.
  const ideDiffConfig = useMemo(
    () =>
      ideDiffSupport
        ? ideDiffSupport.getConfig(parseInput(toolUseConfirm.input))
        : null,
    [ideDiffSupport, toolUseConfirm.input],
  )

  // Crear los parámetros del diff según si el diff del IDE está disponible
  const diffParams = ideDiffConfig
    ? {
        onChange: (
          option: PermissionOption,
          input: {
            file_path: string
            edits: Array<{
              old_string: string
              new_string: string
              replace_all?: boolean
            }>
          },
        ) => {
          const transformedInput = ideDiffSupport!.applyChanges(
            parsedInput,
            input.edits,
          )
          fileDialogResult.onChange(option, transformedInput)
        },
        toolUseContext,
        filePath: ideDiffConfig.filePath,
        edits: (ideDiffConfig.edits || []).map(e => ({
          old_string: e.old_string,
          new_string: e.new_string,
          replace_all: e.replace_all || false,
        })),
        editMode: ideDiffConfig.editMode || 'single',
      }
    : {
        onChange: () => {},
        toolUseContext,
        filePath: '',
        edits: [],
        editMode: 'single' as const,
      }

  const { closeTabInIDE, showingDiffInIDE, ideName } = useDiffInIDE(diffParams)

  const onChange = (option: PermissionOption, feedback?: string) => {
    closeTabInIDE?.()
    fileDialogResult.onChange(option, parsedInput, feedback?.trim())
  }

  if (showingDiffInIDE && ideDiffConfig && path) {
    return (
      <ShowInIDEPrompt
        onChange={(option: PermissionOption, _input, feedback?: string) =>
          onChange(option, feedback)
        }
        options={options}
        filePath={path}
        input={parsedInput}
        ideName={ideName}
        symlinkTarget={symlinkTarget}
        rejectFeedback={rejectFeedback}
        acceptFeedback={acceptFeedback}
        setFocusedOption={setFocusedOption}
        onInputModeToggle={handleInputModeToggle}
        focusedOption={focusedOption}
        yesInputMode={yesInputMode}
        noInputMode={noInputMode}
      />
    )
  }

  const isSymlinkOutsideCwd =
    symlinkTarget != null && relative(getCwd(), symlinkTarget).startsWith('..')

  const symlinkWarning = symlinkTarget ? (
    <Box paddingX={1} marginBottom={1}>
      <Text color="warning">
        {isSymlinkOutsideCwd
          ? `This will modify ${symlinkTarget} (outside working directory) via a symlink`
          : `Symlink target: ${symlinkTarget}`}
      </Text>
    </Box>
  ) : null

  return (
    <>
      <PermissionDialog
        title={title}
        subtitle={subtitle}
        innerPaddingX={0}
        workerBadge={workerBadge}
      >
        {symlinkWarning}
        {content}
        <Box flexDirection="column" paddingX={1}>
          {typeof question === 'string' ? <Text>{question}</Text> : question}
          <Select
            options={options}
            inlineDescriptions
            onChange={value => {
              const selected = options.find(opt => opt.value === value)
              if (selected) {
                // Para la opción de rechazo
                if (selected.option.type === 'reject') {
                  const trimmedFeedback = rejectFeedback.trim()
                  onChange(selected.option, trimmedFeedback || undefined)
                  return
                }
                // Para la opción de aceptar una vez, pasar el comentario de aceptación si lo hay
                if (selected.option.type === 'accept-once') {
                  const trimmedFeedback = acceptFeedback.trim()
                  onChange(selected.option, trimmedFeedback || undefined)
                  return
                }
                onChange(selected.option)
              }
            }}
            onCancel={() => onChange({ type: 'reject' })}
            onFocus={value => setFocusedOption(value)}
            onInputModeToggle={handleInputModeToggle}
          />
        </Box>
      </PermissionDialog>
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          Esc to cancel
          {((focusedOption === 'yes' && !yesInputMode) ||
            (focusedOption === 'no' && !noInputMode)) &&
            ' · Tab to amend'}
        </Text>
      </Box>
    </>
  )
}
