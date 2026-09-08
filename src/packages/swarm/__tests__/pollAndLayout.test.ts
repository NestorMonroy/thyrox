/**
 * La mitad ROJA del sondeo de reposo y de la fachada de disposición.
 *
 * Procedencia: `ccnmt: packages/swarm/src/{runtime/pollForPromptOrShutdown.ts,
 * core/teammateLayoutManager.ts}` (370 + 77 líneas). Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * POR QUÉ ESTOS DOS AHORA. `teammateLayoutManager` colgaba de
 * `backends/registry.ts`, que aterrizó en el commit anterior;
 * `pollForPromptOrShutdown` no tiene un solo import externo al paquete y es
 * lo último que separa a `runtime/inProcessRunner.ts` —y con él a
 * `InProcessBackend`, la parcial declarada `TASK-THYROX-0003`—.
 *
 * Métrica: la conducta del bucle de sondeo contra un buzón REAL bajo
 * `/dev/shm` y una lista de tareas doblada.
 * Ciega a: el reloj — el sondeo espera con un `sleep` doblado, así que estos
 * casos no miden nada sobre su cadencia real.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []
let dormidas: number[] = []
let tareas: Record<string, unknown>[] = []
let reclamos: { lista: string; id: string; quien: string }[] = []
let actualizaciones: { id: string; parche: Record<string, unknown> }[] = []
let reclamoConcede = true

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = (s: string) => trazas.push(s)
  mapa.logError = () => undefined
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.sanitizePathComponent = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-')
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.sleep = (ms: number) => {
    dormidas.push(ms)
    return Promise.resolve()
  }
  mapa.getTeamName = () => 'eq'
  mapa.getAgentName = () => undefined
  mapa.getTeammateColor = () => 'blue'
  mapa.generateRequestId = (t: string, d: string) => `${t}-${d}-1`
  mapa.execFileNoThrow = async () => ({ code: 0, stdout: '', stderr: '' })
  mapa.getGlobalConfig = () => ({})
  mapa.getPlatform = () => 'linux'
  mapa.getIsNonInteractiveSession = () => false
  mapa.listTasks = async () => tareas
  mapa.claimTask = async (lista: string, id: string, quien: string) => {
    reclamos.push({ lista, id, quien })
    return reclamoConcede
      ? { success: true }
      : { success: false, reason: 'ya reclamada' }
  }
  mapa.updateTask = async (
    _lista: string,
    id: string,
    parche: Record<string, unknown>,
  ) => {
    actualizaciones.push({ id, parche })
  }
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

function sembrar(mensajes: unknown[], agente = 'ana', equipo = 'eq'): void {
  mkdirSync(join(raiz, 'teams', equipo, 'inboxes'), { recursive: true })
  writeFileSync(
    join(raiz, 'teams', equipo, 'inboxes', `${agente}.json`),
    JSON.stringify(mensajes),
    'utf-8',
  )
}

function msg(de: string, texto: string, extra: Record<string, unknown> = {}) {
  return {
    from: de,
    text: texto,
    timestamp: '2026-01-01T00:00:00Z',
    read: false,
    ...extra,
  }
}

function apagado(requestId: string, de = 'team-lead') {
  return msg(
    de,
    // El `timestamp` es OBLIGATORIO en el esquema: sin el, `isShutdownRequest`
    // devuelve null y el mensaje pasa por uno normal.
    JSON.stringify({
      type: 'shutdown_request',
      requestId,
      from: de,
      timestamp: '2026-01-01T00:00:00Z',
    }),
  )
}

const IDENTIDAD = { agentName: 'ana', teamName: 'eq' }

/** Un estado de aplicación con su actualizador, como el que el bucle recibe. */
function estado(inicial: Record<string, unknown> = {}) {
  let actual = { tasks: inicial } as Record<string, unknown>
  return {
    obtener: () => actual as never,
    fijar: (f: (p: never) => never) => {
      actual = f(actual as never) as never
    },
    leer: () => actual,
  }
}

beforeEach(async () => {
  // El cache de deteccion es de MODULO, y `bun test` corre los archivos de
  // la suite en un solo proceso: sin este borrado, un caso de otro archivo
  // que dejo `TERM_PROGRAM` puesto decide la rama que se toma aqui.
  delete process.env.TERM_PROGRAM
  delete process.env.ITERM_SESSION_ID
  const d = await import('../src/backends/detection.ts')
  d.resetDetectionCache()
  const r = await import('../src/backends/registry.ts')
  r.resetBackendDetection()
  raiz = mkdtempSync('/dev/shm/poll-')
  trazas = []
  dormidas = []
  tareas = []
  reclamos = []
  actualizaciones = []
  reclamoConcede = true
})

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
  rmSync(raiz, { recursive: true, force: true })
})

describe('tryClaimNextTask — reclamar de la lista del equipo', () => {
  test('1. una tarea bloqueada por otra sin cerrar NO se reclama', async () => {
    tareas = [
      { id: '1', status: 'pending', blockedBy: [], owner: 'bea' },
      { id: '2', status: 'pending', blockedBy: ['1'] },
    ]
    await instalar()
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    // La #1 tiene dueño y la #2 la bloquea: reclamar la #2 pondría a dos
    // compañeros a trabajar sobre una dependencia que aún no existe.
    expect(await tryClaimNextTask('lista', 'ana')).toBeUndefined()
    expect(reclamos.length).toBe(0)
  })

  test('2. una bloqueada por una YA cerrada sí se reclama', async () => {
    tareas = [
      { id: '1', status: 'completed', blockedBy: [] },
      { id: '2', status: 'pending', blockedBy: ['1'], subject: 'seguir' },
    ]
    await instalar()
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    const prompt = await tryClaimNextTask('lista', 'ana')
    // El bloqueo se mide contra las tareas SIN CERRAR, no contra la lista
    // entera: si no, una dependencia cumplida bloquearía para siempre.
    expect(prompt).toContain('#2')
    expect(prompt).toContain('seguir')
    expect(reclamos).toEqual([{ lista: 'lista', id: '2', quien: 'ana' }])
  })

  test('3. reclamar y marcar en curso son DOS pasos', async () => {
    tareas = [{ id: '7', status: 'pending', blockedBy: [], subject: 'x' }]
    await instalar()
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    await tryClaimNextTask('lista', 'ana')
    // Sin el segundo, la interfaz seguiría mostrando la tarea como pendiente
    // mientras alguien ya la está haciendo.
    expect(actualizaciones).toEqual([
      { id: '7', parche: { status: 'in_progress' } },
    ])
  })

  test('4. un reclamo denegado no marca nada ni devuelve prompt', async () => {
    tareas = [{ id: '7', status: 'pending', blockedBy: [], subject: 'x' }]
    reclamoConcede = false
    await instalar()
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    expect(await tryClaimNextTask('lista', 'ana')).toBeUndefined()
    expect(actualizaciones.length).toBe(0)
  })

  test('5. un fallo de la lista no revienta el bucle de reposo', async () => {
    await instalar({
      listTasks: async () => {
        throw new Error('la lista no responde')
      },
    })
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    // El sondeo llama a esto en CADA vuelta: una excepción que sube mata al
    // compañero por un fallo transitorio de la lista.
    expect(await tryClaimNextTask('lista', 'ana')).toBeUndefined()
  })

  test('6. la descripción entra en el prompt cuando la hay', async () => {
    tareas = [
      { id: '7', status: 'pending', blockedBy: [], subject: 'x', description: 'el detalle' },
    ]
    await instalar()
    const { tryClaimNextTask } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    expect(await tryClaimNextTask('lista', 'ana')).toContain('el detalle')
  })
})

describe('waitForNextPromptOrShutdown — el orden de prioridad', () => {
  async function esperar(
    ctx: AbortController,
    est: ReturnType<typeof estado>,
    procesados = new Set<string>(),
  ) {
    const { waitForNextPromptOrShutdown } = await import(
      '../src/runtime/pollForPromptOrShutdown.ts'
    )
    return waitForNextPromptOrShutdown(
      IDENTIDAD as never,
      ctx,
      'tarea-1',
      est.obtener,
      est.fijar as never,
      'lista',
      procesados,
    )
  }

  test('7. un mensaje en memoria gana a todo, y se consume', async () => {
    sembrar([apagado('r1')])
    await instalar()
    const est = estado({
      'tarea-1': {
        type: 'in_process_teammate',
        pendingUserMessages: ['escribe esto', 'y esto'],
      },
    })
    const r = await esperar(new AbortController(), est)
    expect(r).toEqual({ type: 'new_message', message: 'escribe esto', from: 'user' })
    // Consumirlo es la mitad que importa: sin sacarlo de la cola, la vuelta
    // siguiente devuelve el mismo mensaje para siempre.
    const t = est.leer().tasks as Record<string, { pendingUserMessages: string[] }>
    expect(t['tarea-1']?.pendingUserMessages).toEqual(['y esto'])
  })

  test('8. un apagado gana a los mensajes normales que lo preceden', async () => {
    sembrar([msg('bea', 'hola'), msg('cal', 'oye'), apagado('r1')])
    await instalar()
    const r = await esperar(new AbortController(), estado())
    // Sin la prioridad, una avalancha de mensajes entre pares deja al
    // compañero sin ver nunca la petición de apagado.
    expect(r.type).toBe('shutdown_request')
  })

  test('9. el apagado se entrega UNA vez por proceso', async () => {
    sembrar([apagado('r1')])
    await instalar()
    const procesados = new Set<string>()
    const primero = await esperar(new AbortController(), estado(), procesados)
    expect(primero.type).toBe('shutdown_request')
    expect(procesados.has('r1')).toBe(true)

    // La segunda vuelta ve el MISMO archivo —el `read` puede haberlo tocado
    // cualquiera— y el registro en memoria es lo único autoritativo.
    sembrar([apagado('r1')])
    const ctx = new AbortController()
    ctx.abort()
    const segundo = await esperar(ctx, estado(), procesados)
    expect(segundo.type).toBe('aborted')
  })

  test('10. el apagado se ve aunque el mensaje esté marcado como leído', async () => {
    sembrar([apagado('r1')])
    const ruta = join(raiz, 'teams', 'eq', 'inboxes', 'ana.json')
    const leidos = JSON.parse(require('node:fs').readFileSync(ruta, 'utf-8'))
    leidos[0].read = true
    writeFileSync(ruta, JSON.stringify(leidos), 'utf-8')
    await instalar()
    // El `read` lo escribe cualquier lector del archivo —incluido el
    // generador de adjuntos— y filtrarlo por ahí fue la causa del compañero
    // que se quedaba colgado tras cuatro peticiones de apagado.
    const r = await esperar(new AbortController(), estado())
    expect(r.type).toBe('shutdown_request')
  })

  test('11. el líder gana a un par, aunque llegue después', async () => {
    sembrar([msg('bea', 'de un par'), msg('team-lead', 'del lider')])
    await instalar()
    const r = await esperar(new AbortController(), estado())
    // El líder representa la intención del usuario: dejarlo detrás de la
    // charla entre pares lo mata de inanición.
    expect(r).toMatchObject({ type: 'new_message', from: 'team-lead' })
  })

  test('12. entre pares, el orden es el de llegada', async () => {
    sembrar([msg('bea', 'primero'), msg('cal', 'segundo')])
    await instalar()
    const r = await esperar(new AbortController(), estado())
    expect(r).toMatchObject({ from: 'bea', message: 'primero' })
  })

  test('13. un mensaje entregado queda marcado como leído', async () => {
    sembrar([msg('bea', 'hola')])
    await instalar()
    await esperar(new AbortController(), estado())
    const ruta = join(raiz, 'teams', 'eq', 'inboxes', 'ana.json')
    const tras = JSON.parse(require('node:fs').readFileSync(ruta, 'utf-8'))
    // Sin marcarlo, la vuelta siguiente lo entrega otra vez.
    expect(tras[0].read).toBe(true)
  })

  test('14. sin nada que hacer, reclama una tarea de la lista', async () => {
    sembrar([])
    tareas = [{ id: '3', status: 'pending', blockedBy: [], subject: 'auditar' }]
    await instalar()
    const r = await esperar(new AbortController(), estado())
    expect(r).toMatchObject({ type: 'new_message', from: 'task-list' })
    expect(r).toHaveProperty('message', expect.stringContaining('auditar'))
  })

  test('15. abortado antes de empezar, no toca el buzón', async () => {
    sembrar([msg('bea', 'hola')])
    await instalar()
    const ctx = new AbortController()
    ctx.abort()
    expect(await esperar(ctx, estado())).toEqual({ type: 'aborted' })
    const ruta = join(raiz, 'teams', 'eq', 'inboxes', 'ana.json')
    const tras = JSON.parse(require('node:fs').readFileSync(ruta, 'utf-8'))
    expect(tras[0].read).toBe(false)
  })

  test('16. la PRIMERA vuelta no espera', async () => {
    sembrar([msg('bea', 'hola')])
    await instalar()
    await esperar(new AbortController(), estado())
    // Dormir antes de la primera lectura añade medio segundo de latencia a
    // cada mensaje, incluidos los que ya estaban esperando.
    expect(dormidas).toEqual([])
  })

  test('17. un buzón ilegible no rompe la vuelta: sigue con la lista', async () => {
    mkdirSync(join(raiz, 'teams', 'eq', 'inboxes'), { recursive: true })
    writeFileSync(
      join(raiz, 'teams', 'eq', 'inboxes', 'ana.json'),
      'esto no es json',
      'utf-8',
    )
    tareas = [{ id: '3', status: 'pending', blockedBy: [], subject: 'auditar' }]
    await instalar()
    const r = await esperar(new AbortController(), estado())
    expect(r).toMatchObject({ from: 'task-list' })
  })
})

describe('teammateLayoutManager — la fachada sobre el respaldo detectado', () => {
  test('18. reexporta los ayudantes de color de su nuevo hogar', async () => {
    await instalar()
    const l = await import('../src/core/teammateLayoutManager.ts')
    const c = await import('../src/core/teammateColors.ts')
    // La reexportación es compatibilidad hacia atrás declarada: el color se
    // mudó a `teammateColors` para romper un ciclo de tres archivos.
    expect(l.assignTeammateColor).toBe(c.assignTeammateColor)
    expect(l.getTeammateColor).toBe(c.getTeammateColor)
    expect(l.clearTeammateColors).toBe(c.clearTeammateColors)
  })

  test('19. cada operación delega en el respaldo que la deteccion eligio', async () => {
    await instalar()
    const reg = await import('../src/backends/registry.ts')
    reg.resetBackendDetection()
    const llamadas: { metodo: string; args: unknown[] }[] = []
    class Falso {
      readonly type = 'tmux'
      async createTeammatePaneInSwarmView(...args: unknown[]) {
        llamadas.push({ metodo: 'crear', args })
        return { paneId: '%3', isFirstTeammate: true }
      }
      async enablePaneBorderStatus(...args: unknown[]) {
        llamadas.push({ metodo: 'borde', args })
      }
      async sendCommandToPane(...args: unknown[]) {
        llamadas.push({ metodo: 'enviar', args })
      }
      async isAvailable() {
        return true
      }
    }
    // La carga de los respaldos va ANTES de registrar el doble: `ensure`
    // importa los modulos reales, y cada uno se registra a si mismo al
    // cargarse — pisando lo que hubiera. Registrar primero seria registrar
    // para nada.
    await reg.ensureBackendsRegistered()
    reg.registerTmuxBackend(Falso as never)
    const l = await import('../src/core/teammateLayoutManager.ts')
    expect(await l.createTeammatePaneInSwarmView('ana', 'blue')).toEqual({
      paneId: '%3',
      isFirstTeammate: true,
    })
    await l.enablePaneBorderStatus('ses:0', true)
    await l.sendCommandToPane('%3', 'echo', true)
    expect(llamadas.map(c => c.metodo)).toEqual(['crear', 'borde', 'enviar'])
    // Las banderas viajan tal cual: la fachada no reinterpreta el socket.
    expect(llamadas[1]?.args).toEqual(['ses:0', true])
    expect(llamadas[2]?.args).toEqual(['%3', 'echo', true])
    reg.resetBackendDetection()
  })
})
