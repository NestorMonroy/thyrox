/**
 * La mitad ROJA del ejecutor de compañero en proceso.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/InProcessBackend.ts` (339
 * líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * reimplementa y no se copia — y **la fuente no tiene test para este módulo**
 * (medido: ningún archivo de `packages/swarm/__tests__` lo importa), así que
 * estos casos son propios, no portados.
 *
 * QUÉ SE MIDE. Los cinco métodos que dependen del contexto tienen la misma
 * forma —rehusar sin él, rehusar sin tarea, y actuar— y las tres costuras con
 * conducta propia son las que llevan anulación:
 *
 * 1. **La guarda de `parseAgentId` en `sendMessage`** — un identificador sin
 *    la forma `agentName@teamName` revienta en vez de escribir en un buzón
 *    inventado. Anulación: quitar el `if (!parsed)` y cae ese caso.
 * 2. **La guarda de `shutdownRequested` en `terminate`** — con una petición ya
 *    en vuelo devuelve `true` y NO escribe una segunda. Anulación: quitar la
 *    guarda y cae el caso que cuenta los escritos.
 * 3. **El `?? true` de `isActive`** — un compañero sin controlador cuenta como
 *    abortado, que es lo conservador. Anulación: cambiarlo a `?? false` y cae
 *    exactamente ese caso.
 *
 * Métrica: la conducta de los seis métodos contra un buzón REAL bajo
 * `/dev/shm`, con los enlaces del anfitrión doblados y un estado de
 * aplicación propio.
 * Ciega a: `spawn()` más allá de su guarda de contexto — lo que hay detrás es
 * `spawnInProcessTeammate` y el bucle del agente, que tienen su propio test y
 * cuyo camino feliz exige el anfitrión entero. Y ciega al camino feliz de
 * `kill()`: `killInProcessTeammate` dispara trabajo que NO se puede esperar
 * —`void removeMemberByAgentId(...)` y un `setTimeout(evictTerminalTask, …)`—
 * y esas dos llamadas aterrizan DESPUÉS de que el caso termine, con los
 * enlaces del anfitrión ya retirados. Medido: el archivo entero moría con
 * «Swarm runtime binding "lock" is unavailable». Lo que sí se mide es el paso
 * a través del ayudante (caso 13), con la tarea en un estado que lo hace
 * rehusar sin efectos.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []

/** El estado de la aplicación de este archivo, con su contador de escrituras. */
function estado(inicial: Record<string, unknown>) {
  let actual: Record<string, unknown> = { tasks: inicial }
  return {
    leer: () => actual,
    fijar: (f: (p: Record<string, unknown>) => Record<string, unknown>) => {
      actual = f(actual)
    },
  }
}

/** Instala los enlaces del anfitrión con los dobles que este archivo necesita. */
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
  mapa.sleep = () => Promise.resolve()
  // `agentName@teamName` — la única forma que el buzón sabe direccionar.
  mapa.parseAgentId = (id: string) => {
    const i = id.indexOf('@')
    if (i <= 0 || i === id.length - 1) return null
    return { agentName: id.slice(0, i), teamName: id.slice(i + 1) }
  }
  // `requestTeammateShutdown` no llama al `updateTaskState` de su módulo: usa
  // el ENLACE del anfitrión, que por defecto no tiene efecto. Sin esta
  // implementación la marca nunca aterriza y el caso mediría el doble.
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

  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

/** Una tarea de compañero en el estado, con lo que los seis métodos leen. */
function tarea(encima: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 't-1',
    type: 'in_process_teammate',
    status: 'running',
    shutdownRequested: false,
    identity: {
      agentId: 'ana@eq',
      agentName: 'ana',
      teamName: 'eq',
      planModeRequired: false,
      parentSessionId: 'ses-1',
    },
    ...encima,
  }
}

/** Lee el buzón real que el método bajo prueba acaba de escribir. */
function buzon(agente = 'ana', equipo = 'eq'): { from: string; text: string }[] {
  const ruta = join(raiz, 'teams', equipo, 'inboxes', `${agente}.json`)
  return JSON.parse(readFileSync(ruta, 'utf-8'))
}

describe('InProcessBackend', () => {
  beforeEach(() => {
    raiz = mkdtempSync('/dev/shm/backend-')
    trazas = []
  })

  afterEach(async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m._test_resetSwarmAppRuntime()
    rmSync(raiz, { recursive: true, force: true })
  })

  test('1. está disponible sin depender de nada externo', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    expect(await createInProcessBackend().isAvailable()).toBe(true)
  })

  test('2. sin contexto, spawn REHÚSA nombrando setContext', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const r = await createInProcessBackend().spawn({
      name: 'ana',
      teamName: 'eq',
      prompt: 'hola',
      cwd: raiz,
      parentSessionId: 'ses-1',
    })
    expect(r.success).toBe(false)
    // El identificador se compone igual: quien recibe el fallo sabe de quién es.
    expect(r.agentId).toBe('ana@eq')
    expect(r.error).toContain('setContext()')
  })

  test('3. sendMessage escribe en el buzón del destinatario', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    await createInProcessBackend().sendMessage('ana@eq', {
      text: 'revisa el informe',
      from: 'team-lead',
    })
    const mensajes = buzon()
    expect(mensajes.length).toBe(1)
    expect(mensajes[0]?.from).toBe('team-lead')
    expect(mensajes[0]?.text).toBe('revisa el informe')
    // El sello de tiempo se pone si no viene: el buzón lo ordena por él.
    expect(mensajes[0]).toHaveProperty('timestamp')
  })

  test('4. sendMessage con un identificador sin equipo REVIENTA', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    // Sin la guarda, `parsed` sería `null` y el destinatario se compondría de
    // `undefined` — un buzón inventado que nadie lee.
    await expect(
      createInProcessBackend().sendMessage('ana', {
        text: 'x',
        from: 'team-lead',
      }),
    ).rejects.toThrow('Invalid agentId format')
  })

  test('5. sin contexto, los cuatro métodos de estado devuelven false', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const b = createInProcessBackend()
    expect(await b.terminate('ana@eq')).toBe(false)
    expect(await b.kill('ana@eq')).toBe(false)
    expect(await b.isActive('ana@eq')).toBe(false)
  })

  test('6. sin tarea en el estado, terminate y kill devuelven false', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const st = estado({})
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)
    expect(await b.terminate('ana@eq')).toBe(false)
    expect(await b.kill('ana@eq')).toBe(false)
    expect(await b.isActive('ana@eq')).toBe(false)
  })

  test('7. terminate escribe la petición de apagado y marca la tarea', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const st = estado({ 't-1': tarea() })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)

    expect(await b.terminate('ana@eq', 'se acabó el trabajo')).toBe(true)

    const mensajes = buzon()
    expect(mensajes.length).toBe(1)
    expect(mensajes[0]?.from).toBe('team-lead')
    const cuerpo = JSON.parse(mensajes[0]?.text ?? '{}')
    expect(cuerpo.type).toBe('shutdown_request')
    expect(cuerpo.reason).toBe('se acabó el trabajo')
    // Y la tarea queda marcada: la segunda llamada ya no negocia.
    const t = (st.leer().tasks as Record<string, { shutdownRequested: boolean }>)['t-1']
    expect(t?.shutdownRequested).toBe(true)
  })

  test('8. con una petición en vuelo, terminate NO escribe una segunda', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const st = estado({ 't-1': tarea({ shutdownRequested: true }) })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)

    // Devuelve `true` porque el apagado ESTÁ pedido, que es lo que el llamador
    // quería — no porque esta llamada haya hecho algo.
    expect(await b.terminate('ana@eq')).toBe(true)
    expect(() => buzon()).toThrow()
  })

  test('9. isActive: corriendo y sin abortar', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const st = estado({ 't-1': tarea({ abortController: new AbortController() }) })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)
    expect(await b.isActive('ana@eq')).toBe(true)
  })

  test('10. isActive: corriendo pero abortado', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const c = new AbortController()
    c.abort()
    const st = estado({ 't-1': tarea({ abortController: c }) })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)
    expect(await b.isActive('ana@eq')).toBe(false)
  })

  test('11. isActive: sin controlador cuenta como abortado', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    // Es el `?? true`: un compañero cuyo controlador se perdió no se puede
    // gobernar, así que no se declara vivo.
    const st = estado({ 't-1': tarea() })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)
    expect(await b.isActive('ana@eq')).toBe(false)
  })

  test('12. isActive: en estado terminal, aunque no esté abortado', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    const st = estado({
      't-1': tarea({ status: 'completed', abortController: new AbortController() }),
    })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)
    expect(await b.isActive('ana@eq')).toBe(false)
  })

  test('13. kill sobre una tarea ya terminal devuelve lo que el ayudante decide', async () => {
    await instalar()
    const { createInProcessBackend } = await import(
      '../src/backends/InProcessBackend.ts'
    )
    // La tarea SÍ se encuentra —no es el caso 6— y aun así devuelve `false`:
    // `killInProcessTeammate` rehúsa por el estado. Es lo que distingue el
    // paso a través del ayudante de la guarda de «no la encontré».
    const c = new AbortController()
    const st = estado({ 't-1': tarea({ status: 'killed', abortController: c }) })
    const b = createInProcessBackend()
    b.setContext({ getAppState: st.leer, setAppState: st.fijar } as never)

    expect(await b.kill('ana@eq')).toBe(false)
    // Y no lo aborta: matar dos veces emitiría un segundo cierre.
    expect(c.signal.aborted).toBe(false)
  })
})
