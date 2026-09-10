/**
 * La mitad ROJA de cinco módulos de swarm que sólo colgaban de `appRuntime`.
 *
 * Procedencia: `ccnmt: packages/swarm/src/{core/teammateModel.ts,
 * worktree/sparseConfigCleanup.ts, backends/teammateModeSnapshot.ts,
 * backends/detection.ts, runtime/spawnUtils.ts}`. Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * POR QUÉ ESTOS CINCO. Medido: ninguno tiene un solo import externo al
 * paquete. Los cinco cuelgan de `../adapters/appRuntime.js` —portado en el
 * commit anterior— y de `../core/constants.js`, que ya estaba.
 *
 * Métrica: la conducta de cada uno con los bindings instalados por el test.
 * Ciega a: si un tmux o un iTerm2 reales se comportan como su detección
 * asume — eso es del entorno, no del módulo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

/** Un mapa completo, construido desde las listas que el propio módulo exporta. */
async function instalar(encima: Record<string, unknown> = {}): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const mapa: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) mapa[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) mapa[n] = ''
  // Dos de los bindings de VALOR son en realidad funciones sin retorno —
  // arrancan como no-ops para que importar el módulo no exija instalar nada—,
  // así que el literal vacío del resto no les sirve.
  mapa.logForDebugging = () => undefined
  mapa.logError = () => undefined
  m.installSwarmAppRuntime({ ...mapa, ...encima })
}

afterEach(async () => {
  const m = await import('../src/adapters/appRuntime.ts')
  m._test_resetSwarmAppRuntime()
})

describe('getHardcodedTeammateModelFallback — el modelo por proveedor', () => {
  test('1. elige el identificador que corresponde al proveedor activo', async () => {
    await instalar({
      CLAUDE_OPUS_4_7_CONFIG: { bedrock: 'id-en-bedrock', firstParty: 'id-1p' },
      getAPIProvider: () => 'bedrock',
    })
    const { getHardcodedTeammateModelFallback } = await import(
      '../src/core/teammateModel.ts'
    )
    // Ser consciente del proveedor NO es un detalle: el mismo modelo tiene
    // identificador distinto en cada uno, y devolver el de primera parte a un
    // cliente de Bedrock produce una petición que su endpoint no entiende.
    expect(getHardcodedTeammateModelFallback()).toBe('id-en-bedrock')
  })
})

describe('teammateModeSnapshot — el modo se congela al arrancar', () => {
  beforeEach(async () => {
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m._test_resetTeammateModeSnapshot()
  })

  test('2. sin override, el modo sale de la configuración', async () => {
    await instalar({ getGlobalConfig: () => ({ teammateMode: 'tmux' }) })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m.captureTeammateModeSnapshot()
    expect(m.getTeammateModeFromSnapshot()).toBe('tmux')
  })

  test('3. sin configuración declarada, cae a «auto»', async () => {
    await instalar({ getGlobalConfig: () => ({}) })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m.captureTeammateModeSnapshot()
    expect(m.getTeammateModeFromSnapshot()).toBe('auto')
  })

  test('4. el override de línea de comandos GANA a la configuración', async () => {
    await instalar({ getGlobalConfig: () => ({ teammateMode: 'tmux' }) })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m.setCliTeammateModeOverride('in-process')
    m.captureTeammateModeSnapshot()
    expect(m.getTeammateModeFromSnapshot()).toBe('in-process')
    expect(m.getCliTeammateModeOverride()).toBe('in-process')
  })

  test('5. el modo NO cambia si la configuración cambia después', async () => {
    let modo = 'tmux'
    await instalar({ getGlobalConfig: () => ({ teammateMode: modo }) })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m.captureTeammateModeSnapshot()
    modo = 'in-process'
    // Es la razón de ser del módulo: una sesión que ya lanzó compañeros en un
    // modo no puede pasar a otro a mitad de camino sin dejar huérfanos los que
    // ya arrancó.
    expect(m.getTeammateModeFromSnapshot()).toBe('tmux')
  })

  test('6. limpiar el override fija el modo nuevo, y lo deja en null', async () => {
    await instalar({ getGlobalConfig: () => ({ teammateMode: 'auto' }) })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    m.setCliTeammateModeOverride('tmux')
    m.captureTeammateModeSnapshot()
    m.clearCliTeammateModeOverride('in-process')
    // El modo nuevo llega por argumento y no releyendo la configuración: entre
    // que el usuario la cambia y este código la lee cabe otra escritura.
    expect(m.getCliTeammateModeOverride()).toBe(null)
    expect(m.getTeammateModeFromSnapshot()).toBe('in-process')
  })

  test('7. leer ANTES de capturar registra el error y captura', async () => {
    const errores: unknown[] = []
    await instalar({
      getGlobalConfig: () => ({ teammateMode: 'tmux' }),
      logError: (e: unknown) => errores.push(e),
    })
    const m = await import('../src/backends/teammateModeSnapshot.ts')
    // Llegar aquí sin haber capturado es un defecto de inicialización, y se
    // registra como tal — pero devolver un modo válido igualmente es mejor que
    // derribar la sesión por el orden de arranque.
    expect(m.getTeammateModeFromSnapshot()).toBe('tmux')
    expect(errores.length).toBe(1)
  })
})

describe('detection — dónde estamos corriendo', () => {
  beforeEach(async () => {
    const m = await import('../src/backends/detection.ts')
    m.resetDetectionCache()
  })

  test('8. tmux se detecta por la variable capturada al cargar el módulo', async () => {
    await instalar()
    const m = await import('../src/backends/detection.ts')
    const alCargar = m.isInsideTmuxSync()
    const previo = process.env.TMUX
    // Se captura al cargar y NO se relee: otra capa sobrescribe esa variable
    // cuando inicializa su propio socket, y releerla daría un falso positivo.
    // El control discrimina porque INVIERTE la variable: si el módulo la
    // releyera, el veredicto cambiaría aquí.
    process.env.TMUX = alCargar ? '' : '/tmp/tmux-0/default,1,0'
    expect(m.isInsideTmuxSync()).toBe(alCargar)
    expect(await m.isInsideTmux()).toBe(alCargar)
    if (previo === undefined) delete process.env.TMUX
    else process.env.TMUX = previo
  })

  test('9. la disponibilidad de tmux se mide EJECUTÁNDOLO', async () => {
    let visto: unknown[] = []
    await instalar({
      execFileNoThrow: (cmd: string, args: string[]) => {
        visto = [cmd, args]
        return Promise.resolve({ code: 0, stdout: '', stderr: '' })
      },
    })
    const m = await import('../src/backends/detection.ts')
    expect(await m.isTmuxAvailable()).toBe(true)
    expect(visto[0]).toBe('tmux')
  })

  test('10. la del CLI de iTerm2 usa «session list», no «--version»', async () => {
    let args: string[] = []
    await instalar({
      execFileNoThrow: (_cmd: string, a: string[]) => {
        args = a
        return Promise.resolve({ code: 1, stdout: '', stderr: '' })
      },
    })
    const m = await import('../src/backends/detection.ts')
    // `--version` tiene éxito aunque la API de Python del terminal esté
    // deshabilitada, y entonces el comando que de verdad importa falla más
    // tarde sin plan B. `session list` prueba el camino real.
    expect(await m.isIt2CliAvailable()).toBe(false)
    expect(args).toEqual(['session', 'list'])
  })

  test('11. el resultado se cachea, y el reseteo lo borra', async () => {
    let lecturas = 0
    // `env` es un valor, no una función: para contar sus lecturas hay que
    // instalarlo con un getter. Sin esto el control no discriminaría —
    // afirmar dos veces `true` pasa igual con caché y sin ella.
    await instalar({
      env: {
        get terminal() {
          lecturas += 1
          return 'iTerm.app'
        },
      },
    })
    const m = await import('../src/backends/detection.ts')
    expect(m.isInITerm2()).toBe(true)
    expect(m.isInITerm2()).toBe(true)
    expect(lecturas).toBe(1)
    m.resetDetectionCache()
    expect(m.isInITerm2()).toBe(true)
    expect(lecturas).toBe(2)
  })
})

describe('spawnUtils — qué hereda un compañero al arrancar', () => {
  test('12. el comando sale de la variable declarada si está', async () => {
    await instalar()
    const m = await import('../src/runtime/spawnUtils.ts')
    const previo = process.env[m.TEAMMATE_COMMAND_ENV_VAR]
    process.env[m.TEAMMATE_COMMAND_ENV_VAR] = '/un/binario'
    expect(m.getTeammateCommand()).toBe('/un/binario')
    if (previo === undefined) delete process.env[m.TEAMMATE_COMMAND_ENV_VAR]
    else process.env[m.TEAMMATE_COMMAND_ENV_VAR] = previo
  })

  test('13. el modo plan GANA a los permisos heredados', async () => {
    await instalar({
      getSessionBypassPermissionsMode: () => true,
      quote: (a: string[]) => a.join(' '),
      getMainLoopModelOverride: () => undefined,
      getFlagSettingsPath: () => undefined,
      getInlinePlugins: () => [],
      getChromeFlagOverride: () => undefined,
      getGlobalConfig: () => ({ teammateMode: 'auto' }),
    })
    const snap = await import('../src/backends/teammateModeSnapshot.ts')
    snap._test_resetTeammateModeSnapshot()
    snap.captureTeammateModeSnapshot()
    const m = await import('../src/runtime/spawnUtils.ts')
    // Es una decisión de SEGURIDAD y por eso es la primera rama: el modo plan
    // existe para no ejecutar nada, y heredar el salto de permisos lo
    // vaciaría de sentido justo cuando más importa.
    const conPlan = m.buildInheritedCliFlags({ planModeRequired: true })
    expect(conPlan.includes('--dangerously-skip-permissions')).toBe(false)
    const sinPlan = m.buildInheritedCliFlags({})
    expect(sinPlan.includes('--dangerously-skip-permissions')).toBe(true)
  })

  test('14. propaga modelo, settings, plugins y modo de compañero', async () => {
    await instalar({
      getSessionBypassPermissionsMode: () => false,
      quote: (a: string[]) => a.join(' '),
      getMainLoopModelOverride: () => 'un-modelo',
      getFlagSettingsPath: () => '/ruta/settings.json',
      getInlinePlugins: () => ['/p/uno', '/p/dos'],
      getChromeFlagOverride: () => undefined,
      getGlobalConfig: () => ({ teammateMode: 'tmux' }),
    })
    const snap = await import('../src/backends/teammateModeSnapshot.ts')
    snap._test_resetTeammateModeSnapshot()
    snap.captureTeammateModeSnapshot()
    const m = await import('../src/runtime/spawnUtils.ts')
    const flags = m.buildInheritedCliFlags({})
    expect(flags).toContain('--model un-modelo')
    expect(flags).toContain('--settings /ruta/settings.json')
    expect(flags).toContain('--plugin-dir /p/uno')
    expect(flags).toContain('--plugin-dir /p/dos')
    expect(flags).toContain('--teammate-mode tmux')
  })

  test('15. la lista de variables reenviadas es un PARÁMETRO, no texto fijo', async () => {
    await instalar({ quote: (a: string[]) => a.join(' ') })
    const m = await import('../src/runtime/spawnUtils.ts')
    // La fuente lleva las claves del producto del proveedor incrustadas. Aquí
    // la lista se exporta para que el despliegue la declare: es dominio del
    // consumidor, no del mecanismo.
    expect(Array.isArray(m.TEAMMATE_ENV_VARS)).toBe(true)
    // Las de terceros SÍ viajan verbatim — son de curl y de node, no del
    // proveedor.
    expect(m.TEAMMATE_ENV_VARS).toContain('HTTPS_PROXY')
    expect(m.TEAMMATE_ENV_VARS).toContain('NODE_EXTRA_CA_CERTS')
  })

  test('16. reenvía sólo las que están puestas y NO vacías', async () => {
    await instalar({ quote: (a: string[]) => a.join(' ') })
    const m = await import('../src/runtime/spawnUtils.ts')
    const previo = process.env.HTTPS_PROXY
    process.env.HTTPS_PROXY = ''
    expect(m.buildInheritedEnvVars().includes('HTTPS_PROXY')).toBe(false)
    process.env.HTTPS_PROXY = 'http://relay:8080'
    const conValor = m.buildInheritedEnvVars()
    expect(conValor).toContain('HTTPS_PROXY=http://relay:8080')
    if (previo === undefined) delete process.env.HTTPS_PROXY
    else process.env.HTTPS_PROXY = previo
  })
})

describe('cleanupSparseWorktreeConfig — sólo cuando queda UN árbol', () => {
  test('17. con más de un worktree, no toca nada', async () => {
    const llamadas: string[][] = []
    await instalar({
      gitExe: () => 'git',
      execFileNoThrowWithCwd: (_g: string, args: string[]) => {
        llamadas.push(args)
        return Promise.resolve({
          code: 0,
          stdout: 'worktree /a\nworktree /b\n',
          stderr: '',
        })
      },
    })
    const { cleanupSparseWorktreeConfig } = await import(
      '../src/worktree/sparseConfigCleanup.ts'
    )
    await cleanupSparseWorktreeConfig('/r')
    // Quitar la extensión con otro árbol vivo le rompería SU configuración por
    // árbol: la limpieza sólo es segura cuando no queda nadie más.
    expect(llamadas.length).toBe(1)
  })

  test('18. con uno solo y sin sparse activo, quita la extensión', async () => {
    const llamadas: string[][] = []
    await instalar({
      gitExe: () => 'git',
      execFileNoThrowWithCwd: (_g: string, args: string[]) => {
        llamadas.push(args)
        if (args[0] === 'worktree') {
          return Promise.resolve({ code: 0, stdout: 'worktree /a\n', stderr: '' })
        }
        return Promise.resolve({ code: 1, stdout: '', stderr: '' })
      },
    })
    const { cleanupSparseWorktreeConfig } = await import(
      '../src/worktree/sparseConfigCleanup.ts'
    )
    await cleanupSparseWorktreeConfig('/r')
    expect(llamadas[llamadas.length - 1]).toEqual([
      'config',
      '--unset',
      'extensions.worktreeConfig',
    ])
  })

  test('19. si el árbol principal SÍ usa sparse, no la quita', async () => {
    const llamadas: string[][] = []
    await instalar({
      gitExe: () => 'git',
      execFileNoThrowWithCwd: (_g: string, args: string[]) => {
        llamadas.push(args)
        if (args[0] === 'worktree') {
          return Promise.resolve({ code: 0, stdout: 'worktree /a\n', stderr: '' })
        }
        return Promise.resolve({ code: 0, stdout: 'true\n', stderr: '' })
      },
    })
    const { cleanupSparseWorktreeConfig } = await import(
      '../src/worktree/sparseConfigCleanup.ts'
    )
    await cleanupSparseWorktreeConfig('/r')
    // Quitarla aquí rompería el checkout parcial que el usuario configuró a
    // mano en el árbol principal.
    expect(llamadas.some(a => a.includes('--unset'))).toBe(false)
  })
})
