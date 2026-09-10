// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/tokenEstimation.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 16
// ══════════════════════════════════════════════════════════════════

// ─── part3/ch12.md · líneas 203-208 ───
export function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  return Math.round(content.length / bytesPerToken)
}

// ─── ausente: líneas 209-214 (6 líneas sin fragmento en el corpus) ───

// ─── part3/ch12.md · líneas 215-224 ───
export function bytesPerTokenForFileType(fileExtension: string): number {
  switch (fileExtension) {
    case 'json':
    case 'jsonl':
    case 'jsonc':
      return 2
    default:
      return 4
  }
}
