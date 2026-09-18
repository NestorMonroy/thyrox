import { basename, relative } from 'path'
import React, { Suspense, use, useMemo } from 'react'
import { FileEditToolDiff } from '@thyrox/repl/components/FileEditToolDiff.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { detectEncodingForResolvedPath } from '@thyrox/storage/fileRead.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { Text } from '@anthropic/ink'
import { BashTool } from '@thyrox/tool-registry/tools/BashTool/BashTool.js'
import {
  applySedSubstitution,
  type SedEditInfo,
} from '@thyrox/tool-registry/tools/BashTool/sedEditParser.js'
import { FilePermissionDialog } from '../FilePermissionDialog/FilePermissionDialog.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'

type SedEditPermissionRequestProps = PermissionRequestProps & {
  sedInfo: SedEditInfo
}

type FileReadResult = { oldContent: string; fileExists: boolean }

export function SedEditPermissionRequest({
  sedInfo,
  ...props
}: SedEditPermissionRequestProps): React.ReactNode {
  const { filePath } = sedInfo

  // Copia de `ccnmt: packages/permission/src/components/
  // SedEditPermissionRequest/SedEditPermissionRequest.tsx` con los comentarios
  // traducidos; el cuerpo es el de la fuente.
  //
  // El contenido del archivo se lee de forma asíncrona para que el montaje no
  // bloquee el commit de React con I/O de disco. Un archivo grande colgaría el
  // diálogo antes de renderizarlo. Memoizado sobre filePath, para no releer en
  // cada render.
  const contentPromise = useMemo(
    () =>
      (async (): Promise<FileReadResult> => {
        // Primero se detecta el encoding (lectura síncrona de 4KB,
        // despreciable) para que un BOM UTF-16LE renderice correctamente. Es lo
        // mismo que hacia readFileSync antes de la conversión a asíncrono.
        const encoding = detectEncodingForResolvedPath(filePath)
        const raw = await getFsImplementation().readFile(filePath, { encoding })
        return {
          oldContent: raw.replaceAll('\r\n', '\n'),
          fileExists: true,
        }
      })().catch((e: unknown): FileReadResult => {
        if (!isENOENT(e)) throw e
        return { oldContent: '', fileExists: false }
      }),
    [filePath],
  )

  return (
    <Suspense fallback={null}>
      <SedEditPermissionRequestInner
        sedInfo={sedInfo}
        contentPromise={contentPromise}
        {...props}
      />
    </Suspense>
  )
}

function SedEditPermissionRequestInner({
  sedInfo,
  contentPromise,
  ...props
}: SedEditPermissionRequestProps & {
  contentPromise: Promise<FileReadResult>
}): React.ReactNode {
  const { filePath } = sedInfo
  const { oldContent, fileExists } = use(contentPromise)

  // Calcula el contenido nuevo aplicando la sustitución de sed.
  const newContent = useMemo(() => {
    return applySedSubstitution(oldContent, sedInfo)
  }, [oldContent, sedInfo])

  // Construye la representación de la edición para el diff.
  const edits = useMemo(() => {
    if (oldContent === newContent) {
      return []
    }
    return [
      {
        old_string: oldContent,
        new_string: newContent,
        replace_all: false,
      },
    ]
  }, [oldContent, newContent])

  // Determina el mensaje adecuado cuando no hay cambios.
  const noChangesMessage = useMemo(() => {
    if (!fileExists) {
      return 'File does not exist'
    }
    return 'Pattern did not match any content'
  }, [fileExists])

  // Parsea el input y añade _simulatedSedEdit para garantizar que lo que el
  // usuario previsualizo es exactamente lo que se escribe; así no pesan las
  // diferencias entre el regex de sed y el de JS.
  const parseInput = (input: unknown) => {
    const parsed = BashTool.inputSchema.parse(input)
    return {
      ...parsed,
      _simulatedSedEdit: {
        filePath,
        newContent,
      },
    }
  }

  return (
    <FilePermissionDialog
      toolUseConfirm={props.toolUseConfirm}
      toolUseContext={props.toolUseContext}
      onDone={props.onDone}
      onReject={props.onReject}
      title="Edit file"
      subtitle={relative(getCwd(), filePath)}
      question={
        <Text>
          Do you want to make this edit to{' '}
          <Text bold>{basename(filePath)}</Text>?
        </Text>
      }
      content={
        edits.length > 0 ? (
          <FileEditToolDiff file_path={filePath} edits={edits} />
        ) : (
          <Text dimColor>{noChangesMessage}</Text>
        )
      }
      path={filePath}
      completionType="str_replace_single"
      parseInput={parseInput}
      workerBadge={props.workerBadge}
    />
  )
}
