/**
 * La mitad ROJA de dos módulos de swarm: el adaptador de pane a ejecutor y el
 * instalador de `it2`.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/{PaneBackendExecutor.ts,
 * it2Setup.ts}` (359 + 245 líneas). Ese árbol declara `"license":
 * "UNLICENSED"`, así que los cuerpos se reimplementan y no se copian.
 *
 * POR QUÉ ESTOS DOS. Medido sobre la frontera del paquete: son los dos únicos
 * de `backends/` sin hermano ausente — `it2Setup` sólo importa `os`, y
 * `PaneBackendExecutor` no importa nada externo. Juntos desbloquean
 * `backends/registry.ts`, que es lo que a su vez retiene a `TmuxBackend`,
 * `ITermBackend` y la parcial declarada de `killOrphanedTeammatePanes`.
 *
 * Métrica: la conducta de cada función contra un doble de backend que cuenta
 * sus llamadas, y contra un árbol de buzones REAL bajo `/dev/shm`.
 * Ciega a: si un `it2` o un tmux de verdad responden como el módulo asume —
 * eso lo decide el entorno, no el módulo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []
let errores: unknown[] = []
/** Cada invocación de un ejecutable externo, con su cwd si lo declaró. */
let ejecutados: { cmd: string; args: string[]; cwd?: string }[] = []
/** Lo que el doble de `execFileNoThrow*` devuelve, por ejecutable. */
let respuestas: Record<string, { code: number; stdout: string; stderr: string }> = {}
/** El estado de la configuración global, y cada escritura sobre ella. */
let config: Record<string, unknown> = {}
let guardados = 0

function responde(cmd: string, args: string[]) {
  const clave = `${cmd} ${args.join(' ')}`
  return (
    respuestas[clave] ??
    respuestas[cmd] ?? { code: 1, stdout: '', stderr: 'no declarado' }
  )
}

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = (s: string) => trazas.push(s)
  mapa.logError = (e: unknown) => errores.push(e)
  mapa.execFileNoThrow = async (cmd: string, args: string[]) => {
    ejecutados.push({ cmd, args })
    return responde(cmd, args)
  }
  mapa.execFileNoThrowWithCwd = async (
    cmd: string,
    args: string[],
    opts: { cwd?: string },
  ) => {
    ejecutados.push({ cmd, args, cwd: opts?.cwd })
    return responde(cmd, args)
  }
  mapa.getGlobalConfig = () => config
  mapa.saveGlobalConfig = (f: (c: Record<string, unknown>) => Record<string, unknown>) => {
    guardados += 1
    config = f(config)
  }
  // Los del lado del ejecutor de panes.
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
  mapa.generateRequestId = (t: string, d: string) => `${t}-${d}-1`
  mapa.formatAgentId = (n: string, e: string) => `${n}@${e}`
  mapa.parseAgentId = (id: string) => {
    const [agentName, teamName] = id.split('@')
    return agentName && teamName ? { agentName, teamName } : null
  }
  mapa.quote = (xs: string[]) => xs.map(x => `'${x}'`).join(' ')
  mapa.getSessionId = () => 'sesion-de-prueba'
  mapa.registerCleanup = (f: () => Promise<void>) => {
    limpiezas.push(f)
  }
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

let limpiezas: (() => Promise<void>)[] = []

/** Un doble de `PaneBackend` que registra cada llamada que recibe. */
function backendDoble(encima: Record<string, unknown> = {}) {
  const llamadas: { metodo: string; args: unknown[] }[] = []
  const registra =
    (metodo: string, retorno: unknown = undefined) =>
    async (...args: unknown[]) => {
      llamadas.push({ metodo, args })
      return retorno
    }
  const doble = {
    type: 'tmux',
    displayName: 'tmux',
    supportsHideShow: true,
    llamadas,
    isAvailable: registra('isAvailable', true),
    isRunningInside: registra('isRunningInside', true),
    createTeammatePaneInSwarmView: registra('createTeammatePaneInSwarmView', {
      paneId: '%7',
      isFirstTeammate: true,
    }),
    sendCommandToPane: registra('sendCommandToPane'),
    setPaneBorderColor: registra('setPaneBorderColor'),
    setPaneTitle: registra('setPaneTitle'),
    enablePaneBorderStatus: registra('enablePaneBorderStatus'),
    rebalancePanes: registra('rebalancePanes'),
    killPane: registra('killPane', true),
    hidePane: registra('hidePane', true),
    showPane: registra('showPane', true),
    ...encima,
  }
  return doble
}

function contexto(mode = 'default') {
  return {
    getAppState: () => ({ toolPermissionContext: { mode } }),
  }
}

function configSpawn(encima: Record<string, unknown> = {}) {
  return {
    name: 'ana',
    teamName: 'eq',
    prompt: 'haz esto',
    cwd: '/w',
    parentSessionId: '',
    ...encima,
  }
}

function buzon(agente: string, equipo = 'eq'): unknown[] {
  return JSON.parse(
    readFileSync(join(raiz, 'teams', equipo, 'inboxes', `${agente}.json`), 'utf-8'),
  )
}

beforeEach(() => {
  raiz = mkdtempSync('/dev/shm/pane-it2-')
  trazas = []
  errores = []
  ejecutados = []
  respuestas = {}
  config = {}
  guardados = 0
  limpiezas = []
})

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
  const d = await import('../src/backends/detection.ts')
  d.resetDetectionCache()
  rmSync(raiz, { recursive: true, force: true })
})

describe('detectPythonPackageManager — el gestor por orden de preferencia', () => {
  test('1. con uv presente devuelve «uvx» y no sigue preguntando', async () => {
    respuestas['which uv'] = { code: 0, stdout: '/usr/bin/uv', stderr: '' }
    respuestas['which pipx'] = { code: 0, stdout: '/usr/bin/pipx', stderr: '' }
    await instalar()
    const { detectPythonPackageManager } = await import('../src/backends/it2Setup.ts')
    expect(await detectPythonPackageManager()).toBe('uvx')
    // La preferencia sólo es preferencia si CORTA: preguntar por los demás
    // habiendo encontrado el primero deja la puerta a que un orden distinto
    // gane por accidente.
    expect(ejecutados.map(e => e.args[0])).toEqual(['uv'])
  })

  test('2. sin uv, cae a pipx', async () => {
    respuestas['which pipx'] = { code: 0, stdout: '/usr/bin/pipx', stderr: '' }
    await instalar()
    const { detectPythonPackageManager } = await import('../src/backends/it2Setup.ts')
    expect(await detectPythonPackageManager()).toBe('pipx')
  })

  test('3. con sólo pip3 devuelve «pip», no «pip3»', async () => {
    respuestas['which pip3'] = { code: 0, stdout: '/usr/bin/pip3', stderr: '' }
    await instalar()
    const { detectPythonPackageManager } = await import('../src/backends/it2Setup.ts')
    // `pip3` NO es un valor del tipo: la rama existe para descubrirlo en el
    // sistema, no para nombrarlo. Devolverlo tal cual rompería el `switch` de
    // `installIt2`, que no tiene esa rama.
    expect(await detectPythonPackageManager()).toBe('pip')
  })

  test('4. sin ninguno, null', async () => {
    await instalar()
    const { detectPythonPackageManager } = await import('../src/backends/it2Setup.ts')
    expect(await detectPythonPackageManager()).toBeNull()
    expect(ejecutados.map(e => e.args[0])).toEqual(['uv', 'pipx', 'pip', 'pip3'])
  })
})

describe('installIt2 — la instalación corre desde el directorio del usuario', () => {
  test('5. con uv, ejecuta «uv tool install» con cwd en el home', async () => {
    respuestas['uv'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const { installIt2 } = await import('../src/backends/it2Setup.ts')
    const r = await installIt2('uvx')
    expect(r.success).toBe(true)
    const uv = ejecutados.find(e => e.cmd === 'uv')
    expect(uv?.args).toEqual(['tool', 'install', 'it2'])
    // El cwd NO es cosmética: un `pip.conf` o un `uv.toml` del proyecto puede
    // redirigir el índice de paquetes a un servidor ajeno, así que la
    // instalación se hace donde ese archivo no manda.
    expect(uv?.cwd).toBe(process.env.HOME ?? uv?.cwd)
    expect(uv?.cwd).not.toBe(process.cwd())
  })

  test('6. con pip, reintenta con pip3 cuando pip falla', async () => {
    respuestas['pip'] = { code: 1, stdout: '', stderr: 'no existe pip' }
    respuestas['pip3'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const { installIt2 } = await import('../src/backends/it2Setup.ts')
    const r = await installIt2('pip')
    expect(r.success).toBe(true)
    expect(ejecutados.map(e => e.cmd)).toEqual(['pip', 'pip3'])
    expect(ejecutados[1]?.args).toEqual(['install', '--user', 'it2'])
  })

  test('7. al fallar, devuelve el stderr y lo registra como error', async () => {
    respuestas['pipx'] = { code: 1, stdout: '', stderr: 'sin red' }
    await instalar()
    const { installIt2 } = await import('../src/backends/it2Setup.ts')
    const r = await installIt2('pipx')
    expect(r).toEqual({ success: false, error: 'sin red', packageManager: 'pipx' })
    expect(errores.length).toBe(1)
  })
})

describe('verifyIt2Setup — distinguir «no instalado» de «API apagada»', () => {
  test('8. sin it2 en el PATH, falla sin intentar hablar con iTerm2', async () => {
    await instalar()
    const { verifyIt2Setup } = await import('../src/backends/it2Setup.ts')
    const r = await verifyIt2Setup()
    expect(r.success).toBe(false)
    expect(r.needsPythonApiEnabled).toBeUndefined()
    expect(ejecutados.map(e => e.cmd)).toEqual(['which'])
  })

  test('9. con la API apagada, lo señala aunque el mensaje venga en mayúsculas', async () => {
    respuestas['which it2'] = { code: 0, stdout: '/usr/bin/it2', stderr: '' }
    respuestas['it2'] = { code: 1, stdout: '', stderr: 'Python API Not Enabled' }
    await instalar()
    const { verifyIt2Setup } = await import('../src/backends/it2Setup.ts')
    const r = await verifyIt2Setup()
    // El mensaje lo escribe iTerm2, no nosotros: comparar sin normalizar la
    // caja convierte el diagnóstico útil en un fallo genérico.
    expect(r.needsPythonApiEnabled).toBe(true)
  })

  test('10. con un fallo ajeno a la API, no lo confunde con la API', async () => {
    respuestas['which it2'] = { code: 0, stdout: '/usr/bin/it2', stderr: '' }
    respuestas['it2'] = { code: 1, stdout: '', stderr: 'disco lleno' }
    await instalar()
    const { verifyIt2Setup } = await import('../src/backends/it2Setup.ts')
    const r = await verifyIt2Setup()
    expect(r.needsPythonApiEnabled).toBeUndefined()
    expect(r.error).toBe('disco lleno')
  })

  test('11. con todo en su sitio, éxito y la sesión se listó', async () => {
    respuestas['which it2'] = { code: 0, stdout: '/usr/bin/it2', stderr: '' }
    respuestas['it2'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const { verifyIt2Setup } = await import('../src/backends/it2Setup.ts')
    expect(await verifyIt2Setup()).toEqual({ success: true })
    expect(ejecutados.find(e => e.cmd === 'it2')?.args).toEqual(['session', 'list'])
  })
})

describe('las tres banderas de configuración', () => {
  test('12. markIt2SetupComplete no reescribe una configuración ya marcada', async () => {
    config = { iterm2It2SetupComplete: true }
    await instalar()
    const { markIt2SetupComplete } = await import('../src/backends/it2Setup.ts')
    markIt2SetupComplete()
    // Guardar sin cambio no es inocuo: `saveGlobalConfig` reescribe el archivo
    // global, y hacerlo en cada arranque multiplica el riesgo de perder la
    // configuración de otro proceso por una escritura que no hacía falta.
    expect(guardados).toBe(0)
  })

  test('13. markIt2SetupComplete escribe cuando falta la marca', async () => {
    await instalar()
    const { markIt2SetupComplete } = await import('../src/backends/it2Setup.ts')
    markIt2SetupComplete()
    expect(guardados).toBe(1)
    expect(config.iterm2It2SetupComplete).toBe(true)
  })

  test('14. setPreferTmuxOverIterm2 sólo escribe cuando el valor cambia', async () => {
    await instalar()
    const m = await import('../src/backends/it2Setup.ts')
    m.setPreferTmuxOverIterm2(true)
    m.setPreferTmuxOverIterm2(true)
    expect(guardados).toBe(1)
    m.setPreferTmuxOverIterm2(false)
    expect(guardados).toBe(2)
  })

  test('15. getPreferTmuxOverIterm2 exige el booleano, no un valor camuflado', async () => {
    config = { preferTmuxOverIterm2: 'true' }
    await instalar()
    const { getPreferTmuxOverIterm2 } = await import('../src/backends/it2Setup.ts')
    // La comparación estricta es el punto: una cadena `'true'` leída de un
    // JSON corrupto no debe encender una preferencia que el usuario no fijó.
    expect(getPreferTmuxOverIterm2()).toBe(false)
  })
})

describe('PaneBackendExecutor — el adaptador de pane a ejecutor', () => {
  test('16. hereda el tipo del backend y le delega la disponibilidad', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    expect(e.type).toBe('tmux')
    expect(await e.isAvailable()).toBe(true)
    expect(b.llamadas.map(l => l.metodo)).toEqual(['isAvailable'])
  })

  test('17. spawn sin contexto rehúsa y NO toca el backend', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    const r = await e.spawn(configSpawn() as never)
    expect(r.success).toBe(false)
    expect(r.agentId).toBe('ana@eq')
    // Crear el pane antes de descubrir que falta el contexto dejaría un pane
    // huérfano en la pantalla del usuario, sin proceso dentro.
    expect(b.llamadas.length).toBe(0)
  })

  test('18. spawn arma el comando con el directorio, el binario y la identidad', async () => {
    process.env.TMUX = '/tmp/tmux-1000/default,1,0'
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    const r = await e.spawn(configSpawn({ color: 'rojo' }) as never)
    delete process.env.TMUX
    expect(r.success).toBe(true)
    expect(r.paneId).toBe('%7')
    const envio = b.llamadas.find(l => l.metodo === 'sendCommandToPane')
    const cmd = String(envio?.args[1])
    expect(cmd).toContain("cd '/w'")
    expect(cmd).toContain("--agent-id 'ana@eq'")
    expect(cmd).toContain("--team-name 'eq'")
    expect(cmd).toContain("--agent-color 'rojo'")
    // Sin sesión padre declarada, la hereda de la sesión viva: un compañero
    // sin padre queda huérfano en el registro de sesiones.
    expect(cmd).toContain("--parent-session-id 'sesion-de-prueba'")
  })

  test('19. el envío usa la sesión externa exactamente cuando NO hay tmux', async () => {
    delete process.env.TMUX
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn() as never)
    const envio = b.llamadas.find(l => l.metodo === 'sendCommandToPane')
    // La bandera es la NEGACIÓN de «estoy dentro de tmux»: invertirla manda el
    // comando por el socket equivocado y el pane se queda mudo.
    expect(envio?.args[2]).toBe(true)
    // Y fuera de tmux no se toca el borde: la opción no existe en ese modo.
    expect(b.llamadas.some(l => l.metodo === 'enablePaneBorderStatus')).toBe(false)
  })

  test('20. dentro de tmux y siendo el primero, enciende el borde de estado', async () => {
    process.env.TMUX = '/tmp/tmux-1000/default,1,0'
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn() as never)
    delete process.env.TMUX
    expect(b.llamadas.some(l => l.metodo === 'enablePaneBorderStatus')).toBe(true)
    expect(
      b.llamadas.find(l => l.metodo === 'sendCommandToPane')?.args[2],
    ).toBe(false)
  })

  test('21. un modelo propio SUSTITUYE al heredado, no se suma', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn({ model: 'claude-fable-5-1' }) as never)
    const cmd = String(
      b.llamadas.find(l => l.metodo === 'sendCommandToPane')?.args[1],
    )
    // Dos `--model` en la misma línea es un comportamiento que decide el
    // analizador de argumentos del hijo, no nosotros: se emite uno.
    expect(cmd.match(/--model/g)?.length).toBe(1)
    expect(cmd).toContain("--model 'claude-fable-5-1'")
  })

  test('22. el prompt inicial llega por el buzón, no por el pane', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn({ prompt: 'audita el árbol' }) as never)
    const mensajes = buzon('ana') as { from: string; text: string }[]
    expect(mensajes.length).toBe(1)
    expect(mensajes[0]?.from).toBe('team-lead')
    expect(mensajes[0]?.text).toBe('audita el árbol')
  })

  test('23. la limpieza se registra UNA vez y mata los panes de todos', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble({
      createTeammatePaneInSwarmView: async (nombre: string) => ({
        paneId: `%${nombre}`,
        isFirstTeammate: false,
      }),
    })
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn({ name: 'ana' }) as never)
    await e.spawn(configSpawn({ name: 'bea' }) as never)
    // Registrar una limpieza por spawn dejaría N cierres compitiendo por el
    // mismo mapa al salir el líder.
    expect(limpiezas.length).toBe(1)
    await limpiezas[0]?.()
    const matados = b.llamadas.filter(l => l.metodo === 'killPane').map(l => l.args[0])
    expect(matados.sort()).toEqual(['%ana', '%bea'])
  })

  test('24. sendMessage rehúsa un identificador mal formado', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const e = createPaneBackendExecutor(backendDoble() as never)
    await expect(
      e.sendMessage('ana', { text: 'hola', from: 'team-lead' }),
    ).rejects.toThrow(/ana/)
  })

  test('25. sendMessage escribe en el buzón del equipo que el identificador nombra', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const e = createPaneBackendExecutor(backendDoble() as never)
    await e.sendMessage('ana@otro', { text: 'hola', from: 'bea', color: 'azul' })
    const mensajes = buzon('ana', 'otro') as { from: string; color?: string }[]
    expect(mensajes.length).toBe(1)
    expect(mensajes[0]?.from).toBe('bea')
    expect(mensajes[0]?.color).toBe('azul')
  })

  test('26. terminate manda una petición de apagado por el buzón', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const e = createPaneBackendExecutor(backendDoble() as never)
    expect(await e.terminate('ana@eq', 'fin del trabajo')).toBe(true)
    const mensajes = buzon('ana') as { text: string }[]
    const cuerpo = JSON.parse(mensajes[0]!.text)
    // Terminar es una PETICIÓN, no una orden: el compañero cierra lo suyo y
    // sale. Matarle el pane aquí le quitaría la oportunidad.
    expect(cuerpo.type).toBe('shutdown_request')
    expect(cuerpo.reason).toBe('fin del trabajo')
  })

  test('27. terminate con identificador inválido devuelve false y no escribe', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const e = createPaneBackendExecutor(backendDoble() as never)
    expect(await e.terminate('ana')).toBe(false)
  })

  test('28. kill sólo alcanza a quien este ejecutor engendró', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    // Sin registro previo no hay pane que matar, y adivinarlo mataría el de
    // otro: el mapa es la única fuente de la correspondencia.
    expect(await e.kill('ana@eq')).toBe(false)
    expect(b.llamadas.some(l => l.metodo === 'killPane')).toBe(false)
  })

  test('29. kill mata el pane, lo olvida, y el segundo intento ya no encuentra nada', async () => {
    delete process.env.TMUX
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble()
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn() as never)
    expect(await e.kill('ana@eq')).toBe(true)
    const muerte = b.llamadas.find(l => l.metodo === 'killPane')
    expect(muerte?.args).toEqual(['%7', true])
    expect(await e.kill('ana@eq')).toBe(false)
  })

  test('30. un fallo del backend deja el registro intacto', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble({ killPane: async () => false })
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    await e.spawn(configSpawn() as never)
    expect(await e.kill('ana@eq')).toBe(false)
    // Olvidarlo tras un fallo lo volvería inalcanzable para siempre: el pane
    // sigue vivo y ya nadie sabe cuál es.
    expect(await e.isActive('ana@eq')).toBe(true)
  })

  test('31. isActive es falso para quien no engendró', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const e = createPaneBackendExecutor(backendDoble() as never)
    expect(await e.isActive('ana@eq')).toBe(false)
  })

  test('32. un error del backend se devuelve como fallo, no se propaga', async () => {
    await instalar()
    const { createPaneBackendExecutor } = await import(
      '../src/backends/PaneBackendExecutor.ts'
    )
    const b = backendDoble({
      createTeammatePaneInSwarmView: async () => {
        throw new Error('sin espacio en la ventana')
      },
    })
    const e = createPaneBackendExecutor(b as never)
    e.setContext(contexto() as never)
    const r = await e.spawn(configSpawn() as never)
    // El líder está en medio de una tanda: una excepción que sube aborta el
    // resto de los compañeros por el fallo de uno.
    expect(r.success).toBe(false)
    expect(r.error).toBe('sin espacio en la ventana')
  })
})
