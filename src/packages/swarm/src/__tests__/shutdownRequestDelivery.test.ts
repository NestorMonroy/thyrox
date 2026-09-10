/**
 * Cobertura end-to-end del bug "agente fixer atascado tras 4
 * shutdown_requests".
 *
 * Procedencia: `ccnmt: packages/swarm/src/__tests__/shutdownRequestDelivery.test.ts`
 * (275 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el
 * cuerpo se **reimplementa** y no se copia.
 *
 * El modo de fallo original era una carrera de dos capas:
 *
 *   1. El líder reintentaba el shutdown_request 4 veces mientras el
 *      teammate estaba idle. Cada reintento empujaba una entrada nueva al
 *      archivo de buzón.
 *   2. El bucle de poll del runner escaneaba el buzón buscando shutdown
 *      requests sin leer, encontraba uno, lo marcaba leído y se lo pasaba
 *      al modelo. Pero por un lector del lado UI que marcaba TODOS los
 *      mensajes como leídos por sus propias razones, los otros tres
 *      duplicados pasaban a `read: true` sin haber sido procesados por
 *      el runner. El filtro `!m.read` los volvía entonces invisibles —
 *      un deadlock de "shutdown aprobado pero teammate sigue corriendo".
 *
 * El fix tiene dos frentes:
 *
 *   a) writeToMailbox deduplica por (type, requestId), así que los
 *      reintentos del líder colapsan a 1 entrada de buzón. Verificado
 *      end-to-end por writeToMailboxIntegration.test.ts.
 *
 *   b) El bucle de poll del runner ignora `m.read` y usa un ledger en
 *      memoria `processedRequestIds: Set<string>` como la autoridad de
 *      "ya entregado". Un shutdown_request se entrega al modelo
 *      exactamente una vez por instancia de runner, sin importar
 *      corrupción del flag del lado buzón.
 *
 * Este archivo simula directamente el bucle de decisión del lado-poll del
 * runner para verificar (b) sin levantar el runtime completo del teammate.
 *
 * CORRECCIÓN (estado heredado incorrecto, corregida en el mismo pase): esta
 * sección decía que la lógica de escaneo real "aún no está portada". Es
 * falso — el ledger `processedRequestIds: Set<string>` y el filtro
 * `!processedRequestIds.has(parsed.requestId)` ya viven, portados, en
 * `runtime/pollForPromptOrShutdown.ts:164,177,254,256,260-261,281`, que
 * `inProcessRunner.ts` (aún no portado) consume vía
 * `waitForNextPromptOrShutdown`. DIVERGENCIA DECLARADA que SÍ se sostiene:
 * `scanForShutdown`, definida más abajo en este archivo, es un espejo local
 * mínimo de ese algoritmo — no una llamada a `pollForPromptOrShutdown.ts` —
 * porque ejercitar el archivo real exigiría el aparato de watch de archivo +
 * AbortSignal de `waitForNextPromptOrShutdown`, que es infraestructura ajena
 * a lo que este test verifica (la semántica de dedup, no el mecanismo de
 * espera). Afirma: un shutdown se entrega la primera vez, y el mismo
 * requestId nunca vuelve a disparar otra entrega, aunque el buzón siga
 * mostrándolo como `read: false`.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import {
  _test_resetSwarmAppRuntime,
  installSwarmAppRuntime,
  SWARM_FUNCTION_BINDINGS,
  SWARM_VALUE_BINDINGS,
} from '../adapters/appRuntime.js'
import {
  createShutdownRequestMessage,
  isShutdownRequest,
  type TeammateMessage,
} from '../mailbox/index.js'

// `isShutdownRequest` camina el binding de runtime de swarm `jsonParse` —
// es el mismo baile que juega todo consumidor de swarm en sus tests. Se
// instala un set mínimo de stubs (todo lanza al usarse salvo jsonParse),
// así que se ejercita el camino REAL de `isShutdownRequest` y cualquier
// drift en su firma aflora aquí.
//
// DIVERGENCIA DECLARADA respecto a la fuente: en vez de copiar a mano la
// lista `REQUIRED_BINDING_KEYS`, se derivan las claves de
// `SWARM_FUNCTION_BINDINGS`/`SWARM_VALUE_BINDINGS` (mismo patrón que
// `mailboxHelpers.test.ts`, `backendRegistry.test.ts` e
// `InProcessTeammateTask.test.ts`).
beforeAll(() => {
  const bindings: Record<string, unknown> = {}
  for (const key of SWARM_FUNCTION_BINDINGS) {
    bindings[key] = (..._args: unknown[]) => {
      throw new Error(
        `llamada inesperada al binding de runtime de swarm "${key}" en el test de entrega de shutdown`,
      )
    }
  }
  for (const key of SWARM_VALUE_BINDINGS) {
    bindings[key] = ''
  }
  Object.assign(bindings, {
    TEAMMATE_MESSAGE_TAG: 'teammate-message',
    ERROR_MESSAGE_USER_ABORT: '',
    BASH_TOOL_NAME: 'Bash',
    SEND_MESSAGE_TOOL_NAME: 'SendMessage',
    TASK_CREATE_TOOL_NAME: 'TaskCreate',
    TASK_GET_TOOL_NAME: 'TaskGet',
    TASK_LIST_TOOL_NAME: 'TaskList',
    TASK_UPDATE_TOOL_NAME: 'TaskUpdate',
    TEAM_CREATE_TOOL_NAME: 'TeamCreate',
    TEAM_DELETE_TOOL_NAME: 'TeamDelete',
    TURN_COMPLETION_VERBS: [],
    SUBAGENT_REJECT_MESSAGE: '',
    SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX: '',
    STOPPED_DISPLAY_MS: 0,
    AGENT_COLORS: ['red', 'blue'],
    CLAUDE_OPUS_4_7_CONFIG: { name: 'test-model' },
    env: {},
    jsonParse: JSON.parse,
    jsonStringify: JSON.stringify,
    sanitizePathComponent: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-'),
    logForDebugging: () => {},
    logError: () => {},
    getErrnoCode: (e: unknown) => (e as NodeJS.ErrnoException | null)?.code,
    errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  })
  installSwarmAppRuntime(bindings)
})

afterAll(() => {
  _test_resetSwarmAppRuntime()
})

type WaitDecision =
  | { type: 'shutdown_request'; requestId: string }
  | { type: 'no_shutdown' }

/**
 * Copia mínima de la lógica de escaneo de
 * `inProcessRunner.ts:waitForNextPromptOrShutdown` (aún no portado a este
 * árbol). Se mantiene chica e inline para que el test verifique el MISMO
 * algoritmo que usará el runner, no un mock-de-un-mock. Si el algoritmo
 * del runner cambia, este helper hay que actualizarlo en el mismo pase —
 * es intencional, el test hace cumplir el contrato.
 */
function scanForShutdown(
  allMessages: ReadonlyArray<TeammateMessage>,
  processedRequestIds: Set<string>,
): WaitDecision {
  for (const m of allMessages) {
    const parsed = isShutdownRequest(m.text)
    if (parsed && !processedRequestIds.has(parsed.requestId)) {
      processedRequestIds.add(parsed.requestId)
      return { type: 'shutdown_request', requestId: parsed.requestId }
    }
  }
  return { type: 'no_shutdown' }
}

function shutdownEntry(requestId: string, read: boolean): TeammateMessage {
  return {
    from: 'team-lead',
    text: JSON.stringify(
      createShutdownRequestMessage({ requestId, from: 'team-lead' }),
    ),
    timestamp: 'x',
    read,
    color: undefined,
  }
}

describe('entrega de shutdown del runner — semántica exactamente-una-vez', () => {
  test('el primer escaneo entrega el shutdown y registra el requestId en el set', () => {
    const inbox = [shutdownEntry('req-1', false)]
    const processed = new Set<string>()

    const decision = scanForShutdown(inbox, processed)
    expect(decision).toEqual({ type: 'shutdown_request', requestId: 'req-1' })
    expect(processed.has('req-1')).toBe(true)
  })

  test('un segundo escaneo con el mismo requestId en el set NO entrega otra vez', () => {
    // Reproduce la forma del bug original: aunque el buzón siga teniendo
    // la entrada de shutdown (o la tenga duplicada), una vez que el
    // runner la entregó, no debe entregarla una segunda vez.
    const inbox = [shutdownEntry('req-1', false)]
    const processed = new Set<string>(['req-1'])

    const decision = scanForShutdown(inbox, processed)
    expect(decision).toEqual({ type: 'no_shutdown' })
  })

  test('que el buzón muestre el shutdown como read=true es irrelevante — igual se entrega', () => {
    // El bug pre-fix: otro lector marcaba el mensaje como leído ANTES de
    // que el runner lo viera. El código viejo filtraba por !m.read, así
    // que el runner lo perdía. El código nuevo NO filtra por `read`;
    // sólo el set processedRequestIds decide.
    const inbox = [shutdownEntry('req-1', /*read*/ true)]
    const processed = new Set<string>()

    const decision = scanForShutdown(inbox, processed)
    expect(decision).toEqual({ type: 'shutdown_request', requestId: 'req-1' })
  })

  test('que el buzón muestre el shutdown como read=true después de la entrega — sigue omitido', () => {
    const inbox = [shutdownEntry('req-1', true)]
    const processed = new Set<string>(['req-1'])

    const decision = scanForShutdown(inbox, processed)
    expect(decision).toEqual({ type: 'no_shutdown' })
  })

  test('4 duplicados del mismo requestId en el buzón → exactamente una entrega', () => {
    // Buzones anteriores al dedup podían seguir teniendo duplicados de
    // estado legacy (o de un escritor de otro proceso que no dedupara).
    // Aun así, el lado runner garantiza entrega exactamente-una-vez
    // gracias a processedRequestIds.
    const inbox = [
      shutdownEntry('req-1', false),
      shutdownEntry('req-1', false),
      shutdownEntry('req-1', false),
      shutdownEntry('req-1', false),
    ]
    const processed = new Set<string>()

    const decision1 = scanForShutdown(inbox, processed)
    expect(decision1.type).toBe('shutdown_request')

    const decision2 = scanForShutdown(inbox, processed)
    const decision3 = scanForShutdown(inbox, processed)
    const decision4 = scanForShutdown(inbox, processed)
    expect(decision2.type).toBe('no_shutdown')
    expect(decision3.type).toBe('no_shutdown')
    expect(decision4.type).toBe('no_shutdown')
  })

  test('un requestId distinto tras el primero se entrega (contratos independientes)', () => {
    const processed = new Set<string>()

    const inbox1 = [shutdownEntry('req-1', false)]
    expect(scanForShutdown(inbox1, processed).type).toBe('shutdown_request')

    const inbox2 = [shutdownEntry('req-1', false), shutdownEntry('req-2', false)]
    const decision = scanForShutdown(inbox2, processed)
    expect(decision).toEqual({ type: 'shutdown_request', requestId: 'req-2' })
  })

  test('sin shutdown en el buzón devuelve no_shutdown sin mutación', () => {
    const inbox: TeammateMessage[] = [
      {
        from: 'team-lead',
        text: 'hello there',
        timestamp: 'x',
        read: false,
      },
    ]
    const processed = new Set<string>()
    expect(scanForShutdown(inbox, processed).type).toBe('no_shutdown')
    expect(processed.size).toBe(0)
  })

  test('processedRequestIds es por-runner — sets separados son independientes', () => {
    // Runners de teammate distintos tienen sets processed separados. El
    // mismo requestId puede entregarse al runner A y al runner B de
    // forma independiente (p. ej. shutdown_request en broadcast a dos
    // teammates).
    const inboxA = [shutdownEntry('broadcast-1', false)]
    const inboxB = [shutdownEntry('broadcast-1', false)]
    const processedA = new Set<string>()
    const processedB = new Set<string>()

    expect(scanForShutdown(inboxA, processedA).type).toBe('shutdown_request')
    expect(scanForShutdown(inboxB, processedB).type).toBe('shutdown_request')
  })
})
