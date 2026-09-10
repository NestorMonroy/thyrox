// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/plans.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 45
// Mencionado en: part1/ch04b.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch04b.md · líneas 32-49 ───
export function getPlanSlug(sessionId?: SessionId): string {
  const id = sessionId ?? getSessionId()
  const cache = getPlanSlugCache()
  let slug = cache.get(id)
  if (!slug) {
    const plansDir = getPlansDirectory()
    for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
      slug = generateWordSlug()
      const filePath = join(plansDir, `${slug}.md`)
      if (!getFsImplementation().existsSync(filePath)) {
        break  // found a non-conflicting slug
      }
    }
    cache.set(id, slug!)
  }
  return slug!
}

// ─── ausente: líneas 50-78 (29 líneas sin fragmento en el corpus) ───

// ─── part1/ch04b.md · líneas 79-128 ───
export const getPlansDirectory = memoize(function getPlansDirectory(): string {
  const settings = getInitialSettings()
  const settingsDir = settings.plansDirectory
  let plansPath: string

  if (settingsDir) {
    const cwd = getCwd()
    const resolved = resolve(cwd, settingsDir)
    // Path traversal defense
    if (!resolved.startsWith(cwd + sep) && resolved !== cwd) {
      logError(new Error(`plansDirectory must be within project root: ${settingsDir}`))
      plansPath = join(getClaudeConfigHomeDir(), 'plans')
    } else {
      plansPath = resolved
    }
  } else {
    plansPath = join(getClaudeConfigHomeDir(), 'plans')
  }
  // ...
})

export function getPlanFilePath(agentId?: AgentId): string {
  const planSlug = getPlanSlug(getSessionId())
  if (!agentId) {
    return join(getPlansDirectory(), `${planSlug}.md`)  // main session
  }
  return join(getPlansDirectory(), `${planSlug}-agent-${agentId}.md`)  // sub-agent
}
