/**
 * La herramienta `Skill` — el despacho de un skill registrado al bucle (#49).
 *
 * El `SkillRegistry` (`src/skills/registry.ts`) sabe registrar, listar e
 * invocar un skill; lo que le faltaba era una vía desde el modelo. Esta
 * herramienta es esa vía: el modelo pide un skill por nombre, el registry lo
 * `invoke`a, y sus instrucciones vuelven como el `content` del `tool_result` —
 * el mismo patrón de inyección de contexto que la herramienta `Skill` del
 * ejecutable de referencia.
 *
 * Es una FÁBRICA, no un `Tool` estático, por la misma razón que `agentTool`
 * (`src/tools/agent.ts`): necesita el `registry` en tiempo de ejecución, y
 * `CORE_TOOLS` no puede llevarlo sin cablear el registry al núcleo. El CLI la
 * compone (`bin/harness.ts`), igual que a `agentTool`.
 *
 * El `getPrompt` de un skill puede leer el hilo de la sesión
 * (`SkillContext.messages`) — es la mitad que un `SKILL.md` estático no tiene.
 * `ToolContext` ya lleva ese hilo (`loop.ts:420` construye el ctx con una
 * instantánea de los mensajes, #70), así que aquí se reenvía `ctx.messages` en
 * vez del arreglo vacío que iba antes. Un skill sólo-apoyo —los cinco de
 * `bundled.ts`— tiene prompt estático y lo ignora; uno que dependa del hilo
 * —resumir la sesión, elegir el paso siguiente— ahora lo recibe.
 */
import type { ContentBlock, Tool, ToolContext, ToolResult } from '../types.ts'
import type { SkillRegistry } from '../skills/registry.ts'

/** Aplana los bloques del prompt de un skill a un solo texto para el modelo. */
function flatten(blocks: ContentBlock[]): string {
  const parts: string[] = []
  for (const b of blocks) {
    if (b.type === 'text') parts.push(b.text)
    else if (b.type === 'thinking') parts.push(b.thinking)
    // tool_use / tool_result / redacted_thinking no aparecen en el prompt de un
    // skill; si aparecieran, se omiten en vez de romper el aplanado.
  }
  return parts.join('\n\n')
}

export function skillTool(registry: SkillRegistry): Tool {
  return {
    name: 'Skill',
    description:
      'Invoca un skill registrado por su nombre. Sus instrucciones se inyectan como el resultado de la ' +
      'herramienta, para que las sigas en este mismo hilo. Úsalo cuando la tarea coincide con un skill ' +
      'disponible en vez de improvisar el procedimiento.',
    permission: 'read',
    input_schema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'El nombre exacto del skill registrado, sin barra inicial.' },
        args: { type: 'string', description: 'El texto que sigue al nombre del skill (opcional).' },
      },
      required: ['skill'],
    },
    async run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
      const error = (m: string): ToolResult => ({ content: m, isError: true })

      const name = input.skill
      if (typeof name !== 'string' || name === '') return error("falta el campo obligatorio 'skill'")

      // Se comprueba antes de invocar para dar el error con los nombres
      // registrados —igual que `agentTool` con un `subagent_type` desconocido—,
      // en vez de dejar que `invoke` lance una cadena sin contexto.
      const def = registry.get(name)
      if (!def || !(def.isEnabled?.() ?? true)) {
        const known = registry.list().map((s) => s.name).join(', ')
        return error(`skill desconocido: ${name}. Registrados: ${known || '(ninguno)'}`)
      }

      const args = typeof input.args === 'string' ? input.args : ''
      try {
        const blocks = await registry.invoke(name, { args, messages: ctx.messages, cwd: ctx.cwd })
        return { content: flatten(blocks), isError: false }
      } catch (e) {
        return error(`el skill ${name} falló al invocarse: ${(e as Error).message}`)
      }
    },
  }
}
