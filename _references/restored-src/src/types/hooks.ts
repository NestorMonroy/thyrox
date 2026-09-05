// ══════════════════════════════════════════════════════════════════
// restored-src/src/types/hooks.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 4 · líneas de código: 46
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch18.md · líneas 28-40 ───
export const promptRequestSchema = lazySchema(() =>
  z.object({
    prompt: z.string(),       // Request ID
    message: z.string(),      // Message displayed to user
    options: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
)

// ─── ausente: líneas 41-49 (9 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 50-66 ───
export const syncHookResponseSchema = lazySchema(() =>
  z.object({
    continue: z.boolean().optional(),       // false = stop execution
    suppressOutput: z.boolean().optional(), // true = hide stdout
    stopReason: z.string().optional(),      // Message when continue=false
    decision: z.enum(['approve', 'block']).optional(),
    reason: z.string().optional(),
    systemMessage: z.string().optional(),   // Warning displayed to user
    hookSpecificOutput: z.union([/* per-event-type specific output */]).optional(),
  }),
)

// ─── ausente: líneas 67-71 (5 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 72-78 ───
z.object({
  hookEventName: z.literal('PreToolUse'),
  permissionDecision: permissionBehaviorSchema().optional(),
  permissionDecisionReason: z.string().optional(),
  updatedInput: z.record(z.string(), z.unknown()).optional(),
  additionalContext: z.string().optional(),
})

// ─── ausente: líneas 79-120 (42 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 121-133 ───
z.object({
  hookEventName: z.literal('PermissionRequest'),
  decision: z.union([
    z.object({
      behavior: z.literal('allow'),
      updatedInput: z.record(z.string(), z.unknown()).optional(),
      updatedPermissions: z.array(permissionUpdateSchema()).optional(),
    }),
    z.object({
      behavior: z.literal('deny'),
      message: z.string().optional(),
      interrupt: z.boolean().optional(),
    }),
  ]),
})
