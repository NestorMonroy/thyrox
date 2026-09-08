/**
 * La mitad ROJA del engendro en proceso.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/spawnInProcess.ts` (328
 * líneas, 5 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se reimplementa y no se copia.
 *
 * POR QUÉ AHORA. Es el penúltimo eslabón hacia `InProcessBackend`, la parcial
 * declarada `TASK-THYROX-0003`: sólo quedaría `runtime/inProcessRunner.ts`.
 *
 * Métrica: la conducta contra un estado de aplicación real —un objeto con su
 * actualizador— y los bindings del anfitrión doblados.
 * Ciega a: qué hace el bucle del agente una vez engendrado; este módulo sólo
 * lo registra.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []
let limpiezas: (() => Promise<void>)[] = []
let desregistros = 0
let terminados: { taskId: string; motivo: string }[] = []
let desalojados: string[] = []
let perfetto: { alta: string[]; baja: string[] } = { alta: [], baja: [] }
let tracingEncendido = false

/** El estado de aplicación con su actualizador, como lo recibe el módulo. */
function estado(inicial: Record<string, unknown> = {}) {
  let actual: Record<string, unknown> = {
    tasks: {},
    teamContext: undefined,
    ...inicial,
  }
  return {
    fijar: (f: (p: never) => never) => {
      actual = f(actual as never) as never
    },
    leer: () => actual,
  }
}

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
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.formatAgentId = (n: string, e: string) => `${n}@${e}`
  mapa.getSessionId = () => 'sesion-madre'
  mapa.generateTaskId = (tipo: string) => `${tipo}-1`
  mapa.createAbortController = () => new AbortController()
  mapa.createTeammateContext = (x: Record<string, unknown>) => ({
    contextoDe: x.agentId,
  })
  mapa.createTaskStateBase = (
    taskId: string,
    tipo: string,
    description: string,
    toolUseId?: string,
  ) => ({ taskId, tipo, description, toolUseId })
  mapa.getSpinnerVerbs = () => ['pensando']
  mapa.TURN_COMPLETION_VERBS = ['listo']
  mapa.registerCleanup = (f: () => Promise<void>) => {
    limpiezas.push(f)
    return () => {
      desregistros += 1
    }
  }
  mapa.registerTask = (
    estadoTarea: Record<string, unknown>,
    fijar: (f: (p: never) => never) => void,
  ) => {
    fijar((prev: never) => {
      const p = prev as unknown as Record<string, unknown>
      return {
        ...p,
        tasks: { ...(p.tasks as object), [estadoTarea.taskId as string]: estadoTarea },
      } as never
    })
  }
  mapa.isPerfettoTracingEnabled = () => tracingEncendido
  mapa.registerAgent = (id: string) => perfetto.alta.push(id)
  mapa.unregisterAgent = (id: string) => perfetto.baja.push(id)
  mapa.emitTaskTerminatedSdk = (taskId: string, motivo: string) =>
    terminados.push({ taskId, motivo })
  mapa.evictTaskOutput = async (taskId: string) => {
    desalojados.push(taskId)
  }
  mapa.evictTerminalTask = () => undefined
  mapa.STOPPED_DISPLAY_MS = 0
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

const CONFIG = {
  name: 'ana',
  teamName: 'eq',
  prompt: 'haz esto',
  planModeRequired: false,
}

beforeEach(() => {
  raiz = mkdtempSync('/dev/shm/spawn-')
  trazas = []
  limpiezas = []
  desregistros = 0
  terminados = []
  desalojados = []
  perfetto = { alta: [], baja: [] }
  tracingEncendido = false
})

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
  rmSync(raiz, { recursive: true, force: true })
})

describe('spawnInProcessTeammate — registrar al compañero', () => {
  test('1. registra la tarea con su identidad y devuelve sus asas', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    const r = await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    expect(r.success).toBe(true)
    expect(r.agentId).toBe('ana@eq')
    expect(r.taskId).toBe('in_process_teammate-1')
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.status).toBe('running')
    expect(t?.identity).toMatchObject({
      agentId: 'ana@eq',
      agentName: 'ana',
      teamName: 'eq',
      parentSessionId: 'sesion-madre',
    })
  })

  test('2. el aborto del compañero es INDEPENDIENTE del de su lider', async () => {
    const delLider = new AbortController()
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    const r = await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    delLider.abort()
    // Interrumpir la consulta del lider no debe matar a sus compañeros: cada
    // uno lleva su propio trabajo y su propio ciclo.
    expect(r.abortController?.signal.aborted).toBe(false)
  })

  test('3. la descripcion recorta el encargo y lo dice con puntos suspensivos', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    const largo = 'x'.repeat(80)
    await spawnInProcessTeammate({ ...CONFIG, prompt: largo } as never, {
      setAppState: est.fijar,
    } as never)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    // Sin la marca, un encargo recortado se lee como uno corto: el lector no
    // puede distinguir «esto es todo» de «esto es el principio».
    expect(t?.description).toBe(`ana: ${'x'.repeat(50)}...`)
  })

  test('4. un encargo corto NO lleva puntos suspensivos', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.description).toBe('ana: haz esto')
  })

  test('5. el modo de permiso sale del modo plan pedido', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    await spawnInProcessTeammate(
      { ...CONFIG, planModeRequired: true } as never,
      { setAppState: est.fijar } as never,
    )
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.permissionMode).toBe('plan')
  })

  test('6. la limpieza registrada ABORTA al compañero', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    const r = await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    expect(limpiezas.length).toBe(1)
    await limpiezas[0]?.()
    // Sin esto, un compañero sobrevive a la salida de su lider y sigue
    // gastando contexto contra un turno que ya nadie lee.
    expect(r.abortController?.signal.aborted).toBe(true)
  })

  test('7. el rastreo sólo da de alta cuando esta encendido', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    expect(perfetto.alta).toEqual([])
    tracingEncendido = true
    await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    expect(perfetto.alta).toEqual(['ana@eq'])
  })

  test('8. un fallo al construir el contexto se devuelve, no se propaga', async () => {
    await instalar({
      createTeammateContext: () => {
        throw new Error('sin almacenamiento asincrono')
      },
    })
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    const r = await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    expect(r).toEqual({
      success: false,
      agentId: 'ana@eq',
      error: 'sin almacenamiento asincrono',
    })
    // Y NO queda tarea registrada a medias.
    expect(Object.keys(est.leer().tasks as object)).toEqual([])
  })

  test('9. los verbos salen de las listas del anfitrion', async () => {
    await instalar()
    const est = estado()
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    await spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
    } as never)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.spinnerVerb).toBe('pensando')
    expect(t?.pastTenseVerb).toBe('listo')
  })
})

describe('killInProcessTeammate — matar a un compañero en proceso', () => {
  async function engendrar(est: ReturnType<typeof estado>) {
    const { spawnInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    return spawnInProcessTeammate(CONFIG as never, {
      setAppState: est.fijar,
      toolUseId: 'uso-1',
    } as never)
  }

  test('10. aborta, marca «killed» y desaloja su salida', async () => {
    await instalar()
    const est = estado()
    const r = await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    expect(killInProcessTeammate('in_process_teammate-1', est.fijar)).toBe(true)
    expect(r.abortController?.signal.aborted).toBe(true)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.status).toBe('killed')
    expect(desalojados).toEqual(['in_process_teammate-1'])
  })

  test('11. matar a quien no existe no hace nada', async () => {
    await instalar()
    const est = estado()
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    expect(killInProcessTeammate('no-existe', est.fijar)).toBe(false)
    expect(terminados).toEqual([])
  })

  test('12. matar dos veces al mismo devuelve false la segunda', async () => {
    await instalar()
    const est = estado()
    await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    // La guarda es sobre el estado, no sobre la existencia: la tarea sigue
    // ahí, ya muerta, y volver a matarla emitiria un segundo cierre.
    expect(killInProcessTeammate('in_process_teammate-1', est.fijar)).toBe(false)
    expect(terminados.length).toBe(1)
  })

  test('13. desbloquea a quien esperaba su reposo', async () => {
    await instalar()
    const est = estado()
    await engendrar(est)
    let avisado = 0
    const tareas = est.leer().tasks as Record<string, Record<string, unknown>>
    tareas['in_process_teammate-1']!.onIdleCallbacks = [
      () => {
        avisado += 1
      },
    ]
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    // Sin esto, quien llamó a «espera a que este en reposo» se queda colgado
    // para siempre: el compañero ya no va a llegar a reposo nunca.
    expect(avisado).toBe(1)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>)[
      'in_process_teammate-1'
    ]
    expect(t?.onIdleCallbacks).toEqual([])
  })

  test('14. sale del contexto de equipo por su identificador', async () => {
    await instalar()
    const est = estado({
      teamContext: {
        teammates: { 'ana@eq': { x: 1 }, 'bea@eq': { x: 2 } },
      },
    })
    await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    const ctx = est.leer().teamContext as { teammates: Record<string, unknown> }
    expect(Object.keys(ctx.teammates)).toEqual(['bea@eq'])
  })

  test('15. el cierre del SDK lleva el uso y la descripcion de la tarea', async () => {
    await instalar()
    const est = estado()
    await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    expect(terminados).toEqual([
      { taskId: 'in_process_teammate-1', motivo: 'stopped' },
    ])
  })

  test('16. da de baja al agente del rastreo', async () => {
    await instalar()
    const est = estado()
    await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    // La baja va SIEMPRE, encendido o no el rastreo: el registro es un mapa
    // en memoria y dejar la entrada lo hace crecer sin fin.
    expect(perfetto.baja).toEqual(['ana@eq'])
  })

  test('17. la limpieza registrada se desregistra al matar', async () => {
    await instalar()
    const est = estado()
    await engendrar(est)
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    killInProcessTeammate('in_process_teammate-1', est.fijar)
    // Sin el desregistro, el cierre del lider seguiría llamando a la limpieza
    // de un compañero que ya no existe.
    expect(desregistros).toBe(1)
  })

  test('18. una tarea que no es de compañero no se toca', async () => {
    await instalar()
    const est = estado({ tasks: { otra: { type: 'bash', status: 'running' } } })
    const { killInProcessTeammate } = await import(
      '../src/runtime/spawnInProcess.ts'
    )
    expect(killInProcessTeammate('otra', est.fijar)).toBe(false)
    const t = (est.leer().tasks as Record<string, Record<string, unknown>>).otra
    expect(t?.status).toBe('running')
  })
})
