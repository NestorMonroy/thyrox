import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { logSessionTelemetry, logStartupTelemetry, type PluginInfo } from '../telemetry.js'

const ENV_KEYS = ['NODE_EXTRA_CA_CERTS', 'CLAUDE_CODE_CLIENT_CERT', 'NODE_OPTIONS'] as const
let snapshot: Record<string, string | undefined>

beforeEach(() => {
  snapshot = {}
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
})

describe('logSessionTelemetry', () => {
  test('sin ningún colaborador inyectado: no lanza (estado real hoy)', () => {
    expect(() => logSessionTelemetry()).not.toThrow()
  })

  test('resuelve el modelo con getInitialMainLoopModel primero, cae a getDefaultMainLoopModel', () => {
    let modeloUsado: string | undefined
    logSessionTelemetry({
      getInitialMainLoopModel: () => undefined,
      getDefaultMainLoopModel: () => 'claude-sonnet-5',
      parseUserSpecifiedModel: (m) => {
        modeloUsado = m
        return m
      },
    })
    expect(modeloUsado).toBe('claude-sonnet-5')
  })

  test('tras cargar plugins, arma los tres eventos con el reparto de settings por fuente', async () => {
    const plugins: PluginInfo[] = [{ name: 'p1', repository: 'org/repo', hooksConfig: { a: 1 } }]
    let hooksArgs: unknown[] = []
    let habilitadosLogueados: unknown
    let erroresLogueados: unknown

    logSessionTelemetry({
      loadAllPluginsCacheOnly: async () => ({ enabled: plugins, errors: ['e1'] }),
      getManagedPluginNames: () => ['p1'],
      getPluginSeedDirs: () => ['/seed'],
      getSettingsForSource: (source) => (source === 'userSettings' ? { hooks: { onX: true } } : undefined),
      parsePluginIdentifier: (repo) => ({ marketplace: repo.split('/')[0]! }),
      logPluginsEnabledForSession: (enabled, managed, seed) => {
        habilitadosLogueados = { enabled, managed, seed }
      },
      logPluginLoadErrors: (errors) => {
        erroresLogueados = errors
      },
      logHooksRegistered: (bySource, pluginsArg, managed) => {
        hooksArgs = [bySource, pluginsArg, managed]
      },
    })

    // Las tres llamadas van dentro del .then() de una promesa — se espera
    // el microtask queue antes de asertar.
    await Promise.resolve()
    await Promise.resolve()

    expect(habilitadosLogueados).toEqual({ enabled: plugins, managed: ['p1'], seed: ['/seed'] })
    expect(erroresLogueados).toEqual(['e1'])
    expect(hooksArgs[0]).toEqual({
      userSettings: { onX: true },
      projectSettings: undefined,
      localSettings: undefined,
      flagSettings: undefined,
      policySettings: undefined,
    })
    expect(hooksArgs[1]).toEqual([{ name: 'p1', marketplace: 'org', hooksConfig: { a: 1 } }])
    expect(hooksArgs[2]).toEqual(['p1'])
  })

  test('si loadAllPluginsCacheOnly rechaza, el error va a logError — no se propaga', async () => {
    let capturado: unknown
    logSessionTelemetry({
      loadAllPluginsCacheOnly: async () => {
        throw new Error('fallo de carga')
      },
      logError: (err) => {
        capturado = err
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    expect((capturado as Error).message).toBe('fallo de carga')
  })
})

describe('logStartupTelemetry', () => {
  test('con analytics deshabilitado: no llama a logEvent', async () => {
    let llamado = false
    await logStartupTelemetry({
      isAnalyticsDisabled: () => true,
      logEvent: () => (llamado = true),
    })
    expect(llamado).toBe(false)
  })

  test('arma el evento con is_git/worktree_count/gh_auth_status resueltos en paralelo', async () => {
    let metadata: Record<string, unknown> | undefined
    await logStartupTelemetry({
      getIsGit: async () => true,
      getWorktreeCount: async () => 3,
      getGhAuthStatus: async () => 'authenticated',
      logEvent: (_e, m) => (metadata = m),
    })
    expect(metadata?.is_git).toBe(true)
    expect(metadata?.worktree_count).toBe(3)
    expect(metadata?.gh_auth_status).toBe('authenticated')
  })

  test('incluye las variables de entorno de certificados presentes', async () => {
    process.env.NODE_EXTRA_CA_CERTS = '/x.pem'
    process.env.NODE_OPTIONS = '--use-system-ca --stack-size=4000'
    let metadata: Record<string, unknown> | undefined
    await logStartupTelemetry({ logEvent: (_e, m) => (metadata = m) })
    expect(metadata?.has_node_extra_ca_certs).toBe(true)
    expect(metadata?.has_use_system_ca).toBe(true)
    expect(metadata?.has_client_cert).toBeUndefined()
    expect(metadata?.has_use_openssl_ca).toBeUndefined()
  })
})
