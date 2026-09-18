import { relative } from 'path'
import * as React from 'react'
import { Suspense, use, useMemo } from 'react'
import { Box, NoSelect, Text } from '@anthropic/ink'
import type {
  NotebookCellType,
  NotebookContent,
} from '@claude-code-how-works/tool-registry/notebookTypes'
import { intersperse } from '@claude-code-how-works/tool-registry/utils/array.js'
import { getCwd } from '@claude-code-how-works/app-host/bootstrap/cwd.js'
import { getPatchForDisplay } from '@claude-code-how-works/agent/diff.js'
import { getFsImplementation } from '@claude-code-how-works/storage/fsOperations.js'
import { safeParseJSON } from '@claude-code-how-works/storage/json.js'
import { parseCellId } from '@claude-code-how-works/tool-registry/notebook.js'
import { HighlightedCode } from '@claude-code-how-works/repl/components/HighlightedCode.js'
import { StructuredDiff } from '@claude-code-how-works/repl/components/StructuredDiff.js'

type Props = {
  notebook_path: string
  cell_id: string | undefined
  new_source: string
  cell_type?: NotebookCellType
  edit_mode?: string
  verbose: boolean
  width: number
}

type InnerProps = {
  notebook_path: string
  cell_id: string | undefined
  new_source: string
  cell_type?: NotebookCellType
  edit_mode?: string
  verbose: boolean
  width: number
  promise: Promise<NotebookContent | null>
}

export function NotebookEditToolDiff(props: Props): React.ReactNode {
  // Copia de `ccnmt: packages/permission/src/components/
  // NotebookEditPermissionRequest/NotebookEditToolDiff.tsx` con los comentarios
  // traducidos; el cuerpo es el de la fuente.
  //
  // Se construye una promesa que nunca rechaza, para resolver los errores en
  // línea. Memoizada sobre notebook_path, para no releer en cada render.
  const notebookDataPromise = useMemo(
    () =>
      getFsImplementation()
        .readFile(props.notebook_path, { encoding: 'utf-8' })
        .then(content => safeParseJSON(content) as NotebookContent | null)
        .catch(() => null),
    [props.notebook_path],
  )

  return (
    <Suspense fallback={null}>
      <NotebookEditToolDiffInner {...props} promise={notebookDataPromise} />
    </Suspense>
  )
}

function NotebookEditToolDiffInner({
  notebook_path,
  cell_id,
  new_source,
  cell_type,
  edit_mode = 'replace',
  verbose,
  width,
  promise,
}: InnerProps): React.ReactNode {
  const notebookData = use(promise)

  const oldSource = useMemo(() => {
    if (!notebookData || !cell_id) {
      return ''
    }
    const cellIndex = parseCellId(cell_id)
    if (cellIndex !== undefined) {
      if (notebookData.cells[cellIndex]) {
        const source = notebookData.cells[cellIndex].source
        return Array.isArray(source) ? source.join('') : source
      }
      return ''
    }
    const cell = notebookData.cells.find(cell => cell.id === cell_id)
    if (!cell) {
      return ''
    }
    return Array.isArray(cell.source) ? cell.source.join('') : cell.source
  }, [notebookData, cell_id])

  const hunks = useMemo(() => {
    if (!notebookData || edit_mode === 'insert' || edit_mode === 'delete') {
      return null
    }
    // Se construye un contenido de archivo "falso" solo con el fuente de la
    // celda. Así se puede usar el mecanismo de diff normal.
    return getPatchForDisplay({
      filePath: notebook_path,
      fileContents: oldSource,
      edits: [
        {
          old_string: oldSource,
          new_string: new_source,
          replace_all: false,
        },
      ],
      ignoreWhitespace: false,
    })
  }, [notebookData, notebook_path, oldSource, new_source, edit_mode])

  let editTypeDescription: string
  switch (edit_mode) {
    case 'insert':
      editTypeDescription = 'Insert new cell'
      break
    case 'delete':
      editTypeDescription = 'Delete cell'
      break
    default:
      editTypeDescription = 'Replace cell contents'
  }

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Box paddingBottom={1} flexDirection="column">
          <Text bold>
            {verbose ? notebook_path : relative(getCwd(), notebook_path)}
          </Text>
          <Text dimColor>
            {editTypeDescription} for cell {cell_id}
            {cell_type ? ` (${cell_type})` : ''}
          </Text>
        </Box>
        {edit_mode === 'delete' ? (
          <Box flexDirection="column" paddingLeft={2}>
            <HighlightedCode code={oldSource} filePath={notebook_path} />
          </Box>
        ) : edit_mode === 'insert' ? (
          <Box flexDirection="column" paddingLeft={2}>
            <HighlightedCode
              code={new_source}
              filePath={cell_type === 'markdown' ? 'file.md' : notebook_path}
            />
          </Box>
        ) : hunks ? (
          intersperse(
            hunks.map(_ => (
              <StructuredDiff
                key={_.newStart}
                patch={_}
                dim={false}
                width={width}
                filePath={notebook_path}
                firstLine={new_source.split('\n')[0] ?? null}
                fileContent={oldSource}
              />
            )),
            i => (
              <NoSelect fromLeftEdge key={`ellipsis-${i}`}>
                <Text dimColor>...</Text>
              </NoSelect>
            ),
          )
        ) : (
          <HighlightedCode
            code={new_source}
            filePath={cell_type === 'markdown' ? 'file.md' : notebook_path}
          />
        )}
      </Box>
    </Box>
  )
}
