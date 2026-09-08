/**
 * La mitad ROJA de la sincronización de permisos entre agentes.
 *
 * Procedencia: `ccnmt: packages/swarm/src/permissions/index.ts` (919 líneas,
 * 23 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se reimplementa y no se copia.
 *
 * EL FLUJO: un compañero que necesita permiso para una herramienta no le
 * pregunta al usuario —no tiene a quién— sino que reenvía la petición al
 * líder, que sí lo tiene delante. Hay DOS transportes: el de archivos
 * (`pending/` y `resolved/`) y el del buzón. Los dos conviven en la fuente.
 *
 * Métrica: la conducta de cada función contra un árbol de permisos REAL.
 * Ciega a: la decisión del usuario — aquí se mide el transporte, no quién
 * aprueba.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let errores: unknown[] = []
let liberados = 0

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = () => undefined
  mapa.logError = (e: unknown) => errores.push(e)
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.sanitizePathComponent = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-')
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.lock = () => Promise.resolve(async () => { liberados += 1 })
  mapa.getTeamName = () => 'eq'
  mapa.getAgentId = () => 'ana@eq'
  mapa.getAgentName = () => 'ana'
  mapa.getTeammateColor = () => 'red'
  mapa.TEAMMATE_MESSAGE_TAG = 'teammate-message'
  mapa.SEND_MESSAGE_TOOL_NAME = 'SendMessage'
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

function permDir(sub = ''): string {
  return join(raiz, 'teams', 'eq', 'permissions', sub)
}

function sembrarEquipo(lider = 'jefa'): void {
  const dir = join(raiz, 'teams', 'eq')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'config.json'),
    JSON.stringify({
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [
        { agentId: 'lead@eq', name: lider, joinedAt: 1, tmuxPaneId: '%0', cwd: '/w', subscriptions: [] },
      ],
    }),
    'utf-8',
  )
}

function peticion(extra: Record<string, unknown> = {}) {
  return {
    id: 'perm-1',
    workerId: 'ana@eq',
    workerName: 'ana',
    workerColor: 'red',
    teamName: 'eq',
    toolName: 'Bash',
    toolUseId: 'tu-1',
    description: 'listar',
    input: { command: 'ls' },
    permissionSuggestions: [],
    status: 'pending',
    createdAt: 1000,
    ...extra,
  }
}

function sembrarPendiente(p: Record<string, unknown>): void {
  mkdirSync(permDir('pending'), { recursive: true })
  writeFileSync(join(permDir('pending'), `${p.id}.json`), JSON.stringify(p), 'utf-8')
}

function sembrarResuelta(p: Record<string, unknown>): void {
  mkdirSync(permDir('resolved'), { recursive: true })
  writeFileSync(join(permDir('resolved'), `${p.id}.json`), JSON.stringify(p), 'utf-8')
}

function buzon(agente: string): string {
  return join(raiz, 'teams', 'eq', 'inboxes', `${agente}.json`)
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/swarmperm-')
  errores = []
  liberados = 0
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('createPermissionRequest — la identidad es OBLIGATORIA', () => {
  test('1. rellena equipo, identificador, nombre y color desde el entorno', async () => {
    const m = await import('../src/permissions/index.ts')
    const r = m.createPermissionRequest({
      toolName: 'Bash',
      toolUseId: 'tu-1',
      input: { command: 'ls' },
      description: 'listar',
    })
    expect(r.teamName).toBe('eq')
    expect(r.workerId).toBe('ana@eq')
    expect(r.workerName).toBe('ana')
    expect(r.workerColor).toBe('red')
    expect(r.status).toBe('pending')
    expect(r.id.startsWith('perm-')).toBe(true)
  })

  test('2. sin equipo, sin identificador o sin nombre, LANZA', async () => {
    const base = { toolName: 'Bash', toolUseId: 'tu-1', input: {}, description: 'd' }
    // Una petición sin remitente no se puede enrutar de vuelta: el líder la
    // aprobaría y la respuesta no tendría a dónde ir. Fallar aquí es más
    // barato que un compañero esperando para siempre.
    await instalar({ getTeamName: () => undefined })
    let m = await import('../src/permissions/index.ts')
    expect(() => m.createPermissionRequest(base)).toThrow(/Team name/)
    await instalar({ getAgentId: () => undefined })
    expect(() => m.createPermissionRequest(base)).toThrow(/Worker ID/)
    await instalar({ getAgentName: () => undefined })
    expect(() => m.createPermissionRequest(base)).toThrow(/Worker name/)
  })
})

describe('el transporte por archivos', () => {
  test('3. escribir deja la petición en pendientes y suelta el cerrojo', async () => {
    const m = await import('../src/permissions/index.ts')
    await m.writePermissionRequest(peticion() as never)
    expect(existsSync(join(permDir('pending'), 'perm-1.json'))).toBe(true)
    expect(liberados).toBe(1)
  })

  test('4. sin directorio de pendientes, leer da lista vacía', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(await m.readPendingPermissions()).toEqual([])
    expect(errores.length).toBe(0)
  })

  test('5. sólo los .json cuentan como petición', async () => {
    sembrarPendiente(peticion())
    writeFileSync(join(permDir('pending'), '.lock'), '', 'utf-8')
    // El temporal lleva un cuerpo VÁLIDO a propósito: si el veredicto lo diera
    // el fallo de análisis —como con el cerrojo, que está vacío— el control no
    // mediría el filtro de extensión sino la suerte del contenido. Una
    // escritura atómica deja temporales así al vuelo.
    writeFileSync(
      join(permDir('pending'), 'perm-2.json.tmp'),
      JSON.stringify(peticion({ id: 'perm-2' })),
      'utf-8',
    )
    const m = await import('../src/permissions/index.ts')
    expect((await m.readPendingPermissions()).map(x => x.id)).toEqual(['perm-1'])
  })

  test('6. una petición que no valida se descarta, no rompe la lista', async () => {
    sembrarPendiente(peticion())
    sembrarPendiente({ id: 'perm-2', basura: true } as never)
    const m = await import('../src/permissions/index.ts')
    // Un archivo corrupto no puede tumbar la bandeja entera del líder: las
    // demás peticiones siguen siendo atendibles.
    expect((await m.readPendingPermissions()).map(x => x.id)).toEqual(['perm-1'])
  })

  test('7. las pendientes salen de la más VIEJA a la más nueva', async () => {
    sembrarPendiente(peticion({ id: 'perm-b', createdAt: 3000 }))
    sembrarPendiente(peticion({ id: 'perm-a', createdAt: 1000 }))
    const m = await import('../src/permissions/index.ts')
    // El orden es el de llegada: quien lleva más esperando se atiende antes.
    expect((await m.readPendingPermissions()).map(x => x.id)).toEqual(['perm-a', 'perm-b'])
  })

  test('8. resolver mueve la petición de pendientes a resueltas', async () => {
    sembrarPendiente(peticion())
    const m = await import('../src/permissions/index.ts')
    expect(
      await m.resolvePermission('perm-1', { decision: 'approved', resolvedBy: 'leader' }),
    ).toBe(true)
    expect(existsSync(join(permDir('pending'), 'perm-1.json'))).toBe(false)
    const r = JSON.parse(readFileSync(join(permDir('resolved'), 'perm-1.json'), 'utf-8'))
    expect(r.status).toBe('approved')
    expect(r.resolvedBy).toBe('leader')
    expect(typeof r.resolvedAt).toBe('number')
  })

  test('9. resolver algo que no está pendiente devuelve false', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(
      await m.resolvePermission('fantasma', { decision: 'approved', resolvedBy: 'leader' }),
    ).toBe(false)
  })

  test('10. leer una resolución inexistente da null, sin error', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(await m.readResolvedPermission('fantasma')).toBe(null)
    expect(errores.length).toBe(0)
  })
})

describe('cleanupOldResolutions — la bandeja no crece sin fin', () => {
  test('11. lo reciente se conserva', async () => {
    sembrarResuelta(peticion({ resolvedAt: Date.now() }))
    const m = await import('../src/permissions/index.ts')
    expect(await m.cleanupOldResolutions('eq')).toBe(0)
  })

  test('12. con edad máxima CERO se limpia todo', async () => {
    sembrarResuelta(peticion({ resolvedAt: Date.now() }))
    const m = await import('../src/permissions/index.ts')
    // La comparación es «mayor o igual»: con cero, una resolución de este
    // mismo instante también entra. Con «mayor» estricto, pedir «límpialo
    // todo» no limpiaría nada.
    expect(await m.cleanupOldResolutions('eq', 0)).toBe(1)
    expect(readdirSync(permDir('resolved')).length).toBe(0)
  })

  test('13. un archivo ilegible se borra igualmente', async () => {
    mkdirSync(permDir('resolved'), { recursive: true })
    writeFileSync(join(permDir('resolved'), 'roto.json'), '{no json', 'utf-8')
    const m = await import('../src/permissions/index.ts')
    // Si no se puede leer, tampoco se puede saber su edad — y dejarlo lo haría
    // eterno.
    expect(await m.cleanupOldResolutions('eq')).toBe(1)
  })

  test('14. sin directorio de resueltas, no hay nada que limpiar', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(await m.cleanupOldResolutions('eq')).toBe(0)
  })
})

describe('pollForResponse — la vista del compañero', () => {
  test('15. lo aprobado llega como aprobado', async () => {
    sembrarResuelta(peticion({ status: 'approved', resolvedAt: 2000 }))
    const m = await import('../src/permissions/index.ts')
    const r = (await m.pollForResponse('perm-1'))!
    expect(r.decision).toBe('approved')
    expect(r.timestamp).toBe(new Date(2000).toISOString())
  })

  test('16. TODO lo que no es aprobado llega como denegado', async () => {
    sembrarResuelta(peticion({ status: 'rejected', feedback: 'no' }))
    const m = await import('../src/permissions/index.ts')
    // El compañero sólo puede continuar si le dijeron que sí. Cualquier otro
    // estado —rechazado, o uno que no reconozca— tiene que frenarlo.
    expect((await m.pollForResponse('perm-1'))!.decision).toBe('denied')
  })

  test('17. sin marca de resolución, la fecha cae a la de creación', async () => {
    sembrarResuelta(peticion({ status: 'approved' }))
    const m = await import('../src/permissions/index.ts')
    expect((await m.pollForResponse('perm-1'))!.timestamp).toBe(
      new Date(1000).toISOString(),
    )
  })

  test('18. retirar la respuesta borra el archivo resuelto', async () => {
    sembrarResuelta(peticion({ status: 'approved' }))
    const m = await import('../src/permissions/index.ts')
    await m.removeWorkerResponse('perm-1')
    expect(existsSync(join(permDir('resolved'), 'perm-1.json'))).toBe(false)
  })
})

describe('quién es quién', () => {
  test('19. sin identificador de agente, se es líder', async () => {
    await instalar({ getAgentId: () => undefined })
    const m = await import('../src/permissions/index.ts')
    expect(m.isTeamLeader()).toBe(true)
    expect(m.isSwarmWorker()).toBe(false)
  })

  test('20. el identificador reservado también es del líder', async () => {
    await instalar({ getAgentId: () => 'team-lead' })
    const m = await import('../src/permissions/index.ts')
    expect(m.isTeamLeader()).toBe(true)
  })

  test('21. sin equipo, nadie es líder ni obrero', async () => {
    await instalar({ getTeamName: () => undefined, getAgentId: () => undefined })
    const m = await import('../src/permissions/index.ts')
    // Fuera de un equipo la pregunta no tiene sentido, y contestar «sí» daría
    // a una sesión suelta autoridad sobre un equipo que no existe.
    expect(m.isTeamLeader()).toBe(false)
    expect(m.isSwarmWorker()).toBe(false)
  })

  test('22. con equipo e identificador propio, se es obrero', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(m.isSwarmWorker()).toBe(true)
    expect(m.isTeamLeader()).toBe(false)
  })
})

describe('el transporte por buzón', () => {
  test('23. el nombre del líder sale del roster', async () => {
    sembrarEquipo('jefa')
    const m = await import('../src/permissions/index.ts')
    expect(await m.getLeaderName('eq')).toBe('jefa')
  })

  test('24. sin archivo de equipo no hay líder, y la petición no se envía', async () => {
    const m = await import('../src/permissions/index.ts')
    expect(await m.getLeaderName('eq')).toBe(null)
    expect(await m.sendPermissionRequestViaMailbox(peticion() as never)).toBe(false)
  })

  test('25. la petición aterriza en el buzón del líder', async () => {
    sembrarEquipo('jefa')
    const m = await import('../src/permissions/index.ts')
    expect(await m.sendPermissionRequestViaMailbox(peticion() as never)).toBe(true)
    const ms = JSON.parse(readFileSync(buzon('jefa'), 'utf-8'))
    expect(ms[0].from).toBe('ana')
    expect(JSON.parse(ms[0].text).request_id).toBe('perm-1')
  })

  test('26. la respuesta aprobada viaja como éxito, la rechazada como error', async () => {
    sembrarEquipo('jefa')
    const m = await import('../src/permissions/index.ts')
    await m.sendPermissionResponseViaMailbox('bob', { decision: 'approved', resolvedBy: 'leader' }, 'perm-1', 'eq')
    await m.sendPermissionResponseViaMailbox('bob', { decision: 'rejected', resolvedBy: 'leader', feedback: 'no' }, 'perm-2', 'eq')
    const ms = JSON.parse(readFileSync(buzon('bob'), 'utf-8'))
    expect(JSON.parse(ms[0].text).subtype).toBe('success')
    expect(JSON.parse(ms[1].text).subtype).toBe('error')
  })

  test('27. la petición de red necesita identidad de obrero', async () => {
    sembrarEquipo('jefa')
    await instalar({ getAgentName: () => undefined })
    const m = await import('../src/permissions/index.ts')
    // Sin nombre, la respuesta no tendría buzón al que volver.
    expect(await m.sendSandboxPermissionRequestViaMailbox('example.com', 'sb-1', 'eq')).toBe(false)
  })

  test('28. la petición de red aterriza con su anfitrión', async () => {
    sembrarEquipo('jefa')
    const m = await import('../src/permissions/index.ts')
    expect(await m.sendSandboxPermissionRequestViaMailbox('example.com', 'sb-1', 'eq')).toBe(true)
    const t = JSON.parse(JSON.parse(readFileSync(buzon('jefa'), 'utf-8'))[0].text)
    // La PETICIÓN anida el anfitrión bajo un patrón —el protocolo prevé
    // patrones, no sólo nombres exactos—; la RESPUESTA lo lleva plano. Los dos
    // se miden con la forma que su propia fábrica emite.
    expect(t.hostPattern.host).toBe('example.com')
    expect(t.requestId).toBe('sb-1')
  })

  test('29. la respuesta de red lleva el veredicto y el anfitrión', async () => {
    sembrarEquipo('jefa')
    const m = await import('../src/permissions/index.ts')
    expect(
      await m.sendSandboxPermissionResponseViaMailbox('bob', 'sb-1', 'example.com', true, 'eq'),
    ).toBe(true)
    const t = JSON.parse(JSON.parse(readFileSync(buzon('bob'), 'utf-8'))[0].text)
    expect(t.allow).toBe(true)
    expect(t.host).toBe('example.com')
  })
})
