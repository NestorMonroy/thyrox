/**
 * `internal/stopHooksCore.ts::handleStopHooks` — el generador de integración
 * del pipeline de hooks Stop (#262).
 *
 * QUÉ MIDE, y por qué la forma importa. El bloqueo declarado de este símbolo
 * decía, textual: «cada llamada es opcional y devuelve `undefined`, así que
 * un puerto hoy pasaría sus tests midiendo el vacío — el defecto que la
 * anulación existe para atrapar». Así que estos casos NO comprueban que el
 * generador «no reviente»: comprueban que **conduce** sus host bindings, y
 * cada uno nombra la llamada concreta que lo delataría.
 *
 * Un generador que no llamara a nada terminaría igual de limpio y devolvería
 * el mismo `{blockingErrors: [], preventContinuation: false}` del caso feliz.
 * Por eso el caso 1 afirma sobre el REGISTRO de llamadas, no sobre el valor
 * devuelto: es el único par que discrimina «funciona» de «no pregunta».
 *
 * MITAD ROJA: los casos fallan porque `handleStopHooks` no se exporta.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { handleStopHooks } from '../internal/stopHooksCore.ts'
import { installAgentHostBindings } from '../host.ts'
import type {
  AgentAssistantMessage,
  AgentMessage,
  AgentSystemPrompt,
  AgentToolUseContext,
} from '../internalTypes.ts'

type Llamada = { nombre: string; args: unknown[] }

/** Resultado que `executeStopHooks` emite, en la forma que la fuente consume. */
type ResultadoDeHook = {
  message?: unknown
  blockingError?: { blockingError: string }
  preventContinuation?: boolean
  stopReason?: string
}

function bindings(
  registro: Llamada[],
  resultados: ResultadoDeHook[] = [],
  extra: Record<string, unknown> = {},
) {
  const anota =
    (nombre: string, valor?: unknown) =>
    (...args: unknown[]) => {
      registro.push({ nombre, args })
      return valor
    }
  return {
    getSessionId: () => 'sesion-de-prueba',
    logDebug: anota('logDebug'),
    logEvent: anota('logEvent'),
    createCacheSafeParams: anota('createCacheSafeParams', { snapshot: true }),
    saveCacheSafeParams: anota('saveCacheSafeParams'),
    executePromptSuggestion: anota('executePromptSuggestion'),
    cleanupComputerUseAfterTurn: anota('cleanupComputerUseAfterTurn'),
    classifyJobState: anota('classifyJobState', Promise.resolve()),
    getTaskListId: anota('getTaskListId', 'lista-1'),
    listTasks: anota('listTasks', Promise.resolve([])),
    createAttachmentMessage: (a: unknown) => {
      registro.push({ nombre: 'createAttachmentMessage', args: [a] })
      return { type: 'attachment', attachment: a } as unknown as AgentMessage
    },
    createUserMessage: (a: unknown) => {
      registro.push({ nombre: 'createUserMessage', args: [a] })
      return { type: 'user', ...(a as object) } as unknown as AgentMessage
    },
    createUserInterruptionMessage: (a: unknown) => {
      registro.push({ nombre: 'createUserInterruptionMessage', args: [a] })
      return { type: 'user', interrupted: true } as unknown as AgentMessage
    },
    createSystemMessage: (m: string, nivel: string) => {
      registro.push({ nombre: 'createSystemMessage', args: [m, nivel] })
      return { type: 'system', content: m } as unknown as AgentMessage
    },
    createStopHookSummaryMessage: (...args: unknown[]) => {
      registro.push({ nombre: 'createStopHookSummaryMessage', args })
      return { type: 'system', content: 'resumen' } as unknown as AgentMessage
    },
    getStopHookMessage: (e: { blockingError: string }) => e.blockingError,
    getShortcutDisplay: anota('getShortcutDisplay', 'ctrl+o'),
    isTeammate: () => false,
    executeStopHooks: (...args: unknown[]) => {
      registro.push({ nombre: 'executeStopHooks', args })
      return (async function* () {
        for (const r of resultados) yield r
      })()
    },
    ...extra,
  }
}

function contexto(abortController = new AbortController()): AgentToolUseContext {
  return {
    abortController,
    agentId: undefined,
    agentType: 'main',
    getAppState: () => ({ toolPermissionContext: { mode: 'default' } }),
    setAppState: () => {},
    addNotification: () => {},
    queryTracking: { chainId: 'c1', depth: 0 },
  } as unknown as AgentToolUseContext
}

async function drenar(
  gen: AsyncGenerator<unknown, { blockingErrors: AgentMessage[]; preventContinuation: boolean }>,
) {
  const emitidos: unknown[] = []
  let paso = await gen.next()
  while (!paso.done) {
    emitidos.push(paso.value)
    paso = await gen.next()
  }
  return { emitidos, resultado: paso.value }
}

const vacio = (ctx: AgentToolUseContext, fuente = 'repl_main_thread') =>
  handleStopHooks(
    [] as AgentMessage[],
    [] as AgentAssistantMessage[],
    { type: 'preset' } as unknown as AgentSystemPrompt,
    {},
    {},
    ctx,
    fuente as never,
  )

describe('handleStopHooks', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CODE_SIMPLE
    delete process.env.CLAUDE_JOB_DIR
  })

  test('1. PREGUNTA por los hooks — no se limita a terminar limpio', async () => {
    // El control que separa «el generador funciona» de «el generador no
    // llama a nada». Sin esta afirmación, un cuerpo vacío pasaría: devuelve
    // exactamente el mismo resultado feliz.
    const registro: Llamada[] = []
    installAgentHostBindings(bindings(registro) as never)
    const { resultado } = await drenar(vacio(contexto()))
    expect(resultado).toEqual({ blockingErrors: [], preventContinuation: false })
    expect(registro.map(l => l.nombre)).toContain('executeStopHooks')
  })

  test('2. el snapshot de params sólo se guarda en el hilo principal', async () => {
    const principal: Llamada[] = []
    installAgentHostBindings(bindings(principal) as never)
    await drenar(vacio(contexto(), 'repl_main_thread'))
    expect(principal.map(l => l.nombre)).toContain('saveCacheSafeParams')

    // Un subagente NO debe pisar el snapshot del hilo principal — es la
    // razón declarada de la guarda, y sin el caso negativo la afirmación de
    // arriba no distingue «se guarda cuando toca» de «se guarda siempre».
    const subagente: Llamada[] = []
    installAgentHostBindings(bindings(subagente) as never)
    await drenar(vacio(contexto(), 'agent'))
    expect(subagente.map(l => l.nombre)).not.toContain('saveCacheSafeParams')
  })

  test('3. un hook que bloquea devuelve su mensaje en blockingErrors', async () => {
    const registro: Llamada[] = []
    installAgentHostBindings(
      bindings(registro, [{ blockingError: { blockingError: 'falta el changelog' } }]) as never,
    )
    const { emitidos, resultado } = await drenar(vacio(contexto()))
    expect(resultado.preventContinuation).toBe(false)
    expect(resultado.blockingErrors).toHaveLength(1)
    // Y el mensaje se EMITE además de devolverse: quien consume el generador
    // lo ve pasar, no sólo al final.
    expect(emitidos.length).toBeGreaterThan(0)
    expect(registro.map(l => l.nombre)).toContain('createUserMessage')
  })

  test('4. preventContinuation corta el turno y no acumula bloqueos', async () => {
    const registro: Llamada[] = []
    installAgentHostBindings(
      bindings(registro, [
        { preventContinuation: true, stopReason: 'el turno se cierra aqui' },
      ]) as never,
    )
    const { resultado } = await drenar(vacio(contexto()))
    expect(resultado).toEqual({ blockingErrors: [], preventContinuation: true })
    const adjunto = registro.find(l => l.nombre === 'createAttachmentMessage')
    expect((adjunto?.args[0] as { type: string }).type).toBe(
      'hook_stopped_continuation',
    )
  })

  test('5. un abort a mitad de la ejecución corta con preventContinuation', async () => {
    const registro: Llamada[] = []
    const ac = new AbortController()
    installAgentHostBindings(
      bindings(registro, [
        { message: { type: 'progress', toolUseID: 't1' } },
        { message: { type: 'progress', toolUseID: 't2' } },
      ]) as never,
    )
    const gen = vacio(contexto(ac))
    await gen.next()
    ac.abort()
    const resto = await drenar(gen as never)
    expect(resto.resultado.preventContinuation).toBe(true)
    expect(registro.map(l => l.nombre)).toContain('createUserInterruptionMessage')
  })

  test('6. si corrieron hooks se emite el resumen; si no, no', async () => {
    const conHooks: Llamada[] = []
    installAgentHostBindings(
      bindings(conHooks, [
        { message: { type: 'progress', toolUseID: 't1', data: { command: 'x.sh' } } },
      ]) as never,
    )
    await drenar(vacio(contexto()))
    expect(conHooks.map(l => l.nombre)).toContain('createStopHookSummaryMessage')

    const sinHooks: Llamada[] = []
    installAgentHostBindings(bindings(sinHooks) as never)
    await drenar(vacio(contexto()))
    expect(sinHooks.map(l => l.nombre)).not.toContain('createStopHookSummaryMessage')
  })

  test('7. --bare salta el trabajo de fondo', async () => {
    const normal: Llamada[] = []
    installAgentHostBindings(bindings(normal) as never)
    await drenar(vacio(contexto()))
    expect(normal.map(l => l.nombre)).toContain('executePromptSuggestion')

    process.env.CLAUDE_CODE_SIMPLE = '1'
    const bare: Llamada[] = []
    installAgentHostBindings(bindings(bare) as never)
    await drenar(vacio(contexto()))
    expect(bare.map(l => l.nombre)).not.toContain('executePromptSuggestion')
  })

  test('8. un fallo del ejecutor no revienta: se declara y se devuelve limpio', async () => {
    const registro: Llamada[] = []
    installAgentHostBindings(
      bindings(registro, [], {
        executeStopHooks: () =>
          (async function* () {
            throw new Error('el ejecutor se cayo')
          })(),
      }) as never,
    )
    const { resultado } = await drenar(vacio(contexto()))
    expect(resultado).toEqual({ blockingErrors: [], preventContinuation: false })
    const sistema = registro.find(l => l.nombre === 'createSystemMessage')
    expect(sistema?.args[0]).toContain('el ejecutor se cayo')
    expect(sistema?.args[1]).toBe('warning')
  })
})
