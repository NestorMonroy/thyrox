/**
 * Puerto de `ccnmt: packages/tool-registry/src/notebookTypes.ts` (8 líneas,
 * 7 símbolos). Los tipos del cuaderno que `notebook.ts`, `NotebookEditTool`
 * y el diff de permisos consumen.
 *
 * DIVERGENCIA DECLARADA: la fuente los declara `unknown` con el comentario
 * `Decompiled placeholders` — el decompilado perdió los tipos, no los
 * decidió. La forma no se inventa: es la del formato público de Jupyter,
 * nbformat v4 (celdas `code`/`markdown`/`raw`, salidas `stream`,
 * `execute_result`, `display_data` y `error`), recortada a los campos que
 * los consumidores de este árbol leen o escriben. `NotebookCellSource*` y
 * `NotebookOutputImage` son la forma ya procesada que `notebook.ts` produce.
 */
export type NotebookCellType = 'code' | 'markdown' | 'raw'

export type NotebookOutputImage = {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

type MimeBundle = { 'text/plain'?: string | string[]; [mime: string]: unknown }

export type NotebookCellOutput =
  | { output_type: 'stream'; name?: string; text?: string | string[] }
  | {
      output_type: 'execute_result' | 'display_data'
      data?: MimeBundle
      metadata?: Record<string, unknown>
      execution_count?: number | null
    }
  | { output_type: 'error'; ename: string; evalue: string; traceback: string[] }

export type NotebookCell = {
  id?: string
  cell_type: NotebookCellType
  source: string | string[]
  metadata: Record<string, unknown>
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
}

export type NotebookContent = {
  cells: NotebookCell[]
  metadata: { language_info?: { name?: string }; [key: string]: unknown }
  nbformat: number
  nbformat_minor: number
}

export type NotebookCellSourceOutput = {
  output_type: string
  text?: string
  image?: NotebookOutputImage
}

export type NotebookCellSource = {
  cellType: NotebookCellType
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}
