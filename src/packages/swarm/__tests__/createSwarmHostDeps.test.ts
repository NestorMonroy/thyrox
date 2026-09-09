/**
 * La mitad ROJA de `createSwarmHostDeps` — la fábrica de dependencias de
 * anfitrión de swarm.
 *
 * Procedencia: `ccnmt: packages/swarm/src/adapters/createSwarmHostDeps.ts`
 * (323 líneas, 1 export). Ese árbol declara `"license": "UNLICENSED"`: el
 * cuerpo se reimplementa, no se copia. Lo que sí se deriva de la fuente es el
 * CONTRATO —qué superficies compone, en qué orden gana el override, y cómo
 * colapsa el estado de una tarea—, porque eso no es texto: es la forma.
 *
 * POR QUÉ ESTE MÓDULO Y NO OTRO. De los cinco que quedaban del porte sin
 * interfaz, éste es el único sin dependencia hacia los otros cuatro: sus
 * aristas externas son `node:fs` y `node:fs/promises`. Medido: los 12 símbolos
 * que pide a `appRuntime` y los 16 tipos que pide a `types/deps` están los 28.
 *
 * QUÉ SE MIDE: el MECANISMO de composición —el default, el override parcial
 * que gana sobre él, la pereza de los bindings, y las dos guardas— y no las 16
 * superficies una a una con su cuerpo. Enumerar cada método sería transcribir
 * el contrato dos veces.
 * Ciega a: si el cuerpo de cada default hace lo que su nombre promete cuando el
 * anfitrión real lo llama. Eso se mide al portar cada consumidor, no aquí.
 */
import { afterEach, describe, expect, test } from 'bun:test'

const RUTA = '../src/adapters/createSwarmHostDeps.ts'
const RUTA_RUNTIME = '../src/adapters/appRuntime.ts'

afterEach(async () => {
  const { _test_resetSwarmAppRuntime } = await import(RUTA_RUNTIME)
  _test_resetSwarmAppRuntime()
})

/**
 * Un mapa COMPLETO con lo que estos casos necesitan encima.
 *
 * `installSwarmAppRuntime` resuelve los bindings de VALOR con avidez, así que
 * un mapa parcial revienta al instalar aunque su docstring diga que es válido
 * — medido: `TEAMMATE_MESSAGE_TAG` lanza antes de llegar a lo que este archivo
 * toca. Se construye desde las listas que el propio módulo exporta, igual que
 * `appRuntime.test.ts`: enumerar los nombres aquí copiaría el contrato dos
 * veces y la copia se pudriría en silencio.
 */
async function installBindings(
  encima: Record<string, unknown> = {},
): Promise<void> {
  const {
    installSwarmAppRuntime,
    SWARM_FUNCTION_BINDINGS,
    SWARM_VALUE_BINDINGS,
  } = await import(RUTA_RUNTIME)
  const mapa: Record<string, unknown> = {}
  for (const n of SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of SWARM_VALUE_BINDINGS) mapa[n] = ''
  installSwarmAppRuntime({
    ...mapa,
    CLAUDE_OPUS_4_7_CONFIG: { name: 'modelo-del-anfitrion' },
    getMainLoopModelOverride: () => undefined,
    getSessionId: () => 'sesion-1',
    getTeamsDir: () => '/equipos',
    getTeamName: () => 'equipo-1',
    getAgentName: () => 'agente-1',
    getTeammateColor: () => 'azul',
    isInBundledMode: () => true,
    listTasks: async () => [],
    claimTask: async () => ({ success: true }),
    updateTask: async () => {},
    updateTaskState: () => {},
    ...encima,
  } as never)
}

/** Las 16 sub-superficies que `SwarmHostDeps` declara. */
const SUPERFICIES = [
  'api', 'tools', 'permissions', 'compaction', 'context', 'session',
  'events', 'hooks', 'fs', 'tasks', 'ui', 'worktree', 'env',
] as const

describe('createSwarmHostDeps — composición', () => {
  test('compone toda la superficie declarada, sin opciones', async () => {
    const { createSwarmHostDeps } = await import(RUTA)
    const deps = createSwarmHostDeps()
    for (const nombre of SUPERFICIES) {
      expect(deps[nombre as keyof typeof deps]).toBeDefined()
    }
  })

  test('construir NO toca ningún binding: son perezosos', async () => {
    // Sin instalar el anfitrión. Si la fábrica leyera un binding al componer,
    // esto lanzaría — y ese es justo el defecto que el caso vigila.
    const { createSwarmHostDeps } = await import(RUTA)
    expect(() => createSwarmHostDeps()).not.toThrow()
  })
})

describe('createSwarmHostDeps — el override gana al default', () => {
  test('un override reemplaza el default de su método', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    const deps = createSwarmHostDeps({
      api: { getModel: () => 'modelo-inyectado' },
    } as never)
    expect(deps.api.getModel()).toBe('modelo-inyectado')
  })

  test('el override es PARCIAL: lo no sobrescrito conserva su default', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    const deps = createSwarmHostDeps({
      api: { getModel: () => 'modelo-inyectado' },
    } as never)
    // `stream` no se sobrescribió: sigue siendo el default que rehúsa.
    expect(deps.api.stream).toBeDefined()
  })

  test('sin override, el modelo sale del binding del anfitrión', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    expect(createSwarmHostDeps().api.getModel()).toBe('modelo-del-anfitrion')
  })
})

describe('createSwarmHostDeps — lo no implementado rehúsa con su nombre', () => {
  test('api.stream nombra la superficie al rehusar', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    const iterador = createSwarmHostDeps().api.stream({} as never)
    // El caso apunta a una superficie que EXISTE: si `api.stream` faltara,
    // el fallo sería un TypeError de propiedad ausente y no probaría nada
    // sobre el mensaje de rechazo.
    await expect(iterador.next()).rejects.toThrow('api.stream')
  })

  test('worktree.create rehúsa nombrando SU superficie, no otra', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    await expect(createSwarmHostDeps().worktree.create({} as never))
      .rejects.toThrow('worktree.create')
  })
})

describe('createSwarmHostDeps — el estado de tarea colapsa de 5 a 3', () => {
  test('running, failed y killed caen los tres en in_progress', async () => {
    await installBindings({
      listTasks: async () => [
        { id: 'a', subject: 's', status: 'running' },
        { id: 'b', subject: 's', status: 'failed' },
        { id: 'c', subject: 's', status: 'killed' },
      ],
    })
    const { createSwarmHostDeps } = await import(RUTA)
    const tareas = await createSwarmHostDeps().tasks.listTasks('lista-1')
    expect(tareas.map(t => t.status)).toEqual([
      'in_progress', 'in_progress', 'in_progress',
    ])
  })

  test('pending y completed se conservan', async () => {
    await installBindings({
      listTasks: async () => [
        { id: 'a', subject: 's', status: 'pending' },
        { id: 'b', subject: 's', status: 'completed' },
      ],
    })
    const { createSwarmHostDeps } = await import(RUTA)
    const tareas = await createSwarmHostDeps().tasks.listTasks('lista-1')
    expect(tareas.map(t => t.status)).toEqual(['pending', 'completed'])
  })

  test('blockedBy ausente se normaliza a lista vacía, no a undefined', async () => {
    await installBindings({
      listTasks: async () => [{ id: 'a', subject: 's', status: 'pending' }],
    })
    const { createSwarmHostDeps } = await import(RUTA)
    const [tarea] = await createSwarmHostDeps().tasks.listTasks('lista-1')
    expect(tarea.blockedBy).toEqual([])
  })
})

describe('createSwarmHostDeps — las dos guardas', () => {
  test('ui.updateTask sin setAppState NO llega al anfitrión', async () => {
    // Se cuenta la llamada, no se mide que «no lanza»: el binding stub no
    // lanza con guarda ni sin ella, así que un caso de no-lanza pasa en
    // verde con el mecanismo anulado. Medido: la mutación que quita la
    // guarda dejaba la suite en 12 pass. El conteo sí discrimina.
    let llamadas = 0
    await installBindings({ updateTaskState: () => { llamadas += 1 } })
    const { createSwarmHostDeps } = await import(RUTA)
    createSwarmHostDeps().ui.updateTask('t-1', (t: unknown) => t)
    expect(llamadas).toBe(0)
  })

  test('ui.updateTask CON setAppState sí llega al anfitrión', async () => {
    // El control positivo del anterior: sin él, un `updateTask` que no
    // hiciera nunca nada también daría 0 llamadas y pasaría igual.
    let llamadas = 0
    await installBindings({ updateTaskState: () => { llamadas += 1 } })
    const { createSwarmHostDeps } = await import(RUTA)
    const deps = createSwarmHostDeps({
      context: { setAppState: () => {} },
    } as never)
    deps.ui.updateTask('t-1', (t: unknown) => t)
    expect(llamadas).toBe(1)
  })

  test('env.isEnabled delega en bundled y da false para lo desconocido', async () => {
    await installBindings()
    const { createSwarmHostDeps } = await import(RUTA)
    const env = createSwarmHostDeps().env
    expect(env.isEnabled('bundled')).toBe(true)
    expect(env.isEnabled('una-bandera-que-no-existe')).toBe(false)
  })
})
