/**
 * Porte fiel de `ccnmt: packages/shell/src/sandboxUiUtils.ts`.
 *
 * Utilidades de UI para violaciones de sandbox. Se usa para mostrar
 * información relativa al sandbox en la interfaz.
 *
 * Porte COMPLETO: el único símbolo exportado de la fuente está
 * presente.
 *
 * @module
 */
export function removeSandboxViolationTags(text: string): string {
  return text.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g, '')
}
