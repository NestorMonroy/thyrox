/**
 * Herramienta `Agent` — el subagente (T-018).
 *
 * Es el bucle llamándose a sí mismo con **contexto propio**: prompt de sistema
 * propio, transcript propio y, por tanto, clave de caché propia. Ése es el
 * punto — un subagente no comparte el prefijo del padre, así que su primer
 * turno paga la escritura entera de su contexto. Por eso despachar sale caro
 * cuando el trabajo es estrecho y sale a cuenta cuando es ancho.
 *
 * Los dos topes que el cliente aplica se aplican aquí, medidos en su
 * ejecutable y con la conducta que se midió, no la que se supone:
 *
 * - **Profundidad**: un subagente no engendra subagentes.
 * - **Anchura**: al exceder el tope el lanzamiento se **rechaza**; no hay cubo
 *   de espera. Encolar aquí sería inventar un mecanismo que el cliente no tiene
 *   (H-DOCS-1007).
 */
import { join } from 'node:path'
import { runHooks, type HookConfig } from '../hooks.ts'
import { Journal } from '../observability/journal.ts'
import { recordHarnessSession } from '../observability/store.ts'
import { USAGE_CERO, type Provider, type Tool, type ToolContext, type ToolResult } from '../types.ts'
import { CORE_TOOLS } from './registry.ts'

/** Lo que una definición de agente fija para su hijo. */
export type AgentDefinition = {
  model?: string
  systemPrompt?: string
  /** Nombres de herramienta que el hijo puede usar. Sin lista, hereda el núcleo. */
  tools?: string[]
  maxTurns?: number
}

export type AgentToolOptions = {
  provider: Provider
  transcriptDir: string
  definitions: Record<string, AgentDefinition>
  /** Modelo del hijo cuando su definición no lo fija. */
  defaultModel?: string
  journalPath?: string
  /** Los hooks del proyecto: `SubagentStart` y `SubagentStop` corren aquí. */
  hooks?: HookConfig
  depth?: number
  maxDepth?: number
  maxConcurrent?: number
  /**
   * Ruta del `agent_store.sqlite3`. Con ella, `agentTool` escribe la fila del
   * subagente ÉL MISMO —`source='harness'`, con su `subagent_type`, `model`,
   * `turns` y tokens reales—, sin depender del hook `SubagentStop` del cliente,
   * que en el harness remoto no dispara (cwd/directorio-adicional +
   * momento de creación del settings; :ref:`h-docs-1024`, :ref:`h-docs-1010`).
   * Sin ella, no se registra nada: el tool sigue usable sin store (tests).
   */
  storePath?: string
}

/**
 * El tipo comodín, que el cliente también trae de fábrica. Existe para que
 * `subagent_type` pueda ser obligatorio en la práctica sin obligar a registrar
 * una definición para el caso corriente — y para que el error de tipo
 * desconocido siga siendo un error, en vez de degradar en silencio.
 */
export const DEFAULT_AGENT_DEFINITIONS: Record<string, AgentDefinition> = { 'general-purpose': {} }

const SISTEMA_POR_DEFECTO =
  'Eres un subagente. Tienes contexto propio: lo que sepas del trabajo tiene que venir en tu prompt. ' +
  'Devuelve tu conclusión en tu último mensaje — es lo único que el orquestador va a leer.'

export function agentTool(opts: AgentToolOptions): Tool {
  const maxDepth = opts.maxDepth ?? 1
  const depth = opts.depth ?? 0
  const maxConcurrent = opts.maxConcurrent ?? 20
  const diario = opts.journalPath ? new Journal(opts.journalPath, 'harness') : null
  const definiciones = { ...DEFAULT_AGENT_DEFINITIONS, ...opts.definitions }
  let enVuelo = 0

  // Escribe la fila del subagente en el store, si hay uno configurado. Nunca
  // rompe el despacho: un error de DB no puede tumbar al subagente, igual que
  // el hook `save-agent-result.mjs` traga todo error y sale 0.
  const grabar = (fila: Parameters<typeof recordHarnessSession>[1]): void => {
    if (!opts.storePath) return
    try {
      recordHarnessSession(opts.storePath, fila)
    } catch {
      // telemetria local; su fallo no es del subagente
    }
  }

  return {
    name: 'Agent',
    description:
      'Lanza un subagente con contexto propio. Devuelve su conclusión final y la ruta de su transcript. ' +
      'Úsalo cuando el trabajo sea ancho y paralelo — N lotes independientes —, no cuando ya sepas qué archivos tocar: ' +
      'el hijo paga en frío todo el contexto que lea.',
    permission: 'execute',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'La tarea completa del hijo: no puede ver la conversación del padre.' },
        subagent_type: { type: 'string', description: 'Definición registrada que fija su modelo y su prompt de sistema.' },
        description: { type: 'string', description: 'Tres a cinco palabras que nombran la tarea.' },
        model: { type: 'string', description: 'Identificador completo del modelo. Nunca un alias.' },
      },
      required: ['prompt'],
    },
    async run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
      const error = (m: string): ToolResult => ({ content: m, isError: true })
      if (depth >= maxDepth) {
        return error(`limite de profundidad de subagentes alcanzado (${depth} de ${maxDepth}): haz el trabajo con tus propias herramientas`)
      }
      const tipo = typeof input.subagent_type === 'string' ? input.subagent_type : null
      const definicion = tipo === null ? {} : definiciones[tipo]
      if (tipo !== null && !definicion) {
        const conocidos = Object.keys(definiciones).join(', ')
        return error(`subagent_type desconocido: ${tipo}. Registrados: ${conocidos}`)
      }
      if (enVuelo >= maxConcurrent) {
        return error(`limite de anchura de subagentes alcanzado (${maxConcurrent} a la vez): no se encola, se rechaza — reintenta cuando alguno termine`)
      }

      const prompt = String(input.prompt ?? '')
      const model = (typeof input.model === 'string' ? input.model : undefined) ?? definicion.model ?? opts.defaultModel ?? 'claude-sonnet-5'
      const permitidas = definicion.tools
      const tools = permitidas ? CORE_TOOLS.filter((t) => permitidas.includes(t.name)) : CORE_TOOLS

      enVuelo += 1
      // El id de la fila del store: propio del despacho, estable entre 'running'
      // y 'completed'. No es el id de sesion del bucle —ese lo crea runLoop y
      // llega en la fase de cierre, en la columna session_id—.
      const agentId = crypto.randomUUID()
      const startedAt = new Date().toISOString()
      const subagentType = tipo ?? 'general-purpose'
      const description = typeof input.description === 'string' ? input.description : undefined
      const carga = {
        parent_session_id: ctx.sessionId, cwd: ctx.cwd,
        subagent_type: tipo, model, description: input.description ?? null,
      }
      diario?.log('SubagentStart', carga)
      await runHooks(opts.hooks ?? {}, 'SubagentStart', carga)
      // Fila 'running': si el proceso del harness muere a mitad del subagente,
      // el cierre de abajo no corre y esta fila queda; reconcileStaleRunningRows
      // la cerrara al reiniciar. session_id se rellena en el cierre.
      grabar({
        agentId, sessionId: agentId, subagentType, model, description,
        status: 'running', startedAt, turns: 0, usage: { ...USAGE_CERO },
      })
      try {
        // El bucle se importa aquí, no al principio del módulo: `loop.ts` ya
        // importa el registro de herramientas, y el registro incluirá a `Agent`
        // en cuanto se cablee. Es el único ciclo real del paquete.
        const { runLoop } = await import('../loop.ts')
        const r = await runLoop({
          provider: opts.provider,
          model,
          system: definicion.systemPrompt ?? SISTEMA_POR_DEFECTO,
          prompt,
          tools,
          cwd: ctx.cwd,
          transcriptDir: opts.transcriptDir,
          maxTurns: definicion.maxTurns ?? 20,
          signal: ctx.abort,
        })
        const cierre = {
          ...carga, session_id: r.sessionId, transcript_path: r.transcriptPath,
          turns: r.turns, stop: r.stop, usd: r.usd,
        }
        diario?.log('SubagentStop', cierre)
        await runHooks(opts.hooks ?? {}, 'SubagentStop', cierre)
        grabar({
          agentId, sessionId: r.sessionId, subagentType, model, description,
          status: 'completed', startedAt, turns: r.turns, usage: r.usage,
          equivCost: r.usd ?? undefined,
        })
        return {
          content: `${r.lastText}\n\n---\ntranscript: ${r.transcriptPath}\nturnos: ${r.turns} · parada: ${r.stop}`,
          isError: false,
        }
      } catch (e) {
        const fallo = { ...carga, error: (e as Error).message }
        diario?.log('SubagentStop', fallo)
        await runHooks(opts.hooks ?? {}, 'SubagentStop', fallo)
        grabar({
          agentId, sessionId: agentId, subagentType, model, description,
          status: 'failed', startedAt, turns: 0, usage: { ...USAGE_CERO },
        })
        return error(`el subagente falló: ${(e as Error).message}`)
      } finally {
        enVuelo -= 1
      }
    },
  }
}

/** La ruta del transcript de un hijo, para quien quiera leerlo después. */
export function childTranscriptPath(transcriptDir: string, sessionId: string): string {
  return join(transcriptDir, `${sessionId}.jsonl`)
}
