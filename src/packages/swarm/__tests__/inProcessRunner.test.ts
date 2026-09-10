/**
 * La mitad ROJA del ejecutor de compañero en proceso.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/inProcessRunner.ts` (1289
 * líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * reimplementa y no se copia — y **la fuente no tiene test para este módulo**
 * (medido: ningún archivo de `packages/swarm` lo importa desde `__tests__`),
 * así que estos casos son propios, no portados.
 *
 * QUÉ SE MIDE, Y POR QUÉ SÓLO ESTO. Todo lo que hay más allá de `runAgent` es
 * integración con el anfitrión. Aquí se ejercitan las tres costuras que SÍ
 * tienen conducta propia, cada una por la superficie exportada:
 *
 * 1. **La forma del sobre** — el `<teammate-message>` con `color` y `summary`.
 *    Anulación: quitar `summaryAttr` de `formatAsTeammateMessage` y sólo cae el
 *    caso con resumen.
 * 2. **El corto-circuito de `updateTaskState`** — cuando el actualizador
 *    devuelve la MISMA referencia, no se compone un estado nuevo. Anulación:
 *    quitar el `updated === task` y el caso de identidad cae.
 * 3. **La puerta de `BASH_CLASSIFIER`** — con la variable apagada el
 *    clasificador no se llama; encendida, se llama una vez y su decisión gana.
 *    Anulación: fijar la comparación a `true` y cae el caso de apagado.
 *
 * Métrica: la conducta del bucle contra un buzón REAL bajo `/dev/shm` y los
 * enlaces del anfitrión doblados.
 * Ciega a: la compactación —el umbral se doble a un valor que no se alcanza—,
 * al reloj del sondeo, y a todo lo que `runAgent` hace de verdad.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []
let cierres: { taskId: string; status: string }[] = []
let clasificadorLlamadas = 0
let capturedCanUseTool: ((...args: unknown[]) => Promise<unknown>) | undefined
let capturedWorkControllers: AbortController[] = []

const TOOL_BASH = 'Bash'

/** Instala los enlaces del anfitrión con los dobles que este archivo necesita. */
async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''

  mapa.TEAMMATE_MESSAGE_TAG = 'teammate-message'
  mapa.BASH_TOOL_NAME = TOOL_BASH
  mapa.SUBAGENT_REJECT_MESSAGE = 'rechazado'
  mapa.SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX = 'rechazado: '
  mapa.ERROR_MESSAGE_USER_ABORT = 'interrumpido'

  mapa.logForDebugging = (s: string) => trazas.push(s)
  mapa.logError = () => undefined
  mapa.logEvent = () => undefined
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.sanitizePathComponent = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-')
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.sleep = () => Promise.resolve()
  mapa.listTasks = async () => []
  mapa.getGlobalConfig = () => ({})
  mapa.getPlatform = () => 'linux'
  mapa.getIsNonInteractiveSession = () => false

  mapa.getSystemPrompt = async () => ['base']
  mapa.asSystemPrompt = (x: unknown) => x
  mapa.createUserMessage = (x: { content: string }) => ({
    type: 'user',
    message: { content: x.content },
  })
  mapa.createAssistantAPIErrorMessage = (x: { content: string }) => ({
    type: 'assistant',
    message: { content: x.content },
  })
  // El umbral se pone por encima de cualquier conteo posible: la compactación
  // queda fuera de estos casos a propósito, no por descuido.
  mapa.tokenCountWithEstimation = () => 0
  mapa.getAutoCompactThreshold = () => Number.MAX_SAFE_INTEGER
  mapa.createProgressTracker = () => ({})
  mapa.createActivityDescriptionResolver = () => () => ''
  mapa.getProgressUpdate = () => undefined
  mapa.updateProgressFromMessage = () => undefined
  mapa.createAbortController = () => {
    const c = new AbortController()
    capturedWorkControllers.push(c)
    return c
  }
  mapa.runWithTeammateContext = (_c: unknown, f: () => unknown) => f()
  mapa.runWithAgentContext = (_c: unknown, f: () => unknown) => f()
  mapa.evictTaskOutput = () => undefined
  mapa.evictTerminalTask = () => undefined
  mapa.emitTaskTerminatedSdk = (taskId: string, status: string) => {
    cierres.push({ taskId, status })
  }
  mapa.unregisterAgent = () => undefined
  mapa.awaitClassifierAutoApproval = async () => {
    clasificadorLlamadas++
    return 'aprobado-por-clasificador'
  }
  // `appendTeammateMessage` NO usa el `updateTaskState` local de este módulo:
  // usa el ENLACE del anfitrión, que por defecto es un doble sin efecto. Sin
  // esta implementación el sobre nunca aterriza y el caso mediría el doble en
  // vez del bucle.
  mapa.updateTaskState = (
    taskId: string,
    setAppState: (f: (p: never) => never) => void,
    updater: (t: never) => never,
  ) => {
    setAppState(((prev: Record<string, Record<string, { type?: string }>>) => {
      const t = prev.tasks[taskId]
      if (!t || t.type !== 'in_process_teammate') return prev
      const u = updater(t as never)
      if ((u as unknown) === t) return prev
      return { ...prev, tasks: { ...prev.tasks, [taskId]: u } }
    }) as never)
  }
  mapa.hasPermissionsToUseTool = async () => ({
    behavior: 'ask',
    pendingClassifierCheck: { comando: 'ls' },
  })

  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

/**
 * `runAgent` doblado: captura la función de permiso que el bucle le entrega —
 * es la única vía a `createInProcessCanUseTool`, que no está exportada — y
 * aborta el ciclo de vida en la llamada número `abortarEnLlamada`.
 */
function runAgentDoble(
  ciclo: AbortController,
  abortarEnLlamada: number,
  alAbortar?: () => void,
): (cfg: Record<string, unknown>) => AsyncIterable<unknown> {
  let llamadas = 0
  return function (cfg) {
    llamadas++
    capturedCanUseTool = cfg.canUseTool as typeof capturedCanUseTool
    if (llamadas >= abortarEnLlamada) {
      alAbortar?.()
      ciclo.abort()
    }
    return {
      async *[Symbol.asyncIterator]() {
        // Sin mensajes: lo que se mide es el bucle, no lo que el agente diga.
      },
    }
  }
}

function sembrar(mensajes: unknown[], agente = 'ana', equipo = 'eq'): void {
  mkdirSync(join(raiz, 'teams', equipo, 'inboxes'), { recursive: true })
  writeFileSync(
    join(raiz, 'teams', equipo, 'inboxes', `${agente}.json`),
    JSON.stringify(mensajes),
    'utf-8',
  )
}

const IDENTIDAD = {
  agentId: 'ana-1',
  agentName: 'ana',
  teamName: 'eq',
  color: 'blue',
  parentSessionId: 'ses-1',
  planModeRequired: false,
}

/** Una tarea de compañero en proceso, con lo mínimo que el bucle lee. */
function tarea(encima: Record<string, unknown> = {}) {
  return {
    type: 'in_process_teammate',
    status: 'running',
    messages: [],
    pendingUserMessages: [],
    permissionMode: 'default',
    identity: IDENTIDAD,
    ...encima,
  }
}

/** El estado de la aplicación con su actualizador, como lo recibe el bucle. */
function estado(inicial: Record<string, unknown>) {
  let actual: Record<string, unknown> = { tasks: inicial }
  // Una entrada por llamada a `setAppState`: `true` si compuso un objeto
  // nuevo, `false` si el actualizador corto-circuitó. Es lo ÚNICO que
  // distingue la guarda `updated === task` de su ausencia.
  const cambios: boolean[] = []
  return {
    obtener: () => actual as never,
    fijar: (f: (p: never) => never) => {
      const antes = actual
      actual = f(actual as never) as never
      cambios.push(actual !== antes)
    },
    leer: () => actual,
    cambios: () => cambios,
  }
}

function contexto(st: ReturnType<typeof estado>) {
  return {
    options: {
      tools: [],
      mainLoopModel: 'modelo',
      mcpClients: [],
      isNonInteractiveSession: false,
    },
    getAppState: st.obtener,
    setAppState: st.fijar,
    readFileState: {},
  } as never
}

beforeEach(() => {
  raiz = mkdtempSync('/dev/shm/runner-')
  trazas = []
  cierres = []
  clasificadorLlamadas = 0
  capturedCanUseTool = undefined
  capturedWorkControllers = []
  delete process.env.CCB_FEATURE_BASH_CLASSIFIER
})

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
  rmSync(raiz, { recursive: true, force: true })
  delete process.env.CCB_FEATURE_BASH_CLASSIFIER
})

describe('el sobre <teammate-message> con que entra un mensaje de par', () => {
  test('lleva teammate_id, color y summary cuando el par los declara', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 2) })
    sembrar([
      {
        from: 'beto',
        text: 'revisa el puerto',
        timestamp: '2026-01-01T00:00:00Z',
        read: false,
        color: 'green',
        summary: 'revision',
      },
    ])
    const st = estado({ t1: tarea() })
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    const textos = (
      (st.leer().tasks as Record<string, { messages: { message: { content: string } }[] }>)
        .t1.messages
    ).map(m => m.message.content)
    const sobre = textos.find(t => t.includes('teammate_id="beto"'))
    expect(sobre).toBeDefined()
    expect(sobre).toContain('color="green"')
    expect(sobre).toContain('summary="revision"')
    expect(sobre).toContain('revisa el puerto')
    expect(sobre).toContain('</teammate-message>')
  })

  test('omite color y summary cuando el par no los declara', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 2) })
    sembrar([
      {
        from: 'beto',
        text: 'sin adornos',
        timestamp: '2026-01-01T00:00:00Z',
        read: false,
      },
    ])
    const st = estado({ t1: tarea() })
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    const textos = (
      (st.leer().tasks as Record<string, { messages: { message: { content: string } }[] }>)
        .t1.messages
    ).map(m => m.message.content)
    const sobre = textos.find(t => t.includes('teammate_id="beto"'))
    expect(sobre).toBe(
      '<teammate-message teammate_id="beto">\nsin adornos\n</teammate-message>',
    )
  })

  test('el prompt inicial entra con team-lead como emisor', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 1) })
    sembrar([])
    const st = estado({ t1: tarea() })
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      description: 'la tarea',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    const textos = (
      (st.leer().tasks as Record<string, { messages: { message: { content: string } }[] }>)
        .t1.messages
    ).map(m => m.message.content)
    expect(textos[0]).toContain('teammate_id="team-lead"')
    expect(textos[0]).toContain('summary="la tarea"')
  })
})

describe('updateTaskState — sus tres guardas', () => {
  test('una tarea de otro tipo no se toca: el estado conserva su referencia', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 1) })
    sembrar([])
    const st = estado({ t1: { type: 'otra_cosa', status: 'running' } })
    const antes = st.leer()
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    expect(st.leer()).toBe(antes)
  })

  test('una tarea ausente no compone estado nuevo', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 1) })
    sembrar([])
    const st = estado({})
    const antes = st.leer()
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 'ausente',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    expect(st.leer()).toBe(antes)
  })

  test('una tarea muerta DURANTE la ejecución no se cierra dos veces', async () => {
    // Es la costura del corto-circuito `updated === task`: el actualizador
    // final devuelve la MISMA referencia cuando el estado ya no es 'running',
    // y entonces la última actualización NO compone un objeto nuevo.
    //
    // La tarea tiene que morir DENTRO de la ejecución: el bucle pone
    // 'running' al arrancar cada turno, así que una muerta de antemano
    // reviviría y este caso mediría lo contrario de lo que dice medir.
    const ciclo = new AbortController()
    const st = estado({ t1: tarea() })
    await instalar({
      runAgent: runAgentDoble(ciclo, 1, () => {
        st.fijar(((p: { tasks: Record<string, unknown> }) => ({
          ...p,
          tasks: {
            ...p.tasks,
            t1: { ...(p.tasks.t1 as object), status: 'killed' },
          },
        })) as never)
      }),
    })
    sembrar([])
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    const t1 = (st.leer().tasks as Record<string, { status: string }>).t1
    expect(t1.status).toBe('killed')
    expect(cierres).toEqual([])
    // La ÚLTIMA actualización es la terminal: corto-circuitó.
    expect(st.cambios().at(-1)).toBe(false)
  })

  test('una tarea viva sí se cierra al salir del bucle', async () => {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 1) })
    sembrar([])
    const st = estado({ t1: tarea() })
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )

    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })

    expect(cierres).toEqual([{ taskId: 't1', status: 'completed' }])
    // El contraste del caso anterior: aquí la terminal SÍ compone estado nuevo.
    expect(st.cambios().at(-1)).toBe(true)
  })
})

describe('la puerta de BASH_CLASSIFIER', () => {
  /** Corre una iteración y devuelve la función de permiso que el bucle armó. */
  async function obtenerCanUseTool(): Promise<
    (...args: unknown[]) => Promise<unknown>
  > {
    const ciclo = new AbortController()
    await instalar({ runAgent: runAgentDoble(ciclo, 1) })
    sembrar([])
    const st = estado({ t1: tarea() })
    const { runInProcessTeammate } = await import(
      '../src/runtime/inProcessRunner.ts'
    )
    await runInProcessTeammate({
      identity: IDENTIDAD,
      taskId: 't1',
      prompt: 'arranca',
      teammateContext: {} as never,
      toolUseContext: contexto(st),
      abortController: ciclo,
    })
    expect(capturedCanUseTool).toBeDefined()
    return capturedCanUseTool!
  }

  const CONTEXTO_HERRAMIENTA = {
    options: { isNonInteractiveSession: false, tools: [] },
    getAppState: () => ({ toolPermissionContext: {} }),
  }

  test('con la variable sin declarar, el clasificador NO se llama', async () => {
    const canUseTool = await obtenerCanUseTool()
    // El controlador del turno se aborta para que la función salga justo
    // después de la puerta, sin entrar a la interfaz ni al buzón.
    capturedWorkControllers.forEach(c => c.abort())

    const r = (await canUseTool(
      { name: TOOL_BASH },
      { command: 'ls' },
      CONTEXTO_HERRAMIENTA,
      undefined,
      'tu-1',
    )) as { behavior: string; message?: string }

    expect(clasificadorLlamadas).toBe(0)
    expect(r.behavior).toBe('ask')
    expect(r.message).toBe('rechazado')
  })

  test('con la variable en «1», se llama una vez y su decisión gana', async () => {
    const canUseTool = await obtenerCanUseTool()
    capturedWorkControllers.forEach(c => c.abort())
    process.env.CCB_FEATURE_BASH_CLASSIFIER = '1'

    const r = (await canUseTool(
      { name: TOOL_BASH },
      { command: 'ls' },
      CONTEXTO_HERRAMIENTA,
      undefined,
      'tu-1',
    )) as { behavior: string; decisionReason?: string }

    expect(clasificadorLlamadas).toBe(1)
    expect(r.behavior).toBe('allow')
    expect(r.decisionReason).toBe('aprobado-por-clasificador')
  })

  test('con cualquier otro valor la puerta sigue cerrada', async () => {
    const canUseTool = await obtenerCanUseTool()
    capturedWorkControllers.forEach(c => c.abort())
    process.env.CCB_FEATURE_BASH_CLASSIFIER = 'true'

    const r = (await canUseTool(
      { name: TOOL_BASH },
      { command: 'ls' },
      CONTEXTO_HERRAMIENTA,
      undefined,
      'tu-1',
    )) as { behavior: string }

    expect(clasificadorLlamadas).toBe(0)
    expect(r.behavior).toBe('ask')
  })

  test('una herramienta que no es Bash no pasa por el clasificador', async () => {
    const canUseTool = await obtenerCanUseTool()
    capturedWorkControllers.forEach(c => c.abort())
    process.env.CCB_FEATURE_BASH_CLASSIFIER = '1'

    const r = (await canUseTool(
      { name: 'Read' },
      { file_path: '/x' },
      CONTEXTO_HERRAMIENTA,
      undefined,
      'tu-1',
    )) as { behavior: string }

    expect(clasificadorLlamadas).toBe(0)
    expect(r.behavior).toBe('ask')
  })

  test('una decisión forzada se devuelve tal cual, sin consultar permisos', async () => {
    const canUseTool = await obtenerCanUseTool()
    const r = (await canUseTool(
      { name: TOOL_BASH },
      { command: 'ls' },
      CONTEXTO_HERRAMIENTA,
      undefined,
      'tu-1',
      { behavior: 'allow', updatedInput: { command: 'ls' } },
    )) as { behavior: string }

    expect(clasificadorLlamadas).toBe(0)
    expect(r.behavior).toBe('allow')
  })
})
