// ══════════════════════════════════════════════════════════════════
// restored-src/src/schemas/hooks.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 4 · líneas de código: 38
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch18.md · líneas 32-65 ───
const BashCommandHookSchema = z.object({
  type: z.literal('command'),
  command: z.string(),
  if: IfConditionSchema(),
  shell: z.enum(SHELL_TYPES).optional(),   // 'bash' | 'powershell'
  timeout: z.number().positive().optional(),
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),            // Remove after single execution
  async: z.boolean().optional(),           // Background execution, non-blocking
  asyncRewake: z.boolean().optional(),     // Background execution, rewake model on exit code 2
})

// ─── ausente: líneas 66-66 (1 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 67-95 ───
const PromptHookSchema = z.object({
  type: z.literal('prompt'),
  prompt: z.string(),     // Uses $ARGUMENTS placeholder to inject Hook input JSON
  if: IfConditionSchema(),
  model: z.string().optional(),  // Defaults to small fast model
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),
})

// ─── ausente: líneas 96-96 (1 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 97-126 ───
const HttpHookSchema = z.object({
  type: z.literal('http'),
  url: z.string().url(),
  if: IfConditionSchema(),
  timeout: z.number().positive().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  allowedEnvVars: z.array(z.string()).optional(),
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),
})

// ─── ausente: líneas 127-127 (1 líneas sin fragmento en el corpus) ───

// ─── part5/ch18.md · líneas 128-163 ───
const AgentHookSchema = z.object({
  type: z.literal('agent'),
  prompt: z.string(),     // "Verify that unit tests ran and passed."
  if: IfConditionSchema(),
  timeout: z.number().positive().optional(),  // Default 60 seconds
  model: z.string().optional(),  // Defaults to Haiku
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),
})
