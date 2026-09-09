/**
 * La mitad ROJA del registro de backends y sus dos respaldos de panel.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/{registry.ts,
 * TmuxBackend.ts,ITermBackend.ts}` (470 + 764 + 370 líneas). Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * POR QUÉ LOS TRES JUNTOS. La circularidad es deliberada y está declarada en
 * la fuente: el registro importa los dos respaldos de forma dinámica y cada
 * respaldo se registra a sí mismo al cargarse. Portar el registro solo dejaría
 * `ensureBackendsRegistered()` apuntando a dos módulos inexistentes — un
 * bloqueo declarado que caduca al minuto siguiente, que es justo la forma que
 * este porte lleva once veces encontrando.
 *
 * Métrica: la conducta de la decisión de backend y de cada orden de panel
 * contra un doble de `execFileNoThrow` que registra sus invocaciones.
 * Ciega a: si un tmux o un iTerm2 de verdad aceptan esos argumentos — eso lo
 * decide el terminal, no el módulo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let raiz = ''
let trazas: string[] = []
let errores: unknown[] = []
let ejecutados: { cmd: string; args: string[] }[] = []
let respuestas: Record<string, { code: number; stdout: string; stderr: string }> = {}
let config: Record<string, unknown> = {}

/**
 * El guion de la sonda de la prioridad 1, que corre con `TMUX` puesto.
 *
 * `detection.ts` congela `process.env.TMUX` al CARGAR el módulo —a propósito,
 * porque la capa de shell la sobrescribe al abrir su propio socket— así que la
 * rama «dentro de tmux» es inalcanzable desde dentro de esta suite.
 */
const GUION_SONDA = `
const RUTA = '${import.meta.dir}/../src'
const m = await import(RUTA + '/adapters/appRuntime.ts')
const mapa = {}
for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
mapa.logForDebugging = () => undefined
mapa.logError = () => undefined
mapa.getGlobalConfig = () => ({})
mapa.getPlatform = () => 'linux'
mapa.getIsNonInteractiveSession = () => false
mapa.count = (xs, p) => xs.filter(p).length
mapa.sleep = () => Promise.resolve()
mapa.execFileNoThrow = async () => ({ code: 0, stdout: '%9', stderr: '' })
m.installSwarmAppRuntime(mapa)

const reg = await import(RUTA + '/backends/registry.ts')
const r = await reg.detectAndGetBackend()
console.log(JSON.stringify({
  tipo: r.backend.type,
  nativo: r.isNative,
  necesitaIt2: r.needsIt2Setup,
  enProceso: reg.isInProcessEnabled(),
}))
`

/** El guion de la sonda del caso 2, en un proceso que no carga los respaldos. */
const GUION_SIN_REGISTRO = `
const RUTA = '${import.meta.dir}/../src'
const m = await import(RUTA + '/adapters/appRuntime.ts')
const mapa = {}
for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
mapa.logForDebugging = () => undefined
mapa.logError = () => undefined
m.installSwarmAppRuntime(mapa)
const reg = await import(RUTA + '/backends/registry.ts')
let mensaje = ''
try {
  reg.getBackendByType('iterm2')
  mensaje = 'NO REHUSO'
} catch (e) {
  mensaje = e.message
}
console.log(JSON.stringify({ mensaje }))
`

async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  mapa.logForDebugging = (s: string) => trazas.push(s)
  mapa.logError = (e: unknown) => errores.push(e)
  mapa.getGlobalConfig = () => config
  mapa.getPlatform = () => 'linux'
  mapa.getIsNonInteractiveSession = () => false
  mapa.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  mapa.sleep = () => Promise.resolve()
  mapa.getTeamsDir = () => join(raiz, 'teams')
  mapa.execFileNoThrow = async (cmd: string, args: string[]) => {
    ejecutados.push({ cmd, args })
    const clave = `${cmd} ${args.join(' ')}`
    for (const k of Object.keys(respuestas)) {
      if (clave.startsWith(k)) return respuestas[k]!
    }
    return { code: 1, stdout: '', stderr: 'no declarado' }
  }
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

/** Deja el entorno como si el proceso no estuviera en ningún terminal especial. */
function sinTerminal(): void {
  delete process.env.TERM_PROGRAM
  delete process.env.ITERM_SESSION_ID
}

async function limpiarDeteccion(): Promise<void> {
  const d = await import('../src/backends/detection.ts')
  d.resetDetectionCache()
  const r = await import('../src/backends/registry.ts')
  r.resetBackendDetection()
  const t = await import('../src/backends/TmuxBackend.ts')
  t._test_resetTmuxBackendState()
  const i = await import('../src/backends/ITermBackend.ts')
  i._test_resetITermBackendState()
}

beforeEach(async () => {
  raiz = mkdtempSync('/dev/shm/registry-')
  trazas = []
  errores = []
  ejecutados = []
  respuestas = {}
  config = {}
  sinTerminal()
  await limpiarDeteccion()
})

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
  await limpiarDeteccion()
  sinTerminal()
  rmSync(raiz, { recursive: true, force: true })
})

describe('registry — el registro de clases de backend', () => {
  test('1. getBackendByType construye desde la clase registrada', async () => {
    await instalar()
    const r = await import('../src/backends/registry.ts')
    class Falso {
      readonly type = 'tmux'
    }
    r.registerTmuxBackend(Falso as never)
    expect(r.getBackendByType('tmux')).toBeInstanceOf(Falso)
  })

  test('2. sin registrar, getBackendByType rehúsa nombrando el modulo', async () => {
    // EN OTRO PROCESO: el registro de clases es un efecto de carga de módulo y
    // `resetBackendDetection()` no lo deshace —ni debe: las clases no
    // cambian—. Dentro de esta suite los dos respaldos ya están cargados, así
    // que la rama «sin registrar» es inalcanzable.
    const guion = join(raiz, 'sin-registro.ts')
    writeFileSync(guion, GUION_SIN_REGISTRO, 'utf-8')
    const hijo = Bun.spawnSync(['bun', guion])
    expect(hijo.exitCode).toBe(0)
    const visto = JSON.parse(
      new TextDecoder().decode(hijo.stdout).trim().split('\n').at(-1) ?? '{}',
    )
    // Devolver `null` aqui dejaria el fallo a la primera llamada de metodo,
    // lejos de la causa: el registro es lo que falta, y el mensaje lo dice.
    expect(visto.mensaje).toMatch(/ITermBackend/)
  })

  test('3. ensureBackendsRegistered carga los dos respaldos', async () => {
    await instalar()
    const r = await import('../src/backends/registry.ts')
    await r.ensureBackendsRegistered()
    expect(r.getBackendByType('tmux').type).toBe('tmux')
    expect(r.getBackendByType('iterm2').type).toBe('iterm2')
  })
})

describe('detectAndGetBackend — la prioridad de deteccion', () => {
  test('4. en iTerm2 con it2 vivo, elige el respaldo nativo', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    respuestas['it2 session list'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    const d = await r.detectAndGetBackend()
    expect(d.backend.type).toBe('iterm2')
    expect(d.isNative).toBe(true)
    expect(d.needsIt2Setup).toBe(false)
  })

  test('5. con la preferencia por tmux declarada, ni pregunta por it2', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    config = { preferTmuxOverIterm2: true }
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    const d = await r.detectAndGetBackend()
    expect(d.backend.type).toBe('tmux')
    // Y NO se le vuelve a proponer la puesta a punto: quien ya eligio tmux
    // veria el mismo aviso en cada spawn.
    expect(d.needsIt2Setup).toBe(false)
    expect(ejecutados.some(e => e.cmd === 'it2')).toBe(false)
  })

  test('6. en iTerm2 sin it2 pero con tmux, cae a tmux y pide la puesta a punto', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    const d = await r.detectAndGetBackend()
    expect(d.backend.type).toBe('tmux')
    expect(d.isNative).toBe(false)
    expect(d.needsIt2Setup).toBe(true)
  })

  test('7. en iTerm2 sin it2 y sin tmux, rehúsa nombrando it2', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    await instalar()
    const r = await import('../src/backends/registry.ts')
    await expect(r.detectAndGetBackend()).rejects.toThrow(/it2/)
  })

  test('8. fuera de todo terminal especial, tmux en sesion externa', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    const d = await r.detectAndGetBackend()
    expect(d.backend.type).toBe('tmux')
    expect(d.isNative).toBe(false)
    expect(d.needsIt2Setup).toBe(false)
  })

  test('9. sin ningun respaldo, las instrucciones son las de ESTA plataforma', async () => {
    await instalar()
    const r = await import('../src/backends/registry.ts')
    // Dar la receta de macOS a quien corre Linux es peor que no dar ninguna:
    // se sigue al pie de la letra y no funciona.
    await expect(r.detectAndGetBackend()).rejects.toThrow(/apt install tmux/)
  })

  test('10. la deteccion se cachea: la segunda llamada no vuelve a medir', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    await r.detectAndGetBackend()
    const tras = ejecutados.length
    await r.detectAndGetBackend()
    // El entorno no cambia a media sesion, y volver a preguntar cuesta un
    // subproceso por spawn.
    expect(ejecutados.length).toBe(tras)
    expect(r.getCachedDetectionResult()?.backend.type).toBe('tmux')
  })

  test('11. resetBackendDetection borra el cache', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    await r.detectAndGetBackend()
    expect(r.getCachedBackend()).not.toBeNull()
    r.resetBackendDetection()
    expect(r.getCachedBackend()).toBeNull()
    expect(r.getCachedDetectionResult()).toBeNull()
  })

  test('12. dentro de tmux gana tmux, sea cual sea el terminal', async () => {
    // EN OTRO PROCESO: la variable de tmux se congela al cargar `detection.ts`.
    const guion = join(raiz, 'sonda.ts')
    writeFileSync(guion, GUION_SONDA, 'utf-8')
    const hijo = Bun.spawnSync(['bun', guion], {
      env: {
        ...process.env,
        TMUX: '/tmp/tmux-1000/default,1,0',
        TERM_PROGRAM: 'iTerm.app',
      },
    })
    expect(hijo.exitCode).toBe(0)
    const salida = new TextDecoder().decode(hijo.stdout).trim()
    const visto = JSON.parse(salida.split('\n').at(-1) ?? '{}')
    // Estar DENTRO de tmux manda sobre estar en iTerm2: los paneles nativos
    // de iTerm2 no ven los de tmux, asi que el compañero saldria fuera de la
    // vista del lider.
    expect(visto.tipo).toBe('tmux')
    expect(visto.nativo).toBe(true)
    // Y con un respaldo de panel disponible, el modo en proceso no aplica.
    expect(visto.enProceso).toBe(false)
  })
})

describe('isInProcessEnabled — cuando el compañero corre sin panel', () => {
  test('13. una sesion no interactiva fuerza el modo en proceso', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    config = { teammateMode: 'tmux' }
    await instalar({ getIsNonInteractiveSession: () => true })
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    // Un panel de tmux sin terminal que lo muestre no es un compañero
    // visible: es un proceso escondido que nadie puede leer.
    expect(r.isInProcessEnabled()).toBe(true)
  })

  test('14. el modo declarado manda sobre el entorno', async () => {
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    const r = await import('../src/backends/registry.ts')
    config = { teammateMode: 'in-process' }
    s._test_resetTeammateModeSnapshot()
    s.captureTeammateModeSnapshot()
    expect(r.isInProcessEnabled()).toBe(true)
    config = { teammateMode: 'tmux' }
    s._test_resetTeammateModeSnapshot()
    s.captureTeammateModeSnapshot()
    expect(r.isInProcessEnabled()).toBe(false)
  })

  test('15. en «auto», el entorno decide', async () => {
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    expect(r.isInProcessEnabled()).toBe(true)
    process.env.TERM_PROGRAM = 'iTerm.app'
    const d = await import('../src/backends/detection.ts')
    d.resetDetectionCache()
    expect(r.isInProcessEnabled()).toBe(false)
  })

  test('16. el respaldo en proceso queda pegado SOLO en «auto»', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    expect(r.isInProcessEnabled()).toBe(false)
    r.markInProcessFallback()
    expect(r.isInProcessEnabled()).toBe(true)
    // Pero un cambio explicito a «tmux» a media sesion SI se respeta: el
    // respaldo describe lo que el entorno no pudo dar, no una preferencia.
    config = { teammateMode: 'tmux' }
    s._test_resetTeammateModeSnapshot()
    s.captureTeammateModeSnapshot()
    expect(r.isInProcessEnabled()).toBe(false)
  })

  test('17. getResolvedTeammateMode traduce «auto» a lo que resuelve', async () => {
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    expect(s.getTeammateModeFromSnapshot()).toBe('auto')
    expect(r.getResolvedTeammateMode()).toBe('in-process')
  })
})

describe('getTeammateExecutor — la eleccion de ejecutor', () => {
  test('18. con panel disponible devuelve el ejecutor de panel, y lo cachea', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const r = await import('../src/backends/registry.ts')
    const a = await r.getTeammateExecutor(false)
    const b = await r.getTeammateExecutor(false)
    expect(a.type).toBe('tmux')
    expect(b).toBe(a)
  })

  test('36. con el modo en proceso habilitado, devuelve ESE ejecutor', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    // El ejecutor REAL, por la importacion diferida de `getInProcessBackend`.
    // El doble que habia aqui existia por la parcial de `registry.ts`, ya
    // cerrada: con el doble, la rama verdadera de la conjuncion se ejercitaba
    // contra un objeto fabricado y no contra el modulo que carga.
    const a = await r.getTeammateExecutor(true)
    expect(a.type).toBe('in-process')
    // Y se cachea: la segunda llamada no vuelve a importar.
    expect(await r.getTeammateExecutor(true)).toBe(a)
  })

  test('37. sin pedirlo, el modo en proceso NO se impone al llamador', async () => {
    respuestas['tmux -V'] = { code: 0, stdout: 'tmux 3.4', stderr: '' }
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    expect(r.isInProcessEnabled()).toBe(true)
    // Quien pide un panel a proposito —para mostrar el trabajo al usuario— lo
    // recibe aunque el entorno prefiera el modo en proceso.
    expect((await r.getTeammateExecutor(false)).type).toBe('tmux')
  })

  test('19. pedir en proceso NO lo concede si el modo no lo habilita', async () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    respuestas['it2 session list'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const s = await import('../src/backends/teammateModeSnapshot.ts')
    s.captureTeammateModeSnapshot()
    const r = await import('../src/backends/registry.ts')
    // `preferInProcess` es una preferencia del llamador, no una orden: el modo
    // de la sesion sigue mandando.
    const e = await r.getTeammateExecutor(true)
    expect(e.type).toBe('iterm2')
  })
})

describe('TmuxBackend — las ordenes de panel', () => {
  async function backend() {
    const m = await import('../src/backends/TmuxBackend.ts')
    return new m.TmuxBackend()
  }

  test('20. el socket del enjambre se usa SOLO en sesion externa', async () => {
    respuestas['tmux'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    await b.sendCommandToPane('%1', 'echo hola', false)
    expect(ejecutados.at(-1)?.args).toEqual(['send-keys', '-t', '%1', 'echo hola', 'Enter'])
    await b.sendCommandToPane('%1', 'echo hola', true)
    // Sin `-L`, la orden va a la sesion del usuario y el panel externo se
    // queda mudo sin error visible.
    const { getSwarmSocketName } = await import('../src/core/constants.ts')
    // El nombre del socket lleva el pid a proposito —dos lideres en la misma
    // maquina no comparten sesion— asi que se DERIVA, no se transcribe.
    expect(ejecutados.at(-1)?.args.slice(0, 2)).toEqual([
      '-L',
      getSwarmSocketName(),
    ])
  })

  test('21. una orden rechazada por tmux se propaga', async () => {
    respuestas['tmux'] = { code: 1, stdout: '', stderr: 'no such pane' }
    await instalar()
    const b = await backend()
    await expect(b.sendCommandToPane('%1', 'x')).rejects.toThrow(/no such pane/)
  })

  test('22. killPane devuelve el veredicto de tmux', async () => {
    respuestas['tmux kill-pane'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    expect(await b.killPane('%1')).toBe(true)
    expect(ejecutados.at(-1)?.args).toEqual(['kill-pane', '-t', '%1'])
    respuestas['tmux kill-pane'] = { code: 1, stdout: '', stderr: 'x' }
    expect(await b.killPane('%1')).toBe(false)
  })

  test('23. los colores sin nombre en tmux se traducen a su numero', async () => {
    respuestas['tmux'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    await b.setPaneBorderColor('%1', 'purple')
    expect(ejecutados.some(e => e.args.includes('bg=default,fg=magenta'))).toBe(true)
    ejecutados = []
    await b.setPaneBorderColor('%1', 'orange')
    // `orange` no existe como nombre en tmux: pasarlo tal cual deja el borde
    // sin color y sin queja.
    expect(ejecutados.some(e => e.args.includes('bg=default,fg=colour208'))).toBe(true)
  })

  test('24. hidePane crea la sesion oculta antes de mover el panel', async () => {
    respuestas['tmux'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    expect(await b.hidePane('%1')).toBe(true)
    expect(ejecutados[0]?.args).toEqual(['new-session', '-d', '-s', 'claude-hidden'])
    expect(ejecutados[1]?.args).toEqual(['break-pane', '-d', '-s', '%1', '-t', 'claude-hidden:'])
  })

  test('25. showPane devuelve el panel y reajusta al lider al 30%', async () => {
    respuestas['tmux join-pane'] = { code: 0, stdout: '', stderr: '' }
    respuestas['tmux select-layout'] = { code: 0, stdout: '', stderr: '' }
    respuestas['tmux list-panes'] = { code: 0, stdout: '%0\n%1\n', stderr: '' }
    respuestas['tmux resize-pane'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    expect(await b.showPane('%1', 'ses:0')).toBe(true)
    const resize = ejecutados.find(e => e.args[0] === 'resize-pane')
    // El primero de la lista es el lider: redimensionar otro deja al lider
    // ocupando la mitad de la ventana.
    expect(resize?.args).toEqual(['resize-pane', '-t', '%0', '-x', '30%'])
  })

  test('26. un join fallido no reajusta nada', async () => {
    respuestas['tmux join-pane'] = { code: 1, stdout: '', stderr: 'x' }
    await instalar()
    const b = await backend()
    expect(await b.showPane('%1', 'ses:0')).toBe(false)
    expect(ejecutados.some(e => e.args[0] === 'select-layout')).toBe(false)
  })

  test('27. con un solo panel no hay nada que reequilibrar', async () => {
    respuestas['tmux list-panes'] = { code: 0, stdout: '%0\n', stderr: '' }
    await instalar()
    const b = await backend()
    await b.rebalancePanes('ses:0', false)
    expect(ejecutados.some(e => e.args[0] === 'select-layout')).toBe(false)
  })
})

describe('ITermBackend — el respaldo por it2', () => {
  async function backend() {
    const m = await import('../src/backends/ITermBackend.ts')
    return new m.ITermBackend()
  }

  test('28. fuera de iTerm2 no esta disponible, y no pregunta por it2', async () => {
    await instalar()
    const b = await backend()
    expect(await b.isAvailable()).toBe(false)
    expect(ejecutados.some(e => e.cmd === 'it2')).toBe(false)
  })

  test('29. el primer corte sale de la sesion del lider, tras los dos puntos', async () => {
    process.env.ITERM_SESSION_ID = 'w0t1p2:UUID-DEL-LIDER'
    respuestas['it2 session split'] = {
      code: 0,
      stdout: 'Created new pane: UUID-NUEVO',
      stderr: '',
    }
    await instalar()
    const b = await backend()
    const r = await b.createTeammatePaneInSwarmView('ana', 'blue')
    expect(r).toEqual({ paneId: 'UUID-NUEVO', isFirstTeammate: true })
    // La variable trae `ventana:sesion`: pasarla entera nombra una sesion que
    // no existe y el corte sale en el sitio equivocado.
    expect(ejecutados[0]?.args).toEqual([
      'session', 'split', '-v', '-s', 'UUID-DEL-LIDER',
    ])
  })

  test('30. sin la variable del lider, corta desde la sesion activa', async () => {
    respuestas['it2 session split'] = {
      code: 0,
      stdout: 'Created new pane: A',
      stderr: '',
    }
    await instalar()
    const b = await backend()
    await b.createTeammatePaneInSwarmView('ana', 'blue')
    expect(ejecutados[0]?.args).toEqual(['session', 'split', '-v'])
  })

  test('31. el segundo corte sale del ULTIMO compañero, no del lider', async () => {
    process.env.ITERM_SESSION_ID = 'w0t1p2:LIDER'
    let n = 0
    await instalar({
      execFileNoThrow: async (cmd: string, args: string[]) => {
        ejecutados.push({ cmd, args })
        n += 1
        return { code: 0, stdout: `Created new pane: S${n}`, stderr: '' }
      },
    })
    const b = await backend()
    await b.createTeammatePaneInSwarmView('ana', 'blue')
    await b.createTeammatePaneInSwarmView('bea', 'green')
    const tercero = await b.createTeammatePaneInSwarmView('cal', 'cyan')
    expect(tercero.isFirstTeammate).toBe(false)
    // TRES cortes, no dos: con dos, «el ultimo» y «el primero» son el mismo
    // compañero y la asercion no distingue una implementacion de la otra.
    expect(ejecutados[1]?.args).toEqual(['session', 'split', '-s', 'S1'])
    // Apilar desde el primero dejaria a los compañeros repartidos por la
    // ventana en vez de en una columna.
    expect(ejecutados[2]?.args).toEqual(['session', 'split', '-s', 'S2'])
  })

  test('32. una sesion muerta se poda y se reintenta', async () => {
    process.env.ITERM_SESSION_ID = 'w0t1p2:LIDER'
    let corte = 0
    await instalar({
      execFileNoThrow: async (cmd: string, args: string[]) => {
        ejecutados.push({ cmd, args })
        if (args[1] === 'list') return { code: 0, stdout: 'LIDER', stderr: '' }
        corte += 1
        if (corte === 2) return { code: 1, stdout: '', stderr: 'session gone' }
        return { code: 0, stdout: `Created new pane: S${corte}`, stderr: '' }
      },
    })
    const b = await backend()
    await b.createTeammatePaneInSwarmView('ana', 'blue')
    const segundo = await b.createTeammatePaneInSwarmView('bea', 'green')
    // Podado el unico compañero, el siguiente vuelve a ser el primero y corta
    // desde el lider.
    expect(segundo.isFirstTeammate).toBe(true)
    expect(ejecutados.some(e => e.args[1] === 'list')).toBe(true)
  })

  test('33. un fallo sistemico NO poda: se propaga', async () => {
    process.env.ITERM_SESSION_ID = 'w0t1p2:LIDER'
    let corte = 0
    await instalar({
      execFileNoThrow: async (cmd: string, args: string[]) => {
        ejecutados.push({ cmd, args })
        // La API apagada hace fallar TAMBIEN al listado: podar aqui vaciaria
        // la lista de sesiones vivas por un fallo que no es de ninguna.
        if (args[1] === 'list') return { code: 1, stdout: '', stderr: 'api off' }
        corte += 1
        if (corte === 2) return { code: 1, stdout: '', stderr: 'api off' }
        return { code: 0, stdout: `Created new pane: S${corte}`, stderr: '' }
      },
    })
    const b = await backend()
    await b.createTeammatePaneInSwarmView('ana', 'blue')
    await expect(b.createTeammatePaneInSwarmView('bea', 'green')).rejects.toThrow(
      /api off/,
    )
  })

  test('34. killPane fuerza el cierre y olvida la sesion', async () => {
    process.env.ITERM_SESSION_ID = 'w0t1p2:LIDER'
    respuestas['it2 session split'] = {
      code: 0,
      stdout: 'Created new pane: S1',
      stderr: '',
    }
    respuestas['it2 session close'] = { code: 0, stdout: '', stderr: '' }
    await instalar()
    const b = await backend()
    await b.createTeammatePaneInSwarmView('ana', 'blue')
    expect(await b.killPane('S1')).toBe(true)
    // Sin `-f`, iTerm2 respeta su preferencia de «confirmar antes de cerrar»
    // y se queda esperando a un humano que no esta mirando.
    expect(ejecutados.at(-1)?.args).toEqual(['session', 'close', '-f', '-s', 'S1'])
    // Vaciada la lista, el siguiente vuelve a ser el primero.
    const otro = await b.createTeammatePaneInSwarmView('bea', 'green')
    expect(otro.isFirstTeammate).toBe(true)
  })

  test('35. esconder y mostrar no existen en iTerm2, y lo dicen', async () => {
    await instalar()
    const b = await backend()
    expect(b.supportsHideShow).toBe(false)
    expect(await b.hidePane('S1')).toBe(false)
    expect(await b.showPane('S1', 'x')).toBe(false)
  })
})
