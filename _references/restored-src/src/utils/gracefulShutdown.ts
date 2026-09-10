// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/gracefulShutdown.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 3 · líneas de código: 28
// Mencionado en: part7/ch29.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch29.md · líneas 213-222 ───
try {
  process.exit(exitCode)
} catch (e) {
  if ((process.env.NODE_ENV as string) === 'test') {
    throw e
  }
  process.kill(process.pid, 'SIGKILL')
}

// ─── ausente: líneas 223-280 (58 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 281-296 ───
if (process.stdin.isTTY) {
  orphanCheckInterval = setInterval(() => {
    if (getIsScrollDraining()) return
    if (!process.stdout.writable || !process.stdin.readable) {
      clearInterval(orphanCheckInterval)
      void gracefulShutdown(129)
    }
  }, 30_000)
  orphanCheckInterval.unref()
}

// ─── ausente: líneas 297-300 (4 líneas sin fragmento en el corpus) ───

// ─── part7/ch29.md · líneas 301-310 ───
process.on('uncaughtException', error => {
  logForDiagnosticsNoPII('error', 'uncaught_exception', {
    error_name: error.name,
    error_message: error.message.slice(0, 2000),
  })
  logEvent('tengu_uncaught_exception', {
    error_name:
      error.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
})
