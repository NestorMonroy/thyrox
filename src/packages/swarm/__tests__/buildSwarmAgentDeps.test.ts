/**
 * La mitad ROJA del puente entre las dos superficies de dependencias:
 * `SwarmHostDeps` (lo que el host implementa) → `AgentDeps` (lo que el bucle
 * del agente recibe).
 *
 * Procedencia: `ccnmt: packages/swarm/src/adapters/buildSwarmAgentDeps.ts`
 * (205 lineas, 3 exports). Ese arbol declara `"license": "UNLICENSED"`, asi
 * que el cuerpo se reimplementa y los casos se escriben aqui — la fuente NO
 * tiene suite para este modulo (medido: `find __tests__ -name '*warm*Deps*'`
 * sin resultados).
 *
 * Metrica: la conducta de cada sub-superficie compuesta contra un host doble
 * que REGISTRA lo que recibe, y contra un arbol de equipo REAL en disco para
 * las tres piezas de logica propia (buzon y reclamo de tarea).
 * Ciega a: la forma de los tipos — eso lo mide `tsconfig.json` de este
 * paquete, cuyo baseline es 24 errores, NINGUNO bajo `src/`.
 *
 * Anulaciones, una por pieza de logica:
 *  - quitar el filtro `!message.read` de `poll` → cae «descarta los leidos».
 *  - fijar el indice DESPUES de filtrar → cae «el indice direcciona el buzon
 *    completo».
 *  - quitar `member.name !== identity.name` de `broadcast` → cae «no se
 *    escribe a si mismo».
 *  - quitar el filtro `status === 'pending'` → cae «solo ofrece pendientes».
 *  - quitar el `?? task.subject` → cae «cae al subject sin descripcion».
 *  - las dos divergencias declaradas en el encabezado del puerto se anulan
 *    contra `tsc -p tsconfig.json`, no contra esta suite: sin ellas vuelven
 *    exactamente los dos errores TS2345/TS2322 que las originaron.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SwarmHostDeps } from '../src/types/deps.ts'

let raiz = ''
let recibido: Record<string, unknown[]> = {}

async function instalar(): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = () => undefined
  mapa.logError = () => undefined
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.sanitizePathComponent = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-')
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.getTeamName = () => 'eq'
  mapa.getAgentName = () => undefined
  mapa.getTeammateColor = () => 'blue'
  m.installSwarmAppRuntime(mapa)
}

/** Registra la llamada y devuelve lo que se le indique. */
function espia<T>(clave: string, devuelve: T): (...args: unknown[]) => T {
  return (...args: unknown[]) => {
    ;(recibido[clave] ??= []).push(args)
    return devuelve
  }
}

function host(encima: Partial<SwarmHostDeps> = {}): SwarmHostDeps {
  const base = {
    api: {
      stream: espia('api.stream', (async function* () {})()),
      getModel: espia('api.getModel', 'modelo-x'),
    },
    tools: {
      find: espia('tools.find', { name: 'Bash' }),
      list: espia('tools.list', [{ name: 'Bash' }]),
      execute: espia('tools.execute', Promise.resolve({ ok: true })),
    },
    permissions: {
      canUseTool: espia('permissions.canUseTool', Promise.resolve({ allowed: true })),
    },
    compaction: {
      maybeCompact: espia(
        'compaction.maybeCompact',
        Promise.resolve({ compacted: false, messages: [] }),
      ),
    },
    context: {
      getSystemPrompt: espia('context.getSystemPrompt', Promise.resolve(['a', 'b'])),
      getUserContext: espia('context.getUserContext', { u: '1' }),
      getSystemContext: espia('context.getSystemContext', { s: '2' }),
    },
    session: {
      recordTranscript: espia('session.recordTranscript', Promise.resolve()),
      getSessionId: espia('session.getSessionId', 'ses-1'),
    },
    events: { emit: espia('events.emit', undefined) },
    hooks: {
      onTurnStart: espia('hooks.onTurnStart', Promise.resolve()),
      onTurnEnd: espia('hooks.onTurnEnd', Promise.resolve()),
      onStop: espia(
        'hooks.onStop',
        Promise.resolve({ blockingErrors: [], preventContinuation: false }),
      ),
    },
    fs: {} as SwarmHostDeps['fs'],
    tasks: {
      listTasks: espia('tasks.listTasks', Promise.resolve([])),
      claimTask: espia('tasks.claimTask', Promise.resolve({ success: true })),
      updateTask: espia('tasks.updateTask', Promise.resolve()),
    },
    ui: {} as SwarmHostDeps['ui'],
    worktree: {} as SwarmHostDeps['worktree'],
    env: {} as SwarmHostDeps['env'],
  } as unknown as SwarmHostDeps
  return { ...base, ...encima }
}

const identidad = {
  teammateId: 'ana@eq',
  name: 'ana',
  teamId: 'eq',
  role: 'worker' as const,
}

function sembrarBuzon(agente: string, mensajes: unknown[]): void {
  mkdirSync(join(raiz, 'teams', 'eq', 'inboxes'), { recursive: true })
  writeFileSync(
    join(raiz, 'teams', 'eq', 'inboxes', `${agente}.json`),
    JSON.stringify(mensajes),
    'utf-8',
  )
}

function leerBuzon(agente: string): any[] {
  return JSON.parse(
    readFileSync(join(raiz, 'teams', 'eq', 'inboxes', `${agente}.json`), 'utf-8'),
  )
}

function sembrarEquipo(miembros: string[]): void {
  const dir = join(raiz, 'teams', 'eq')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'config.json'),
    JSON.stringify({
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'ana@eq',
      members: miembros.map(n => ({
        agentId: `${n}@eq`,
        name: n,
        joinedAt: 1,
        tmuxPaneId: `%${n}`,
        cwd: '/tmp',
      })),
    }),
    'utf-8',
  )
}

function msg(de: string, texto: string, extra: Record<string, unknown> = {}) {
  return { from: de, text: texto, timestamp: '2026-01-01T00:00:00Z', read: false, ...extra }
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/swarm-deps-')
  recibido = {}
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('createSwarmMailboxAdapter — el buzon del teammate', () => {
  test('1. poll descarta los mensajes ya leidos', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    sembrarBuzon('ana', [msg('leo', 'uno', { read: true }), msg('zoe', 'dos')])
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    const entrantes = await buzon.poll()
    expect(entrantes.map(e => e.text)).toEqual(['dos'])
  })

  test('2. el indice direcciona el buzon COMPLETO, no el filtrado', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    // Con el leido delante, el unico no-leido esta en la posicion 1. Un indice
    // recalculado tras el filtro diria 0, y `markRead` marcaria el equivocado.
    sembrarBuzon('ana', [msg('leo', 'uno', { read: true }), msg('zoe', 'dos')])
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    const entrantes = await buzon.poll()
    expect(entrantes[0]!.index).toBe(1)
  })

  test('3. poll traslada from, text, summary y duplica from en fromName', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    sembrarBuzon('ana', [msg('leo', 'hola', { summary: 'saludo' })])
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    expect(await buzon.poll()).toEqual([
      { from: 'leo', fromName: 'leo', text: 'hola', summary: 'saludo', index: 0 },
    ])
  })

  test('4. markRead marca por posicion en el buzon del propio agente', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    sembrarBuzon('ana', [msg('leo', 'uno'), msg('zoe', 'dos')])
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    await buzon.markRead(1)
    expect(leerBuzon('ana').map(x => x.read)).toEqual([false, true])
  })

  test('5. sendTo escribe en el buzon del par, firmado por la identidad', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    await buzon.sendTo('leo', { text: 'ping', summary: 'p' })
    const [escrito] = leerBuzon('leo')
    expect(escrito.from).toBe('ana')
    expect(escrito.text).toBe('ping')
    expect(escrito.summary).toBe('p')
    expect(typeof escrito.timestamp).toBe('string')
  })

  test('6. broadcast escribe a los demas y NO a si mismo', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    sembrarEquipo(['ana', 'leo', 'zoe'])
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    await buzon.broadcast({ text: 'a todos' })
    expect(leerBuzon('leo')).toHaveLength(1)
    expect(leerBuzon('zoe')).toHaveLength(1)
    expect(() => leerBuzon('ana')).toThrow()
  })

  test('7. broadcast sin archivo de equipo no escribe nada', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const buzon = m.createSwarmMailboxAdapter({ host: host(), identity: identidad })
    await buzon.broadcast({ text: 'a nadie' })
    expect(() => leerBuzon('leo')).toThrow()
  })
})

describe('createSwarmTaskClaimingAdapter — el reclamo de tarea', () => {
  test('8. listAvailable solo ofrece las pendientes', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host({
      tasks: {
        listTasks: espia(
          'tasks.listTasks',
          Promise.resolve([
            { id: 't1', subject: 'uno', status: 'pending', blockedBy: [] },
            { id: 't2', subject: 'dos', status: 'in_progress', blockedBy: [] },
            { id: 't3', subject: 'tres', status: 'completed', blockedBy: [] },
          ]),
        ),
        claimTask: espia('tasks.claimTask', Promise.resolve({ success: true })),
        updateTask: espia('tasks.updateTask', Promise.resolve()),
      },
    } as Partial<SwarmHostDeps>)
    const tareas = m.createSwarmTaskClaimingAdapter({ host: h, identity: identidad })
    expect((await tareas.listAvailable()).map(t => t.taskId)).toEqual(['t1'])
  })

  test('9. sin descripcion, la tarea se ofrece con su subject', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host({
      tasks: {
        listTasks: espia(
          'tasks.listTasks',
          Promise.resolve([
            { id: 't1', subject: 'el subject', status: 'pending', blockedBy: [] },
            { id: 't2', subject: 'otro', description: 'la descripcion', status: 'pending', blockedBy: [] },
          ]),
        ),
        claimTask: espia('tasks.claimTask', Promise.resolve({ success: true })),
        updateTask: espia('tasks.updateTask', Promise.resolve()),
      },
    } as Partial<SwarmHostDeps>)
    const tareas = m.createSwarmTaskClaimingAdapter({ host: h, identity: identidad })
    expect((await tareas.listAvailable()).map(t => t.description)).toEqual([
      'el subject',
      'la descripcion',
    ])
  })

  test('10. listAvailable acota por equipo, no por agente', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host()
    const tareas = m.createSwarmTaskClaimingAdapter({ host: h, identity: identidad })
    await tareas.listAvailable()
    expect(recibido['tasks.listTasks']).toEqual([['eq']])
  })

  test('11. claim pasa equipo, tarea y NOMBRE del agente, y reduce a booleano', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const tareas = m.createSwarmTaskClaimingAdapter({ host: host(), identity: identidad })
    expect(await tareas.claim('t1')).toBe(true)
    expect(recibido['tasks.claimTask']).toEqual([['eq', 't1', 'ana']])
  })

  test('12. claim devuelve false cuando el host lo rechaza', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host({
      tasks: {
        listTasks: espia('tasks.listTasks', Promise.resolve([])),
        claimTask: espia(
          'tasks.claimTask',
          Promise.resolve({ success: false, reason: 'ya reclamada' }),
        ),
        updateTask: espia('tasks.updateTask', Promise.resolve()),
      },
    } as Partial<SwarmHostDeps>)
    const tareas = m.createSwarmTaskClaimingAdapter({ host: h, identity: identidad })
    expect(await tareas.claim('t1')).toBe(false)
  })

  test('13. update traslada el estado como parche parcial', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const tareas = m.createSwarmTaskClaimingAdapter({ host: host(), identity: identidad })
    await tareas.update('t1', 'in_progress')
    expect(recibido['tasks.updateTask']).toEqual([['eq', 't1', { status: 'in_progress' }]])
  })
})

describe('buildSwarmAgentDeps — las nueve sub-superficies del AgentDeps', () => {
  test('14. cada sub-superficie delega en el miembro del host que le toca', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })

    expect(deps.provider.getModel()).toBe('modelo-x')
    expect(deps.tools.find('Bash')).toEqual({ name: 'Bash' })
    expect(deps.tools.list()).toEqual([{ name: 'Bash' }])
    await deps.tools.execute({} as never, {}, {} as never)
    expect(deps.context.getUserContext()).toEqual({ u: '1' })
    expect(deps.context.getSystemContext()).toEqual({ s: '2' })
    expect(deps.session.getSessionId()).toBe('ses-1')
    await deps.session.recordTranscript([])
    deps.output.emit({ tipo: 'x' })
    await deps.hooks.onTurnStart({} as never)
    await deps.hooks.onTurnEnd({} as never)
    await deps.hooks.onStop([], {} as never)
    await deps.compaction.maybeCompact([], 10)

    expect(Object.keys(recibido).sort()).toEqual([
      'api.getModel',
      'compaction.maybeCompact',
      'context.getSystemContext',
      'context.getSystemPrompt',
      'context.getUserContext',
      'events.emit',
      'hooks.onStop',
      'hooks.onTurnEnd',
      'hooks.onTurnStart',
      'session.getSessionId',
      'session.recordTranscript',
      'tools.execute',
      'tools.find',
      'tools.list',
    ])
  })

  test('15. el prompt de sistema se resuelve UNA vez y se envuelve en {content}', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })
    expect(deps.context.getSystemPrompt()).toEqual([{ content: 'a' }, { content: 'b' }])
    deps.context.getSystemPrompt()
    // La promesa del host se consumio en la composicion, no en cada lectura.
    expect(recibido['context.getSystemPrompt']).toHaveLength(1)
  })

  test('16. stream declara systemPrompt aunque el llamador lo omita', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })
    deps.provider.stream({ messages: [], tools: [], model: 'm' })
    const [[params]] = recibido['api.stream'] as [[Record<string, unknown>]]
    expect('systemPrompt' in params).toBe(true)
    expect(params.systemPrompt).toBeUndefined()
  })

  test('17. el permiso concedido se reduce a la rama sin motivo de la union', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })
    expect(await deps.permission.canUseTool({} as never, {}, { mode: 'default', input: {} })).toEqual(
      { allowed: true },
    )
  })

  test('18. el permiso denegado SIN motivo recibe uno: la union lo exige', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host({
      permissions: {
        canUseTool: espia('permissions.canUseTool', Promise.resolve({ allowed: false })),
      },
    } as Partial<SwarmHostDeps>)
    const deps = await m.buildSwarmAgentDeps({ host: h, identity: identidad })
    const r = await deps.permission.canUseTool({} as never, {}, { mode: 'default', input: {} })
    expect(r.allowed).toBe(false)
    expect((r as { reason: string }).reason).toContain('sin declarar motivo')
  })

  test('19. el permiso denegado CON motivo lo conserva', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const h = host({
      permissions: {
        canUseTool: espia(
          'permissions.canUseTool',
          Promise.resolve({ allowed: false, reason: 'fuera del arbol' }),
        ),
      },
    } as Partial<SwarmHostDeps>)
    const deps = await m.buildSwarmAgentDeps({ host: h, identity: identidad })
    const r = await deps.permission.canUseTool({} as never, {}, { mode: 'default', input: {} })
    expect((r as { reason: string }).reason).toBe('fuera del arbol')
  })

  test('20. canUseTool inyecta el input tambien en el contexto del host', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })
    await deps.permission.canUseTool({} as never, { cmd: 'ls' }, { mode: 'plan', input: null })
    const [[, , ctx]] = recibido['permissions.canUseTool'] as [[unknown, unknown, Record<string, unknown>]]
    expect(ctx).toEqual({ mode: 'plan', input: { cmd: 'ls' } })
  })

  test('21. el swarm compuesto lleva la identidad y sus dos adaptadores', async () => {
    const m = await import('../src/adapters/buildSwarmAgentDeps.ts')
    const deps = await m.buildSwarmAgentDeps({ host: host(), identity: identidad })
    expect(deps.swarm!.identity).toEqual({
      name: 'ana',
      teamId: 'eq',
      teammateId: 'ana@eq',
      role: 'worker',
    })
    expect(typeof deps.swarm!.mailbox.poll).toBe('function')
    expect(typeof deps.swarm!.taskClaiming.claim).toBe('function')
  })
})
