// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/sanitization.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 3 · líneas de código: 48
// Mencionado en: part5/ch17b.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch17b.md · líneas 8-12 ───
// The vulnerability was demonstrated in HackerOne report #3086545 targeting
// Claude Desktop's MCP implementation, where attackers could inject hidden
// instructions using Unicode Tag characters that would be executed by Claude
// but remain invisible to users.

// ─── ausente: líneas 13-24 (12 líneas sin fragmento en el corpus) ───

// ─── part5/ch17b.md · líneas 25-65 ───
export function partiallySanitizeUnicode(prompt: string): string {
  let current = prompt
  let previous = ''
  let iterations = 0
  const MAX_ITERATIONS = 10

  while (current !== previous && iterations < MAX_ITERATIONS) {
    previous = current

    // Layer 1: NFKC normalization
    current = current.normalize('NFKC')

    // Layer 2: Unicode property class removal
    current = current.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')

    // Layer 3: Explicit character ranges (fallback for environments without \p{} support)
    current = current
      .replace(/[\u200B-\u200F]/g, '')  // Zero-width spaces, LTR/RTL marks
      .replace(/[\u202A-\u202E]/g, '')  // Directional formatting characters
      .replace(/[\u2066-\u2069]/g, '')  // Directional isolates
      .replace(/[\uFEFF]/g, '')          // Byte order mark
      .replace(/[\uE000-\uF8FF]/g, '')  // BMP Private Use Area

    iterations++
  }
  // ...
}

// ─── ausente: líneas 66-66 (1 líneas sin fragmento en el corpus) ───

// ─── part5/ch17b.md · líneas 67-91 ───
export function recursivelySanitizeUnicode(value: unknown): unknown {
  if (typeof value === 'string') {
    return partiallySanitizeUnicode(value)
  }
  if (Array.isArray(value)) {
    return value.map(recursivelySanitizeUnicode)
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      sanitized[recursivelySanitizeUnicode(key)] =
        recursivelySanitizeUnicode(val)
    }
    return sanitized
  }
  return value
}
