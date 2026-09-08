/**
 * La mitad ROJA de `teamDiscovery` y del barril que lo alimenta.
 *
 * Procedencia: `ccnmt: packages/swarm/src/teamDiscovery.ts` (80 líneas, 3
 * símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se reimplementa y no se copia.
 *
 * POR QUÉ VA CON EL BARRIL. `teamDiscovery` no importa de `core/teamHelpers`
 * sino del **barril** del paquete, así que el porte no cierra si el barril no
 * reexporta lo que el cierre de `teamHelpers` añadió. El primer caso mide eso
 * y no la lectura: un barril incompleto rompe al consumidor sin que ningún
 * test del módulo dueño lo note.
 *
 * Métrica: lo que la función devuelve para un roster sembrado en disco.
 * Ciega a: si un compañero está VIVO de verdad — el estado sale de la bandera
 * que el propio compañero escribe, no de mirar su proceso.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''

async function instalar(): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = () => undefined
  mapa.logError = () => undefined
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.errorMessage = (e: unknown) => String((e as Error)?.message ?? e)
  mapa.jsonParse = (s: string) => JSON.parse(s)
  m.installSwarmAppRuntime(mapa)
}

function sembrar(equipo: string, contenido: unknown): void {
  const dir = join(raiz, 'teams', equipo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'config.json'), JSON.stringify(contenido), 'utf-8')
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

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/discovery-')
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('el barril reexporta la superficie de teamHelpers', () => {
  test('1. los 19 símbolos de E/S salen por el barril del paquete', async () => {
    const b = await import('../src/index.ts')
    // `teamDiscovery` importa del barril, no del módulo dueño: un barril
    // incompleto rompe al consumidor sin que ningún test de `teamHelpers` lo
    // note.
    for (const n of [
      'getTeamDir',
      'getTeamFilePath',
      'readTeamFile',
      'readTeamFileAsync',
      'writeTeamFileAsync',
      'updateTeamFileAsync',
      'removeTeammateFromTeamFile',
      'addHiddenPaneId',
      'removeHiddenPaneId',
      'removeMemberFromTeam',
      'removeMemberByAgentId',
      'setMemberMode',
      'syncTeammateMode',
      'setMultipleMemberModes',
      'setMemberActive',
      'registerTeamForSessionCleanup',
      'unregisterTeamForSessionCleanup',
      'cleanupSessionTeams',
      'cleanupTeamDirectories',
    ]) {
      expect(typeof (b as Record<string, unknown>)[n]).toBe('function')
    }
  })
})

describe('getTeammateStatuses — el roster que ve la interfaz', () => {
  test('2. un equipo que no existe da una lista vacía, no un fallo', async () => {
    const m = await import('../src/teamDiscovery.ts')
    expect(m.getTeammateStatuses('fantasma')).toEqual([])
  })

  test('3. el líder NO aparece en la lista de compañeros', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [miembro('team-lead'), miembro('ana')],
    })
    const m = await import('../src/teamDiscovery.ts')
    // El líder es quien mira la lista: incluirse a sí mismo entre sus
    // compañeros descuadra todo conteo que la interfaz haga con ella.
    expect(m.getTeammateStatuses('eq').map(s => s.name)).toEqual(['ana'])
  })

  test('4. sin bandera de actividad, un compañero cuenta como activo', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [miembro('ana')],
    })
    const m = await import('../src/teamDiscovery.ts')
    // La bandera la escribe el propio compañero al quedarse ocioso. Uno recién
    // dado de alta todavía no la escribió, y leer su ausencia como «ocioso»
    // mostraría inactivo a quien acaba de arrancar.
    expect(m.getTeammateStatuses('eq')[0]!.status).toBe('running')
  })

  test('5. sólo el false explícito lo marca ocioso', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [miembro('ana', { isActive: false }), miembro('leo', { isActive: true })],
    })
    const m = await import('../src/teamDiscovery.ts')
    const s = m.getTeammateStatuses('eq')
    expect(s.map(x => x.status)).toEqual(['idle', 'running'])
  })

  test('6. un panel en la lista de ocultos se marca oculto', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [miembro('ana'), miembro('leo')],
      hiddenPaneIds: ['%ana'],
    })
    const m = await import('../src/teamDiscovery.ts')
    expect(m.getTeammateStatuses('eq').map(x => x.isHidden)).toEqual([true, false])
  })

  test('7. un tipo de respaldo que NO es de panel se descarta', async () => {
    sembrar('eq', {
      name: 'eq',
      createdAt: 1,
      leadAgentId: 'lead@eq',
      leadSessionId: 's0',
      members: [
        miembro('ana', { backendType: 'tmux' }),
        miembro('leo', { backendType: 'in-process' }),
      ],
    })
    const m = await import('../src/teamDiscovery.ts')
    const s = m.getTeammateStatuses('eq')
    // El campo describe QUÉ PANEL usa. Un compañero en proceso no tiene panel
    // propio, así que dejar ahí su tipo invitaría a la interfaz a ofrecer
    // acciones de panel que no existen.
    expect(s[0]!.backendType).toBe('tmux')
    expect(s[1]!.backendType).toBe(undefined)
  })
})
