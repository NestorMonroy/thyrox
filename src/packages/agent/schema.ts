// Esquema de una definición de agente, derivado del ejecutable vendorizado.
//
// La fuente NO es un corpus de terceros: es
// `_references/claude-code-bin/2.1.250/claude_strings.txt`, delimitado por balanceo
// de llaves en `.claude/eventos/implementar-agent-ts-20260829T001415/`. El
// identificador `AgentJsonSchema` da 0 hits porque el ejecutable está
// minificado; lo que sobrevive son las CLAVES, que son parte del contrato con
// quien escribe un agente.
//
// Se usa `zod` porque es la librería que el propio cliente usa para declarar
// este objeto — validar con otra cosa sería reimplementar su semántica.
import { z } from 'zod'

/** Los niveles nombrados de `effort`. La fuente admite además un entero. */
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/** `memory:le(["user","project","local"])` en el bloque delimitado. */
export const MEMORY_SCOPES = ['user', 'project', 'local'] as const

/** `isolation:le(["worktree","remote"])` en el bloque delimitado. */
export const ISOLATION_MODES = ['worktree', 'remote'] as const

/**
 * Las 18 claves de primer nivel, en el orden en que la fuente las declara.
 *
 * Son 18, no 15: `observer`, `observerMessage` y `observeSubagents` faltaban en
 * el conteo anterior, que salió de un corpus ya perdido en vez del ejecutable.
 */
export const AGENT_JSON_KEYS = [
  'description', 'tools', 'disallowedTools', 'prompt', 'model', 'effort',
  'permissionMode', 'mcpServers', 'hooks', 'maxTurns', 'skills',
  'initialPrompt', 'memory', 'background', 'isolation',
  'observer', 'observerMessage', 'observeSubagents',
] as const

// `i().trim().min(1,…).transform(…)` — el literal `inherit` se normaliza a
// minúscula; cualquier otro valor conserva su forma.
const modelField = z.string().trim().min(1, 'Model cannot be empty')
  .transform((value) => value.toLowerCase() === 'inherit' ? 'inherit' : value)

// `mcpServers:H(e9e())` y `hooks:dN()` — sus sub-esquemas quedan sin delimitar
// (ver «Ciega a» del README). Se modelan permisivos para no rechazar lo que el
// cliente acepta; un esquema más estrecho que la fuente es peor que uno laxo.
const mcpServersField = z.array(z.unknown())
const hooksField = z.unknown()

export const AgentJsonSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty'),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  model: modelField.optional(),
  effort: z.union([z.enum(EFFORT_LEVELS), z.number().int()]).optional(),
  permissionMode: z.string().optional(),
  mcpServers: mcpServersField.optional(),
  hooks: hooksField.optional(),
  maxTurns: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  initialPrompt: z.string().optional(),
  memory: z.enum(MEMORY_SCOPES).optional(),
  background: z.boolean().optional(),
  isolation: z.enum(ISOLATION_MODES).optional(),
  observer: z.string().optional(),
  observerMessage: z.string().optional(),
  observeSubagents: z.boolean().optional(),
})

export type AgentJson = z.infer<typeof AgentJsonSchema>

export type ParseResult =
  | { ok: true; value: AgentJson }
  | { ok: false; errors: string[] }

/** Valida un objeto contra el contrato medido. Nunca lanza. */
export function parseAgentJson(candidate: unknown): ParseResult {
  const result = AgentJsonSchema.safeParse(candidate)
  if (result.success) {
    return { ok: true, value: result.data }
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
  return { ok: false, errors }
}
