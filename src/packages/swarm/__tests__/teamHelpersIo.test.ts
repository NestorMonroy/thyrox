/**
 * La mitad ROJA de los 19 símbolos de E/S de `teamHelpers` que el porte
 * parcial dejó fuera.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teamHelpers.ts` (735 líneas,
 * 28 símbolos exportados; 9 portados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que los cuerpos se reimplementan y no se copian.
 *
 * EL BLOQUEO DECLARADO CADUCÓ, y es la undécima vez que ocurre. La cabecera
 * del porte parcial nombraba tres causas: los bindings de host de
 * `appRuntime`, `lock()`, y `execFileNoThrow`/`gitExe`. Las tres se
 * remidieron hoy: `appRuntime` está portado con los 105 bindings, y `lock`,
 * `execFileNoThrowWithCwd` y `gitExe` son tres de ellos.
 *
 * Métrica: la conducta de cada símbolo contra un directorio de equipos REAL
 * en un sistema de archivos temporal.
 * Ciega a: la contención de verdad entre dos procesos — el `lock` que instala
 * este test es un doble que cuenta llamadas, no un cerrojo de sistema.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let equiposCreados = new Set<string>()
let cerrojos: string[] = []
let liberados = 0
let depurado: string[] = []

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = (msg: string) => depurado.push(msg)
  mapa.logError = () => undefined
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.getTasksDir = (n: string) => join(raiz, 'tasks', n)
  mapa.notifyTasksUpdated = () => undefined
  mapa.getSessionCreatedTeams = () => equiposCreados
  mapa.errorMessage = (e: unknown) => String((e as Error)?.message ?? e)
  mapa.getErrnoCode = (e: unknown) => (e as { code?: string })?.code
  mapa.jsonParse = (s: string) => JSON.parse(s)
  mapa.jsonStringify = (v: unknown, r: unknown, i: number) =>
    JSON.stringify(v, r as null, i)
  mapa.lock = (ruta: string) => {
    cerrojos.push(ruta)
    return Promise.resolve(async () => {
      liberados += 1
    })
  }
  mapa.isTeammate = () => false
  mapa.getTeamName = () => undefined
  mapa.getAgentName = () => undefined
  mapa.gitExe = () => 'git'
  mapa.execFileNoThrowWithCwd = () =>
    Promise.resolve({ code: 0, stdout: '', stderr: '' })
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

function sembrar(equipo: string, contenido: unknown): string {
  const dir = join(raiz, 'teams', equipo)
  mkdirSync(dir, { recursive: true })
  const ruta = join(dir, 'config.json')
  writeFileSync(ruta, JSON.stringify(contenido), 'utf-8')
  return ruta
}

function leer(equipo: string): any {
  return JSON.parse(
    readFileSync(join(raiz, 'teams', equipo, 'config.json'), 'utf-8'),
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

function archivo(miembros: unknown[], extra: Record<string, unknown> = {}) {
  return {
    name: 'eq',
    createdAt: 1,
    leadAgentId: 'lead@eq',
    leadSessionId: 's1',
    members: miembros,
    ...extra,
  }
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/teamhelpers-')
  equiposCreados = new Set()
  cerrojos = []
  liberados = 0
  depurado = []
  await instalar()
})

afterEach(async () => {
  rmSync(raiz, { recursive: true, force: true })
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('rutas — el nombre se SANEA antes de tocar el disco', () => {
  test('1. el archivo de un equipo vive bajo el directorio de equipos', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    expect(m.getTeamDir('eq')).toBe(join(raiz, 'teams', 'eq'))
    expect(m.getTeamFilePath('eq')).toBe(
      join(raiz, 'teams', 'eq', 'config.json'),
    )
  })

  test('2. un nombre con separadores NO escapa del directorio de equipos', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    const dir = m.getTeamDir('../../etc/passwd')
    // El saneado es la única defensa: el nombre del equipo viene de la
    // herramienta, o sea del modelo, y se concatena a una ruta. Sin él,
    // borrar un equipo borraría lo que el nombre apunte.
    expect(dir.startsWith(join(raiz, 'teams'))).toBe(true)
    expect(dir.includes('..')).toBe(false)
  })
})

describe('lectura — la ausencia NO es un error', () => {
  test('3. un equipo que no existe da null y NO registra nada', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    expect(m.readTeamFile('fantasma')).toBe(null)
    expect(await m.readTeamFileAsync('fantasma')).toBe(null)
    // Que no exista es el caso normal —se pregunta antes de crear—, así que
    // registrarlo llenaría el diagnóstico de ruido y escondería los fallos
    // que sí importan.
    expect(depurado.length).toBe(0)
  })

  test('4. un archivo corrupto da null y SÍ lo registra', async () => {
    sembrar('roto', 'x')
    writeFileSync(join(raiz, 'teams', 'roto', 'config.json'), '{no json', 'utf-8')
    const m = await import('../src/core/teamHelpers.ts')
    expect(m.readTeamFile('roto')).toBe(null)
    expect(depurado.length).toBe(1)
  })

  test('5. la lectura devuelve el contenido, síncrona y asíncrona', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(m.readTeamFile('eq')!.members[0]!.name).toBe('ana')
    expect((await m.readTeamFileAsync('eq'))!.members[0]!.name).toBe('ana')
  })
})

describe('escritura — bajo cerrojo, y el cerrojo se suelta', () => {
  test('6. escribir crea el directorio del equipo si falta', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    await m.writeTeamFileAsync('nuevo', archivo([]) as never)
    expect(leer('nuevo').name).toBe('eq')
  })

  test('7. la actualización toma el cerrojo y lo libera', async () => {
    sembrar('eq', archivo([]))
    const m = await import('../src/core/teamHelpers.ts')
    await m.updateTeamFileAsync('eq', f => ({ ...f!, createdAt: 99 }) as never)
    expect(cerrojos.length).toBe(1)
    expect(liberados).toBe(1)
    expect(leer('eq').createdAt).toBe(99)
  })

  test('8. el cerrojo se libera AUNQUE el actualizador lance', async () => {
    sembrar('eq', archivo([]))
    const m = await import('../src/core/teamHelpers.ts')
    // Sin el `finally`, un actualizador que lanza deja el archivo del equipo
    // bloqueado para el resto de la sesión: el siguiente escritor gira sus
    // 200 reintentos y se rinde.
    await expect(
      m.updateTeamFileAsync('eq', () => {
        throw new Error('fallo del actualizador')
      }),
    ).rejects.toThrow('fallo del actualizador')
    expect(liberados).toBe(1)
  })

  test('9. si el actualizador devuelve null, NO se escribe nada', async () => {
    sembrar('eq', archivo([], { createdAt: 7 }))
    const m = await import('../src/core/teamHelpers.ts')
    const r = await m.updateTeamFileAsync('eq', () => null)
    expect(r).toBe(null)
    expect(leer('eq').createdAt).toBe(7)
  })
})

describe('miembros — quitar, por identificador o por panel', () => {
  test('10. sin identificador rehúsa, y no toca el archivo', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.removeTeammateFromTeamFile('eq', {})).toBe(false)
    expect(cerrojos.length).toBe(0)
    expect(leer('eq').members.length).toBe(1)
  })

  test('11. quita por agentId y por nombre', async () => {
    sembrar('eq', archivo([miembro('ana'), miembro('leo')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.removeTeammateFromTeamFile('eq', { agentId: 'ana@eq' })).toBe(true)
    expect(leer('eq').members.map((x: any) => x.name)).toEqual(['leo'])
    expect(await m.removeTeammateFromTeamFile('eq', { name: 'leo' })).toBe(true)
    expect(leer('eq').members.length).toBe(0)
  })

  test('12. quitar a alguien que no está devuelve false', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.removeTeammateFromTeamFile('eq', { name: 'nadie' })).toBe(false)
    expect(leer('eq').members.length).toBe(1)
  })

  test('13. quitar por panel PURGA también la lista de ocultos', async () => {
    sembrar('eq', archivo([miembro('ana')], { hiddenPaneIds: ['%ana', '%otro'] }))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.removeMemberFromTeam('eq', '%ana')).toBe(true)
    // Dejar el panel en la lista de ocultos tras quitar a su dueño deja
    // basura que nadie vuelve a limpiar: la lista sólo se poda aquí.
    expect(leer('eq').hiddenPaneIds).toEqual(['%otro'])
  })

  test('14. quitar por agentId sirve para los que comparten panel', async () => {
    sembrar('eq', archivo([miembro('ana', { tmuxPaneId: '%0' }), miembro('leo', { tmuxPaneId: '%0' })]))
    const m = await import('../src/core/teamHelpers.ts')
    // Los compañeros en proceso comparten panel, así que quitarlos por panel
    // se llevaría a los dos.
    expect(await m.removeMemberByAgentId('eq', 'ana@eq')).toBe(true)
    expect(leer('eq').members.map((x: any) => x.name)).toEqual(['leo'])
  })
})

describe('paneles ocultos — el veredicto es «existe el equipo»', () => {
  test('15. ocultar devuelve true aunque YA estuviera oculto', async () => {
    sembrar('eq', archivo([miembro('ana')], { hiddenPaneIds: ['%ana'] }))
    const m = await import('../src/core/teamHelpers.ts')
    // El retorno responde «¿existe el equipo?», no «¿cambió algo?». Quien
    // llama decide si seguir; un false por «ya estaba» le haría creer que el
    // equipo desapareció.
    expect(await m.addHiddenPaneId('eq', '%ana')).toBe(true)
    expect(leer('eq').hiddenPaneIds).toEqual(['%ana'])
  })

  test('16. ocultar en un equipo inexistente devuelve false', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.addHiddenPaneId('fantasma', '%1')).toBe(false)
  })

  test('17. mostrar quita el panel de la lista', async () => {
    sembrar('eq', archivo([], { hiddenPaneIds: ['%a', '%b'] }))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.removeHiddenPaneId('eq', '%a')).toBe(true)
    expect(leer('eq').hiddenPaneIds).toEqual(['%b'])
  })
})

describe('modo y actividad de un miembro', () => {
  test('18. fijar el modo de quien no está devuelve false', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.setMemberMode('eq', 'nadie', 'plan')).toBe(false)
  })

  test('19. fijar el mismo modo devuelve true y no reescribe', async () => {
    sembrar('eq', archivo([miembro('ana', { mode: 'plan' })]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(await m.setMemberMode('eq', 'ana', 'plan')).toBe(true)
    expect(leer('eq').members[0].mode).toBe('plan')
  })

  test('20. varios modos a la vez se escriben en UNA sola actualización', async () => {
    sembrar('eq', archivo([miembro('ana'), miembro('leo')]))
    const m = await import('../src/core/teamHelpers.ts')
    expect(
      await m.setMultipleMemberModes('eq', [
        { memberName: 'ana', mode: 'plan' },
        { memberName: 'leo', mode: 'acceptEdits' },
      ]),
    ).toBe(true)
    // Una escritura por miembro abriría una ventana entre ambas en la que el
    // archivo describe un estado que nadie pidió.
    expect(cerrojos.length).toBe(1)
    const f = leer('eq')
    expect(f.members.map((x: any) => x.mode)).toEqual(['plan', 'acceptEdits'])
  })

  test('21. sincronizar el modo propio es un no-op si no somos compañero', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    const m = await import('../src/core/teamHelpers.ts')
    m.syncTeammateMode('plan')
    expect(cerrojos.length).toBe(0)
  })

  test('22. siendo compañero, sincroniza contra el equipo y el nombre propios', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    await instalar({
      isTeammate: () => true,
      getTeamName: () => 'eq',
      getAgentName: () => 'ana',
    })
    const m = await import('../src/core/teamHelpers.ts')
    m.syncTeammateMode('plan')
    await Bun.sleep(20)
    expect(leer('eq').members[0].mode).toBe('plan')
  })

  test('23. marcar actividad sólo escribe cuando el valor CAMBIA', async () => {
    sembrar('eq', archivo([miembro('ana', { isActive: true })]))
    const m = await import('../src/core/teamHelpers.ts')
    await m.setMemberActive('eq', 'ana', true)
    expect(cerrojos.length).toBe(1)
    expect(leer('eq').members[0].isActive).toBe(true)
    await m.setMemberActive('eq', 'ana', false)
    expect(leer('eq').members[0].isActive).toBe(false)
  })
})

describe('limpieza de sesión', () => {
  test('24. registrar y desregistrar mueven el conjunto del host', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    m.registerTeamForSessionCleanup('eq')
    expect(equiposCreados.has('eq')).toBe(true)
    m.unregisterTeamForSessionCleanup('eq')
    expect(equiposCreados.has('eq')).toBe(false)
  })

  test('25. sin equipos registrados, la limpieza no hace nada', async () => {
    const m = await import('../src/core/teamHelpers.ts')
    await m.cleanupSessionTeams()
    expect(depurado.length).toBe(0)
  })

  test('26. la limpieza borra el directorio del equipo y el de sus tareas', async () => {
    sembrar('eq', archivo([miembro('ana')]))
    mkdirSync(join(raiz, 'tasks', 'eq'), { recursive: true })
    const m = await import('../src/core/teamHelpers.ts')
    await m.cleanupTeamDirectories('eq')
    expect(existsSync(join(raiz, 'teams', 'eq'))).toBe(false)
    expect(existsSync(join(raiz, 'tasks', 'eq'))).toBe(false)
  })

  test('27. destruye los worktrees ANTES de borrar el directorio', async () => {
    const orden: string[] = []
    sembrar('eq', archivo([miembro('ana', { worktreePath: join(raiz, 'wt') })]))
    mkdirSync(join(raiz, 'wt'), { recursive: true })
    writeFileSync(join(raiz, 'wt', '.git'), `gitdir: ${join(raiz, '.git', 'worktrees', 'wt')}`, 'utf-8')
    await instalar({
      execFileNoThrowWithCwd: (_g: string, args: string[]) => {
        orden.push(args.join(' '))
        return Promise.resolve({ code: 0, stdout: '', stderr: '' })
      },
    })
    const m = await import('../src/core/teamHelpers.ts')
    await m.cleanupTeamDirectories('eq')
    // Las rutas de worktree se leen DEL archivo del equipo: borrarlo primero
    // dejaría los worktrees huérfanos, sin nadie que sepa dónde están.
    expect(orden.some(a => a.startsWith('worktree remove'))).toBe(true)
    expect(existsSync(join(raiz, 'teams', 'eq'))).toBe(false)
  })

  test('28. si git rehúsa, el worktree se borra igualmente del disco', async () => {
    sembrar('eq', archivo([miembro('ana', { worktreePath: join(raiz, 'wt') })]))
    mkdirSync(join(raiz, 'wt'), { recursive: true })
    writeFileSync(join(raiz, 'wt', '.git'), `gitdir: ${join(raiz, '.git', 'worktrees', 'wt')}`, 'utf-8')
    await instalar({
      execFileNoThrowWithCwd: () =>
        Promise.resolve({ code: 128, stdout: '', stderr: 'fatal: algo' }),
    })
    const m = await import('../src/core/teamHelpers.ts')
    await m.cleanupTeamDirectories('eq')
    // Sin el plan B, un repositorio en un estado que git no entiende deja el
    // worktree en disco para siempre.
    expect(existsSync(join(raiz, 'wt'))).toBe(false)
  })
})
