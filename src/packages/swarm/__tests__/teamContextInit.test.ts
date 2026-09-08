/**
 * La mitad ROJA de los dos módulos que el cierre de `teamHelpers` desbloqueó.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/{teamFileRegistration.ts,
 * reconnection.ts}` (109 y 119 líneas; 3 y 2 símbolos exportados). Ese árbol
 * declara `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no
 * se copian.
 *
 * QUÉ CUBREN LOS DOS. `teamFileRegistration` reconstruye el archivo de equipo
 * cuando desapareció del disco pero el líder sigue creyendo que dirige el
 * equipo; `reconnection` calcula el contexto de equipo al arrancar, tanto en un
 * lanzamiento nuevo como al reanudar una sesión.
 *
 * Métrica: la conducta de cada uno contra un directorio de equipos REAL.
 * Ciega a: lo que el anfitrión haga con el contexto devuelto — aquí se mide qué
 * se calcula, no quién lo pinta.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let errores: unknown[] = []

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = () => undefined
  mapa.logError = (e: unknown) => errores.push(e)
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getTasksDir = (n: string) => join(raiz, 'tasks', n)
  mapa.getSessionCreatedTeams = () => new Set<string>()
  mapa.errorMessage = (e: unknown) => String((e as Error)?.message ?? e)
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.getSessionId = () => 'sesion-viva'
  mapa.getDynamicTeamContext = () => undefined
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

function sembrar(equipo: string, contenido: unknown): void {
  const dir = join(raiz, 'teams', equipo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'config.json'), JSON.stringify(contenido), 'utf-8')
}

function leer(equipo: string): any {
  return JSON.parse(
    readFileSync(join(raiz, 'teams', equipo, 'config.json'), 'utf-8'),
  )
}

const INSTANTANEA = {
  teamContext: {
    teamName: 'eq',
    leadAgentId: 'lead@eq',
    teammates: {
      'ana@eq': {
        name: 'ana',
        agentType: 'general',
        spawnedAt: 42,
        tmuxPaneId: '%1',
        cwd: '/w',
      },
    },
  },
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/teamctx-')
  errores = []
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('ensureTeamFileFromSnapshot — el archivo perdido se reconstruye', () => {
  test('1. si el archivo está, se devuelve tal cual', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 7,
      leadAgentId: 'otro@eq',
      leadSessionId: 's0',
      members: [],
    })
    const m = await import('../src/core/teamFileRegistration.ts')
    const f = await m.ensureTeamFileFromSnapshot('eq', INSTANTANEA)
    // Reconstruir sobre un archivo sano perdería lo que sólo vive en él —
    // descripción, colores, modo por miembro— sin que nadie lo pida.
    expect(f.createdAt).toBe(7)
    expect(f.leadAgentId).toBe('otro@eq')
  })

  test('2. sin archivo, se reconstruye desde la instantánea en memoria', async () => {
    const m = await import('../src/core/teamFileRegistration.ts')
    const f = await m.ensureTeamFileFromSnapshot('eq', INSTANTANEA)
    // Lo que se salva es lo que decide el enrutado: identificador, nombre,
    // directorio y panel. El resto no está en memoria y se pierde.
    expect(f.members.map(x => x.name)).toEqual(['ana'])
    expect(f.members[0]!.agentId).toBe('ana@eq')
    expect(f.members[0]!.tmuxPaneId).toBe('%1')
    expect(f.members[0]!.joinedAt).toBe(42)
    expect(f.leadSessionId).toBe('sesion-viva')
    expect(leer('eq').members.length).toBe(1)
  })

  test('3. si la instantánea nombra OTRO equipo, lanza', async () => {
    const m = await import('../src/core/teamFileRegistration.ts')
    // Pasar el nombre equivocado es un defecto de quien llama, y reconstruir
    // un equipo que nadie creó lo escondería tras un archivo nuevo.
    await expect(
      m.ensureTeamFileFromSnapshot('otro', INSTANTANEA),
    ).rejects.toThrow(/does not exist/)
  })

  test('4. sin líder en la instantánea, lanza', async () => {
    const m = await import('../src/core/teamFileRegistration.ts')
    await expect(
      m.ensureTeamFileFromSnapshot('eq', {
        teamContext: { teamName: 'eq', teammates: {} },
      }),
    ).rejects.toThrow(/does not exist/)
  })
})

describe('registerTeammateInTeamFile — el alta reemplaza, no duplica', () => {
  test('5. un compañero nuevo se añade al archivo existente', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [],
    })
    const m = await import('../src/core/teamFileRegistration.ts')
    await m.registerTeammateInTeamFile('eq', INSTANTANEA, {
      agentId: 'leo@eq',
      name: 'leo',
      joinedAt: 9,
      tmuxPaneId: '%2',
      cwd: '/w',
      subscriptions: [],
    })
    expect(leer('eq').members.map((x: any) => x.name)).toEqual(['leo'])
  })

  test('6. registrar dos veces al MISMO agente no lo duplica', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [],
    })
    const m = await import('../src/core/teamFileRegistration.ts')
    const miembro = {
      agentId: 'leo@eq',
      name: 'leo',
      joinedAt: 9,
      tmuxPaneId: '%2',
      cwd: '/w',
      subscriptions: [],
    }
    await m.registerTeammateInTeamFile('eq', INSTANTANEA, miembro)
    await m.registerTeammateInTeamFile('eq', INSTANTANEA, {
      ...miembro,
      tmuxPaneId: '%9',
    })
    // Un reintento de arranque vuelve a registrar: sin la purga previa, el
    // roster tendría dos filas del mismo agente y el enrutado elegiría una al
    // azar.
    const ms = leer('eq').members
    expect(ms.length).toBe(1)
    expect(ms[0].tmuxPaneId).toBe('%9')
  })

  test('7. si el archivo faltaba, el alta lo reconstruye antes', async () => {
    const m = await import('../src/core/teamFileRegistration.ts')
    await m.registerTeammateInTeamFile('eq', INSTANTANEA, {
      agentId: 'leo@eq',
      name: 'leo',
      joinedAt: 9,
      tmuxPaneId: '%2',
      cwd: '/w',
      subscriptions: [],
    })
    expect(leer('eq').members.map((x: any) => x.name).sort()).toEqual([
      'ana',
      'leo',
    ])
  })
})

describe('computeInitialTeamContext — antes del primer render', () => {
  test('8. sin contexto declarado, no somos parte de ningún equipo', async () => {
    const m = await import('../src/core/reconnection.ts')
    expect(m.computeInitialTeamContext()).toBe(undefined)
    // No ser compañero es el caso normal de una sesión cualquiera: no es un
    // error y no se registra como tal.
    expect(errores.length).toBe(0)
  })

  test('9. con contexto pero sin archivo de equipo, registra el error', async () => {
    await instalar({
      getDynamicTeamContext: () => ({ teamName: 'eq', agentName: 'ana', agentId: 'ana@eq' }),
    })
    const m = await import('../src/core/reconnection.ts')
    expect(m.computeInitialTeamContext()).toBe(undefined)
    // Aquí SÍ es un defecto: nos dijeron que somos de un equipo cuyo archivo
    // no existe.
    expect(errores.length).toBe(1)
  })

  test('10. un compañero recibe su identificador y NO es líder', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [],
    })
    await instalar({
      getDynamicTeamContext: () => ({ teamName: 'eq', agentName: 'ana', agentId: 'ana@eq' }),
    })
    const m = await import('../src/core/reconnection.ts')
    const ctx = m.computeInitialTeamContext()!
    expect(ctx.selfAgentId).toBe('ana@eq')
    expect(ctx.leadAgentId).toBe('lead@eq')
    expect(ctx.isLeader).toBe(false)
    expect(ctx.teamFilePath.endsWith('config.json')).toBe(true)
  })

  test('11. SIN identificador de agente, somos el líder', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [],
    })
    await instalar({
      getDynamicTeamContext: () => ({ teamName: 'eq', agentName: 'lead' }),
    })
    const m = await import('../src/core/reconnection.ts')
    // El líder es quien NO tiene identificador de agente: los compañeros lo
    // reciben al ser lanzados, y él no fue lanzado por nadie.
    expect(m.computeInitialTeamContext()!.isLeader).toBe(true)
  })
})

describe('initializeTeammateContextFromSession — al reanudar', () => {
  test('12. sin archivo de equipo, registra el error y NO toca el estado', async () => {
    let tocado = 0
    const m = await import('../src/core/reconnection.ts')
    m.initializeTeammateContextFromSession(() => { tocado += 1 }, 'eq', 'ana')
    expect(errores.length).toBe(1)
    expect(tocado).toBe(0)
  })

  test('13. reanudar fija el contexto con el identificador del roster', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [
        { agentId: 'ana@eq', name: 'ana', joinedAt: 1, tmuxPaneId: '%1', cwd: '/w', subscriptions: [] },
      ],
    })
    const m = await import('../src/core/reconnection.ts')
    let ctx: any
    m.initializeTeammateContextFromSession(
      (f: (p: any) => any) => { ctx = f({}).teamContext },
      'eq',
      'ana',
    )
    // El identificador viene del ARCHIVO y no del transcript: el transcript
    // guarda equipo y nombre, que es lo que sobrevive a una reanudación.
    expect(ctx.selfAgentId).toBe('ana@eq')
    expect(ctx.isLeader).toBe(false)
  })

  test('14. si ya no está en el roster, el contexto se fija SIN identificador', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [],
    })
    const m = await import('../src/core/reconnection.ts')
    let ctx: any
    m.initializeTeammateContextFromSession(
      (f: (p: any) => any) => { ctx = f({}).teamContext },
      'eq',
      'ana',
    )
    // Que lo hayan quitado del equipo no derriba la sesión reanudada: sigue
    // sabiendo de qué equipo venía, sin identificador.
    expect(ctx.selfAgentId).toBe(undefined)
    expect(ctx.teamName).toBe('eq')
    expect(errores.length).toBe(0)
  })
})
