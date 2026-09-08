/**
 * Puerto de `ccnmt: packages/tool-registry/src/notebookTypes.ts` (8 líneas,
 * 7 símbolos). Los tipos del cuaderno que `NotebookEditTool` consume.
 *
 * DIVERGENCIA DECLARADA — ninguna, y es lo que hay que decir: la fuente los
 * declara `unknown` a propósito, con el comentario `Decompiled
 * placeholders`. Refinarlos aquí sería inventar una forma que la fuente no
 * fija, y el consumidor que hoy los usa estructuralmente empezaría a fallar
 * contra un contrato que nadie escribió. Se portan tal cual y se estrechan
 * el día que el consumidor real llegue con su forma medida.
 */
export type NotebookCell = unknown
export type NotebookContent = unknown
export type NotebookCellOutput = unknown
export type NotebookCellSource = unknown
export type NotebookCellSourceOutput = unknown
export type NotebookOutputImage = unknown
export type NotebookCellType = unknown
