/**
 * Tests de los helpers de mensajes de buzón — mensajes JSON entre agentes
 * del equipo.
 *
 * Procedencia: `ccnmt: packages/swarm/src/__tests__/mailboxHelpers.test.ts`
 * (257 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el
 * cuerpo se **reimplementa** y no se copia; la lógica de aserciones se
 * conserva porque fija el contrato observable, no el texto protegido.
 *
 * Discriminar mal el tipo = el líder interpreta el pedido de permiso de
 * herramienta de un worker como una notificación de idle (o viceversa) y el
 * worker se queda esperando una respuesta para siempre.
 *
 * `formatTeammateMessages` produce el envoltorio XML que aparece en el
 * prompt del líder — escapar mal significa que el texto de un worker que
 * contenga `</teammate-message>` puede cerrar el envoltorio antes de tiempo
 * y confundir al modelo.
 *
 * DIVERGENCIA DECLARADA: la fuente enumera manualmente sus 124 claves de
 * binding requeridas en un array `REQUIRED_BINDING_KEYS`. Aquí se reusan
 * `SWARM_FUNCTION_BINDINGS`/`SWARM_VALUE_BINDINGS` (exportados por
 * `adapters/appRuntime.ts`) en vez de copiar la lista a mano — mismo patrón
 * que `backendRegistry.test.ts` y `InProcessTeammateTask.test.ts`: evita que
 * este archivo quede desalineado si el adaptador gana o pierde un binding.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  _test_resetSwarmAppRuntime,
  installSwarmAppRuntime,
  SWARM_FUNCTION_BINDINGS,
  SWARM_VALUE_BINDINGS,
} from '../adapters/appRuntime.js'
import {
  createIdleNotification,
  formatTeammateMessages,
  isIdleNotification,
  isPermissionRequest,
  isPermissionResponse,
} from '../mailbox/index.js'

/**
 * Dos etapas de bindings distintas se ejercitan aquí:
 *   1. Las suites "sin bindings reales" fijan el camino de fallo de
 *      `is*Notification`/`is*Permission*` — ESPERAN que la ausencia del
 *      binding lance, se atrape y devuelva null.
 *   2. `createIdleNotification` y `formatTeammateMessages` necesitan
 *      valores reales (`TEAMMATE_MESSAGE_TAG`, etc.) para operar.
 * Se instalan bindings mínimos aquí; los stubs de función lanzan al
 * tocarse (con su propio nombre en el mensaje), así que una suite que NO
 * necesita un binding específico y no lo toca no se ve afectada.
 */
function installFullBindings(): void {
  const bindings: Record<string, unknown> = {}
  for (const key of SWARM_FUNCTION_BINDINGS) {
    bindings[key] = (..._args: unknown[]) => {
      throw new Error(
        `llamada inesperada al binding de runtime de swarm "${key}" en el test de mailboxHelpers`,
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
    // jsonParse/jsonStringify son bindings de FUNCIÓN (el genérico de
    // arriba les asigna un stub que lanza) y protocolMessages.ts los
    // invoca de verdad al crear/leer notificaciones.
    jsonParse: JSON.parse,
    jsonStringify: JSON.stringify,
  })
  installSwarmAppRuntime(bindings)
}

beforeAll(() => {
  installFullBindings()
})

afterAll(() => {
  _test_resetSwarmAppRuntime()
})

describe('createIdleNotification — forma del mensaje', () => {
  test('la llamada mínima (solo agentId) produce una notificación válida', () => {
    const m = createIdleNotification('worker-1')
    expect(m.type).toBe('idle_notification')
    expect(m.from).toBe('worker-1')
    expect(typeof m.timestamp).toBe('string')
    // Da la vuelta completa por Date sin perder precisión
    expect(new Date(m.timestamp).toISOString()).toBe(m.timestamp)
  })

  test('con todas las opciones: cada campo fluye a través', () => {
    const m = createIdleNotification('w1', {
      idleReason: 'failed',
      summary: 'config sync failed',
      completedTaskId: 't1',
      completedStatus: 'failed',
      failureReason: 'timeout',
    })
    expect(m.idleReason).toBe('failed')
    expect(m.summary).toBe('config sync failed')
    expect(m.completedTaskId).toBe('t1')
    expect(m.completedStatus).toBe('failed')
    expect(m.failureReason).toBe('timeout')
  })

  test('con opciones parciales: los campos omitidos quedan undefined', () => {
    const m = createIdleNotification('w1', { idleReason: 'available' })
    expect(m.idleReason).toBe('available')
    expect(m.summary).toBeUndefined()
    expect(m.completedTaskId).toBeUndefined()
  })
})

describe('isIdleNotification — validación de entrada', () => {
  test('texto no-JSON → null (el error de parseo se atrapa en silencio)', () => {
    expect(isIdleNotification('not json')).toBeNull()
  })

  test('string vacío → null', () => {
    expect(isIdleNotification('')).toBeNull()
  })

  test('JSON de otro tipo → null', () => {
    // Fija el comportamiento del discriminador de tipo: un JSON parseable
    // que NO es una notificación de idle debe devolver null, no lanzar.
    expect(
      isIdleNotification(
        JSON.stringify({ type: 'permission_request', request_id: 'r1' }),
      ),
    ).toBeNull()
  })

  test('JSON válido de notificación de idle → parseado', () => {
    const json = JSON.stringify(createIdleNotification('w1'))
    expect(isIdleNotification(json)?.from).toBe('w1')
  })
})

describe('isPermissionRequest / isPermissionResponse — validación de entrada', () => {
  test('no-JSON → null para ambos checks (sin lanzar)', () => {
    expect(isPermissionRequest('not json')).toBeNull()
    expect(isPermissionResponse('not json')).toBeNull()
  })

  test('string vacío → null', () => {
    expect(isPermissionRequest('')).toBeNull()
    expect(isPermissionResponse('')).toBeNull()
  })

  test('JSON de tipo no relacionado → null', () => {
    const json = JSON.stringify({
      type: 'idle_notification',
      from: 'a',
      timestamp: 'x',
    })
    expect(isPermissionRequest(json)).toBeNull()
    expect(isPermissionResponse(json)).toBeNull()
  })
})

describe('formatTeammateMessages — envoltorio XML', () => {
  test('lista vacía → string vacío', () => {
    expect(formatTeammateMessages([])).toBe('')
  })

  test('un mensaje se envuelve en la etiqueta con atributo teammate_id', () => {
    const result = formatTeammateMessages([
      { from: 'alice', text: 'hello', timestamp: '2026-04-30T00:00:00Z' },
    ])
    expect(result).toContain('teammate_id="alice"')
    expect(result).toContain('hello')
    expect(result).toMatch(/^<teammate-message[^>]*>\nhello\n<\/teammate-message>$/)
  })

  test('el atributo color se incluye cuando está presente', () => {
    const result = formatTeammateMessages([
      {
        from: 'a',
        text: 'x',
        timestamp: 'now',
        color: 'red',
      },
    ])
    expect(result).toContain('color="red"')
  })

  test('el atributo summary se incluye cuando está presente', () => {
    const result = formatTeammateMessages([
      { from: 'a', text: 'x', timestamp: 'now', summary: 'short' },
    ])
    expect(result).toContain('summary="short"')
  })

  test('varios mensajes se unen con doble salto de línea', () => {
    const result = formatTeammateMessages([
      { from: 'a', text: 'one', timestamp: 'now' },
      { from: 'b', text: 'two', timestamp: 'now' },
    ])
    const parts = result.split('\n\n')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('one')
    expect(parts[1]).toContain('two')
  })

  test('el contenido de texto NO se escapa — `</teammate-message>` en el cuerpo cerraría antes de tiempo', () => {
    // LIMITACIÓN DOCUMENTADA: el formateador no escapa HTML del texto del
    // cuerpo. Un worker que emita "</teammate-message>" cierra el
    // envoltorio antes de tiempo. Quien llame debe sanear antes de pasar
    // el texto a esta función, o confiar en los workers (que es el
    // default actual).
    const result = formatTeammateMessages([
      { from: 'a', text: '</teammate-message>', timestamp: 'now' },
    ])
    // Documenta la salida sin escapar. Si algún día se añade escapado,
    // este test falla y fuerza una actualización deliberada.
    expect(result).toContain('</teammate-message>\n</teammate-message>')
  })
})
