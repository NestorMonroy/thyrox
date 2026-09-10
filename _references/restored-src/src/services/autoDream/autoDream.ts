// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/autoDream/autoDream.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 5 · líneas de código: 33
// Mencionado en: part6/ch24.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch24.md · líneas 95-100 ───
function isGateOpen(): boolean {
  if (getKairosActive()) return false  // KAIROS mode uses disk-skill dream
  if (getIsRemoteMode()) return false
  if (!isAutoMemoryEnabled()) return false
  return isAutoDreamEnabled()
}

// ─── ausente: líneas 101-130 (30 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 131-141 ───
let lastAt: number
try {
  lastAt = await readLastConsolidatedAt()
} catch { ... }
const hoursSince = (Date.now() - lastAt) / 3_600_000
if (!force && hoursSince < cfg.minHours) return

// ─── ausente: líneas 142-152 (11 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 153-171 ───
let sessionIds: string[]
try {
  sessionIds = await listSessionsTouchedSince(lastAt)
} catch { ... }
const currentSession = getSessionId()
sessionIds = sessionIds.filter(id => id !== currentSession)
if (!force && sessionIds.length < cfg.minSessions) return

// ─── ausente: líneas 172-215 (44 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 216-221 ───
const extra = `
**Tool constraints for this run:** Bash is restricted to read-only commands...
Sessions since last consolidation (${sessionIds.length}):
${sessionIds.map(id => `- ${id}`).join('\n')}`

// ─── ausente: líneas 222-223 (2 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 224-233 ───
const result = await runForkedAgent({
  promptMessages: [createUserMessage({ content: prompt })],
  cacheSafeParams: createCacheSafeParams(context),
  canUseTool: createAutoMemCanUseTool(memoryRoot),
  querySource: 'auto_dream',
  forkLabel: 'auto_dream',
  skipTranscript: true,
  overrides: { abortController },
  onMessage: makeDreamProgressWatcher(taskId, setAppState),
})
