/**
 * La mitad ROJA de `teammateInit`: lo que un compañero enchufa al arrancar.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teammateInit.ts` (129 líneas,
 * 1 símbolo exportado). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se reimplementa y no se copia.
 *
 * QUÉ HACE. Aplica los permisos que el equipo concede a todos, y registra un
 * hook de parada que avisa al líder cuando este compañero se queda ocioso. Sin
 * ese aviso el líder no sabe que alguien terminó y lo espera para siempre.
 *
 * Métrica: qué se registra, con qué forma, y qué acaba en el buzón del líder.
 * Ciega a: si el hook llega a dispararse de verdad en una sesión — aquí se
 * invoca a mano el manejador que se registró.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let hooks: Array<Record<string, unknown>> = []
let permisos: unknown[] = []
let trazas: string[] = []
let estado: Record<string, unknown> = {}

/**
 * Un `setAppState` que SÍ invoca al transformador.
 *
 * Uno que lo ignore —`() => undefined`— haría pasar los casos de permiso sin
 * que el módulo aplicara ninguno: mediría que no lanza, no que concede.
 */
function fijarEstado(f: (prev: Record<string, unknown>) => Record<string, unknown>): void {
  estado = f(estado)
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
  mapa.jsonStringify = (v: unknown) => JSON.stringify(v)
  mapa.sanitizePathComponent = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-')
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.lock = () => Promise.resolve(async () => undefined)
  mapa.getTeamName = () => 'eq'
  mapa.getTeammateColor = () => 'red'
  mapa.TEAMMATE_MESSAGE_TAG = 'teammate-message'
  mapa.SEND_MESSAGE_TOOL_NAME = 'SendMessage'
  mapa.applyPermissionUpdate = (ctx: unknown, upd: unknown) => {
    permisos.push(upd)
    return ctx
  }
  mapa.addFunctionHook = (
    _set: unknown,
    sessionId: string,
    evento: string,
    matcher: string,
    manejador: unknown,
    mensajeError: string,
    opciones: unknown,
  ) => {
    hooks.push({ sessionId, evento, matcher, manejador, mensajeError, opciones })
  }
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

function sembrarEquipo(contenido: Record<string, unknown>): void {
  const dir = join(raiz, 'teams', 'eq')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'config.json'),
    JSON.stringify({
      name: 'eq',
      createdAt: 1,
      leadSessionId: 's0',
      ...contenido,
    }),
    'utf-8',
  )
}

function miembro(nombre: string, extra: Record<string, unknown> = {}) {
  return {
    agentId: `${nombre}@eq`,
    name: nombre,
    joinedAt: 1,
    tmuxPaneId: `%${nombre}`,
    cwd: '/w',
    subscriptions: [],
    ...extra,
  }
}

function buzon(agente: string): string {
  return join(raiz, 'teams', 'eq', 'inboxes', `${agente}.json`)
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/tminit-')
  hooks = []
  permisos = []
  trazas = []
  estado = {}
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('initializeTeammateHooks — el arranque de un compañero', () => {
  test('1. sin archivo de equipo, no registra nada', async () => {
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    expect(hooks.length).toBe(0)
  })

  test('2. el LÍDER no registra el aviso de ociosidad', async () => {
    sembrarEquipo({ leadAgentId: 'lead@eq', members: [miembro('lead')] })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'lead@eq',
      agentName: 'lead',
    })
    // El líder avisándose a sí mismo de que está ocioso llenaría su propio
    // buzón con mensajes que él mismo tendría que atender.
    expect(hooks.length).toBe(0)
  })

  test('3. un compañero registra un hook de parada con su plazo', async () => {
    sembrarEquipo({ leadAgentId: 'lead@eq', members: [miembro('lead'), miembro('ana')] })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    expect(hooks.length).toBe(1)
    expect(hooks[0]!.evento).toBe('Stop')
    expect(hooks[0]!.sessionId).toBe('s1')
    // Sin matcher: el aviso vale para toda parada, no para una clase de ellas.
    expect(hooks[0]!.matcher).toBe('')
    expect(hooks[0]!.opciones).toEqual({ timeout: 10000 })
  })
})

describe('los permisos que el equipo concede a todos', () => {
  test('4. una ruta ABSOLUTA lleva una barra de más', async () => {
    sembrarEquipo({
      leadAgentId: 'lead@eq',
      members: [miembro('lead'), miembro('ana')],
      teamAllowedPaths: [{ toolName: 'Read', path: '/srv/datos' }],
    })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    // La barra extra es lo que distingue una ruta absoluta de una relativa en
    // el lenguaje de reglas: sin ella, `/srv/datos` se leería como relativa al
    // directorio de trabajo de cada compañero, que no es el mismo.
    expect((permisos[0] as any).rules[0].ruleContent).toBe('//srv/datos/**')
    expect((permisos[0] as any).behavior).toBe('allow')
    expect((permisos[0] as any).destination).toBe('session')
  })

  test('5. una ruta RELATIVA no la lleva', async () => {
    sembrarEquipo({
      leadAgentId: 'lead@eq',
      members: [miembro('lead'), miembro('ana')],
      teamAllowedPaths: [{ toolName: 'Read', path: 'docs' }],
    })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    expect((permisos[0] as any).rules[0].ruleContent).toBe('docs/**')
  })

  test('6. sin rutas concedidas, no se aplica ningún permiso', async () => {
    sembrarEquipo({ leadAgentId: 'lead@eq', members: [miembro('lead'), miembro('ana')] })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    expect(permisos.length).toBe(0)
  })

  test('7. el LÍDER también recibe los permisos del equipo', async () => {
    sembrarEquipo({
      leadAgentId: 'lead@eq',
      members: [miembro('lead')],
      teamAllowedPaths: [{ toolName: 'Read', path: 'docs' }],
    })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'lead@eq',
      agentName: 'lead',
    })
    // Los permisos se aplican ANTES del corte por liderazgo: son del equipo,
    // no del rol, y el líder trabaja sobre las mismas rutas.
    expect(permisos.length).toBe(1)
    expect(hooks.length).toBe(0)
  })
})

describe('el manejador de parada', () => {
  async function registrar(nombreLider = 'lead') {
    sembrarEquipo({
      leadAgentId: 'lead@eq',
      members: [miembro(nombreLider, { agentId: 'lead@eq' }), miembro('ana')],
    })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    return hooks[0]!.manejador as (
      msgs: unknown[],
      s: unknown,
    ) => Promise<boolean>
  }

  test('8. escribe el aviso en el buzón del líder, por NOMBRE', async () => {
    const manejador = await registrar('jefa')
    expect(await manejador([], undefined)).toBe(true)
    // El buzón se indexa por nombre de agente, no por identificador: el
    // identificador no aparece en ninguna ruta.
    const ms = JSON.parse(readFileSync(buzon('jefa'), 'utf-8'))
    expect(ms.length).toBe(1)
    expect(ms[0].from).toBe('ana')
    expect(ms[0].color).toBe('red')
    expect(JSON.parse(ms[0].text).type).toBe('idle_notification')
  })

  test('9. si el líder no está en el roster, cae al nombre reservado', async () => {
    sembrarEquipo({ leadAgentId: 'fantasma@eq', members: [miembro('ana')] })
    const m = await import('../src/core/teammateInit.ts')
    m.initializeTeammateHooks(fijarEstado, 's1', {
      teamName: 'eq',
      agentId: 'ana@eq',
      agentName: 'ana',
    })
    const manejador = hooks[0]!.manejador as (m: unknown[], s: unknown) => Promise<boolean>
    await manejador([], undefined)
    // Sin el respaldo, el aviso iría a un buzón llamado `undefined` y el líder
    // no se enteraría nunca de que su compañero terminó.
    expect(JSON.parse(readFileSync(buzon('team-lead'), 'utf-8')).length).toBe(1)
  })

  test('10. marca al compañero como ocioso en el archivo del equipo', async () => {
    const manejador = await registrar()
    await manejador([], undefined)
    await Bun.sleep(20)
    const f = JSON.parse(
      readFileSync(join(raiz, 'teams', 'eq', 'config.json'), 'utf-8'),
    )
    expect(f.members.find((x: any) => x.name === 'ana').isActive).toBe(false)
  })

  test('11. el manejador NO bloquea la parada', async () => {
    const manejador = await registrar()
    // Devolver falso dejaría al compañero sin poder terminar: el aviso es
    // cortesía hacia el líder, no una condición para apagarse.
    expect(await manejador([], undefined)).toBe(true)
  })
})
