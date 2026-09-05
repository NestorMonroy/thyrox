// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/xml.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 8
// Mencionado en: part5/ch17b.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch17b.md · líneas 1-16 ───
// Use when untrusted strings go inside <tag>${here}</tag>.
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeXmlAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
