// ══════════════════════════════════════════════════════════════════
// restored-src/src/skills/bundled/skillify.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 14
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22.md · líneas 158-162 ───
export function registerSkillifySkill(): void {
  if (process.env.USER_TYPE !== 'ant') {
    return
  }
  // ...
}

// ─── ausente: líneas 163-178 (16 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 179-194 ───
async getPromptForCommand(args, context) {
  const sessionMemory =
    (await getSessionMemoryContent()) ?? 'No session memory available.'
  const userMessages = extractUserMessages(
    getMessagesAfterCompactBoundary(context.messages),
  )
  // ...
}
