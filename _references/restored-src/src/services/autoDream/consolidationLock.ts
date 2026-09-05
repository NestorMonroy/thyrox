// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/autoDream/consolidationLock.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 13
// Mencionado en: part6/ch24.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch24.md · líneas 16-19 ───
const LOCK_FILE = '.consolidate-lock'
const HOLDER_STALE_MS = 60 * 60 * 1000  // 1 hour

// ─── ausente: líneas 20-45 (26 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 46-84 ───
export async function tryAcquireConsolidationLock(): Promise<number | null> {
  // ... stat + readFile ...
  await writeFile(path, String(process.pid))
  // Double check: two reclaimers both write → the later writer wins the PID
  let verify: string
  try {
    verify = await readFile(path, 'utf8')
  } catch { return null }
  if (parseInt(verify.trim(), 10) !== process.pid) return null
  return mtimeMs ?? 0
}
