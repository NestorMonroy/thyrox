/**
 * `createProductionDeps` — la fábrica de `AgentDeps` (#263).
 *
 * QUÉ MIDE. Cada uno de los ocho campos que la fábrica devuelve es un
 * ADAPTADOR: envuelve a un paquete hermano y traduce su forma a la del
 * contrato. Un adaptador que devuelve la forma correcta sin llamar a nadie
 * pasa cualquier test de forma — así que estos casos miden el TRÁNSITO:
 * qué entra al hermano y qué sale de él.
 *
 * SU LISTA DE BLOQUEOS ESTABA MAL EN LOS TRES PUNTOS, y se re-mide aquí
 * porque es lo que autoriza el porte:
 *
 *   · «`@thyrox/tool-registry` NO existe — 255 módulos, tarea #234». El
 *     paquete SÍ existe, y `findToolByName` vive en
 *     `src/packages/tool-registry/src/Tool.ts:412`. Lo que se midió fue el
 *     nombre en `dependencies`, no el árbol: la conclusión («bloqueado por
 *     un porte de 255 módulos») no se sigue de esa medición.
 *   · «`handleStopHooks` sigue sin portar». Se portó en #262.
 *   · «`recordTranscript` no existe en `./internal/runtimeBridges.ts`».
 *     Existe, en la línea 87, y delega en el host binding igual que la
 *     fuente.
 *
 * MITAD ROJA: los casos fallan porque `createProductionDeps` no se exporta.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { createProductionDeps } from '../createDeps.ts'
import { installAgentHostBindings } from '../host.ts'

type Llamada = { nombre: string; args: unknown[] }

function herramienta(nombre: string, salida: unknown, alias?: string[]) {
  return {
    name: nombre,
    aliases: alias,
    inputJSONSchema: { type: 'object', properties: { x: { type: 'number' } } },
    userFacingName: () => nombre,
    call: async (input: unknown) =>
      typeof salida === 'function' ? (salida as (i: unknown) => unknown)(input) : salida,
  }
}

function contexto(registro: Llamada[] = []) {
  return {
    abortController: new AbortController(),
    options: { mainLoopModel: 'claude-sonnet-5' },
    getAppState: () => {
      registro.push({ nombre: 'getAppState', args: [] })
      return { toolPermissionContext: { mode: 'default' } }
    },
    setAppState: () => {},
  } as never
}

const permitirTodo = async () => ({ behavior: 'allow' as const })

describe('createProductionDeps', () => {
  beforeEach(() => {
    installAgentHostBindings({ getSessionId: () => 'sesion-de-prueba' })
  })

  test('1. devuelve los OCHO campos del contrato, ninguno ausente', () => {
    // El contrato local declara `compaction` además de los siete que la
    // fuente envuelve en clase; la fuente lo satisface con un objeto en
    // línea. Un porte que se saltara ese campo devolvería algo que NO es
    // un `AgentDeps`, y el hueco sólo se vería al construir el loop.
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    expect(Object.keys(deps).sort()).toEqual([
      'compaction', 'context', 'hooks', 'output',
      'permission', 'provider', 'session', 'tools',
    ])
  })

  test('2. tools.find resuelve por nombre Y por alias', () => {
    // El alias es lo que discrimina: un `find` que comparara sólo `name`
    // pasaría la primera mitad y fallaría la segunda. Es exactamente lo que
    // `findToolByName` aporta sobre un `Array.find` ingenuo.
    const deps = createProductionDeps({
      tools: [herramienta('Echo', 'eco', ['Repetir'])] as never,
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    expect(deps.tools.find('Echo')?.name).toBe('Echo')
    expect(deps.tools.find('Repetir')?.name).toBe('Echo')
    expect(deps.tools.find('NoExiste')).toBeUndefined()
  })

  test('3. tools.list traduce cada herramienta a la forma del contrato', () => {
    const deps = createProductionDeps({
      tools: [herramienta('Echo', 'eco')] as never,
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    const [t] = deps.tools.list()
    expect(t?.name).toBe('Echo')
    // El esquema NO se inventa: sale del `inputJSONSchema` de la herramienta.
    expect((t?.inputSchema as { properties?: unknown })?.properties).toBeDefined()
  })

  test('4. tools.execute LLAMA a la herramienta y le pasa su entrada', async () => {
    // El control del tránsito: se afirma sobre lo que la herramienta RECIBIÓ,
    // no sólo sobre lo que el adaptador devolvió.
    let recibido: unknown
    const deps = createProductionDeps({
      tools: [
        herramienta('Echo', (i: unknown) => {
          recibido = i
          return 'ok'
        }),
      ] as never,
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    const r = await deps.tools.execute(
      { name: 'Echo' } as never,
      { x: 7 },
      { toolUseId: 'u1' } as never,
    )
    expect(recibido).toEqual({ x: 7 })
    expect(r.output).toBe('ok')
  })

  test('5. una herramienta desconocida da error, no una excepción', async () => {
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    const r = await deps.tools.execute(
      { name: 'Fantasma' } as never,
      {},
      { toolUseId: 'u1' } as never,
    )
    expect(r.error).toBe(true)
    expect(String(r.output)).toContain('Fantasma')
  })

  test('6. permission delega en canUseTool y traduce sus tres desenlaces', async () => {
    const decisiones = ['allow', 'deny', 'ask'] as const
    const esperados = [true, false, false]
    for (let i = 0; i < decisiones.length; i++) {
      const deps = createProductionDeps({
        tools: [herramienta('Echo', 'eco')] as never,
        toolUseContext: contexto(),
        canUseTool: (async () => ({ behavior: decisiones[i] })) as never,
      })
      const r = await deps.permission.canUseTool(
        { name: 'Echo' } as never,
        {},
        {} as never,
      )
      expect(r.allowed).toBe(esperados[i]!)
    }
    // `deny` y `ask` NO son el mismo motivo: colapsarlos perdería la
    // distinción entre «el sistema lo prohíbe» y «el usuario no contestó».
    const deps = createProductionDeps({
      tools: [herramienta('Echo', 'eco')] as never,
      toolUseContext: contexto(),
      canUseTool: (async () => ({ behavior: 'ask' })) as never,
    })
    const r = await deps.permission.canUseTool({ name: 'Echo' } as never, {}, {} as never)
    expect(r.reason).not.toBe('Permission denied')
  })

  test('7. output.emit entrega al emisor que se le dio', () => {
    const visto: unknown[] = []
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
      emitFn: e => visto.push(e),
    })
    deps.output.emit({ type: 'x' })
    expect(visto).toEqual([{ type: 'x' }])

    // Y sin emisor NO revienta: la fábrica se usa tambien headless.
    const sinEmisor = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    expect(() => sinEmisor.output.emit({ type: 'x' })).not.toThrow()
  })

  test('8. context devuelve los overrides cuando se le dan', async () => {
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
      contextOverrides: {
        systemPrompt: [{ content: 'un prompt' }],
        userContext: { a: '1' },
        systemContext: { b: '2' },
      },
    })
    expect(deps.context.getSystemPrompt()).toEqual([{ content: 'un prompt' }])
    expect(await deps.context.getUserContext()).toEqual({ a: '1' })
    expect(await deps.context.getSystemContext()).toEqual({ b: '2' })
  })

  test('9. session lee el id del host binding, no lo inventa', () => {
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    expect(deps.session.getSessionId()).toBe('sesion-de-prueba')

    // Sin binding cae a un marcador declarado, no a una cadena vacía que
    // se confundiría con un id real.
    installAgentHostBindings({})
    expect(deps.session.getSessionId()).toBe('unknown')
  })

  test('10. hooks.onStop DRENA el generador de Stop — no lo deja sin correr', async () => {
    // El defecto que la fuente documenta en su propio cuerpo: un `await`
    // sobre un generador no lo itera, asi que el pipeline de Stop nunca
    // corria y los hooks del usuario eran un no-op silencioso. Se mide que
    // el ejecutor SE LLAMA, que es lo unico que separa las dos conductas.
    let llamado = false
    installAgentHostBindings({
      getSessionId: () => 's',
      executeStopHooks: () => {
        llamado = true
        return (async function* () {})()
      },
    } as never)
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
      querySource: 'sdk',
    })
    const r = await deps.hooks.onStop([], {})
    expect(llamado).toBe(true)
    expect(r).toEqual({ blockingErrors: [], preventContinuation: false })
  })

  test('11. compaction es un no-op declarado: devuelve los mensajes intactos', async () => {
    const deps = createProductionDeps({
      tools: [],
      toolUseContext: contexto(),
      canUseTool: permitirTodo as never,
    })
    const mensajes = [{ role: 'user', content: 'hola' }] as never
    const r = await deps.compaction.maybeCompact(mensajes, 100)
    expect(r.compacted).toBe(false)
    expect(r.messages).toBe(mensajes)
  })
})
