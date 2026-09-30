/**
 * Lo que el proceso padre aporta a la política — porte de `J2o`, `Hy`, `Zl`
 * y `Pd` de `chunk-379zyrv7.js` en el ejecutable 2.1.283 (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`): sólo lo que
 * restringe, nunca lo que afloja la política administrada.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const P = (await import(
  process.env.POLICY_PARENT_MODULE ?? '../settings/policyParent.ts'
)) as typeof import('../settings/policyParent.ts')

describe('el estado de los remolques de atribución (Zl)', () => {
  test('commitTrailers booleano decide', () => {
    expect(P.commitTrailersState({ commitTrailers: false }, undefined)).toBe('disabled')
    expect(P.commitTrailersState({ commitTrailers: true }, false)).toBe('explicit-enabled')
  })
  test('una plantilla de commit vacía los apaga; con plantilla quedan implícitos', () => {
    expect(P.commitTrailersState({ commit: '' }, true)).toBe('disabled')
    expect(P.commitTrailersState({ pr: 'x' }, false)).toBe('implicit-enabled')
  })
  test('sin atribución decide includeCoAuthoredBy', () => {
    expect(P.commitTrailersState(undefined, false)).toBe('disabled')
    expect(P.commitTrailersState({}, true)).toBe('implicit-enabled')
    expect(P.commitTrailersState(undefined, undefined)).toBeUndefined()
  })
})

describe('los pares AWS del padre (Pd)', () => {
  test('cada variable AWS que el padre nombra y el hijo no, se suprime con un par propio', () => {
    expect(P.suppressedAwsPairs([{ accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: 'AWS_SECRET_ACCESS_KEY' }, { accessKeyIdVar: 'MY_KEY' }], []))
      .toEqual([
        { accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_1_' },
        { accessKeyIdVar: 'AWS_SECRET_ACCESS_KEY', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_2_' },
      ])
  })
  test('las que el hijo ya nombra no se suprimen', () => {
    expect(P.suppressedAwsPairs([{ sessionTokenVar: 'AWS_SESSION_TOKEN' }], [{ sessionTokenVar: 'AWS_SESSION_TOKEN' }])).toEqual([])
  })
})

describe('las restricciones del sandbox (Hy)', () => {
  test('sólo las claves del sandbox con su valor restrictivo', () => {
    expect(P.restrictiveSandbox({ sandbox: { enabled: true, allowUnsandboxedCommands: true, network: { allowLocalBinding: false } }, disableAllHooks: true }))
      .toEqual({ enabled: true, network: { allowLocalBinding: false } })
    expect(P.restrictiveSandbox({})).toEqual({})
  })
})

describe('la porción del padre (J2o)', () => {
  const none = {}
  test('toma las banderas que restringen y deja las que aflojan', () => {
    const slice = P.parentPolicySlice({
      allowManagedHooksOnly: true, disableCommandPluginSources: true, allowManagedMcpServersOnly: true,
      disableThyroxAiConnectors: true, syncThyroxAiSkills: false, syncThyroxAiPlugins: false,
      allowManagedPermissionRulesOnly: true, disableAutoMode: 'disable', enforceAvailableModels: true, availableModelsMatch: 'exact',
      model: 'm', enableWorkflows: true,
    }, none)
    expect(slice).toEqual({
      allowManagedHooksOnly: true, disableCommandPluginSources: true, allowManagedMcpServersOnly: true,
      disableThyroxAiConnectors: true, syncThyroxAiSkills: false, syncThyroxAiPlugins: false,
      allowManagedPermissionRulesOnly: true, disableAutoMode: 'disable', enforceAvailableModels: true, availableModelsMatch: 'exact',
    })
    expect(P.parentPolicySlice({ allowManagedHooksOnly: false, syncThyroxAiSkills: true, availableModelsMatch: 'prefix' }, none)).toEqual({})
  })
  test('remoteTools, remoteControl y atribución restrictivos', () => {
    expect(P.parentPolicySlice({ remoteTools: { allowUnattendedServing: false }, remoteControl: { shareHostProfile: 'basic' }, attribution: { commitTrailers: false, sessionUrl: false } }, none))
      .toEqual({ remoteTools: { allowUnattendedServing: false }, remoteControl: { shareHostProfile: 'basic' }, attribution: { commitTrailers: false, sessionUrl: false } })
    expect(P.parentPolicySlice({ remoteControl: { shareHostProfile: 'full' }, attribution: { sessionUrl: true } }, none)).toEqual({})
  })
  test('las listas que niegan viajan; las que permiten, sólo si el administrador no las declara', () => {
    const slice = P.parentPolicySlice({
      strictPluginOnlyCustomization: ['a'], deniedMcpServers: [{ serverName: 'x' }], blockedMarketplaces: ['b'], deniedModels: ['d'],
      forceLoginOrgUUID: 'org', availableModels: ['m'], allowedMcpServers: [{ serverName: 'y' }],
    }, { availableModels: ['n'] })
    expect(slice).toEqual({
      strictPluginOnlyCustomization: ['a'], deniedMcpServers: [{ serverName: 'x' }], blockedMarketplaces: ['b'], deniedModels: ['d'],
      forceLoginOrgUUID: 'org', allowedMcpServers: [{ serverName: 'y' }],
    })
    expect(P.parentPolicySlice({ strictPluginOnlyCustomization: [], blockedMarketplaces: [], deniedModels: [], forceLoginOrgUUID: 'org' }, { forceLoginOrgUUID: 'mine' })).toEqual({})
  })
  test('permisos: deny y ask sin excepciones con «!», y las banderas que restringen', () => {
    const warnings: string[] = []
    const slice = P.parentPolicySlice({
      permissions: { deny: ['Bash(rm:*)', 'Read(!./x)', 'Edit(./!y)'], ask: ['Read(./!z)'], disableBypassPermissionsMode: 'disable', disableAutoMode: 'disable', blockReadsOutsideWorkingDirectories: true, allow: ['Read'], additionalDirectories: ['/d'], defaultMode: 'plan' },
    }, none, message => warnings.push(message))
    expect(slice).toEqual({ permissions: { deny: ['Bash(rm:*)'], ask: [], disableBypassPermissionsMode: 'disable', disableAutoMode: 'disable', blockReadsOutsideWorkingDirectories: true, allow: ['Read'], additionalDirectories: ['/d'] } })
    expect(warnings).toHaveLength(3)
    expect(warnings[0]).toStartWith('Ignoring deny rule "Read(!./x)" from the parent process\'s managed settings')
  })
  test('permisos que permiten se callan si el administrador los restringe', () => {
    expect(P.parentPolicySlice({ permissions: { allow: ['Read'], additionalDirectories: ['/d'] } }, { allowManagedPermissionRulesOnly: true })).toEqual({})
    expect(P.parentPolicySlice({ permissions: { allow: ['Read'] } }, { sandbox: { network: { allowManagedDomainsOnly: true } } })).toEqual({})
  })
  test('sandbox: dominios y lecturas negadas viajan; los permitidos según el administrador', () => {
    const parent = { sandbox: { network: { deniedDomains: ['d'], allowedDomains: ['a'] }, filesystem: { denyRead: ['r'], denyWrite: ['w'], allowRead: ['ok'] }, enabled: true } }
    expect(P.parentPolicySlice(parent, none)).toEqual({ sandbox: { network: { deniedDomains: ['d'], allowedDomains: ['a'] }, filesystem: { denyRead: ['r'], denyWrite: ['w'], allowRead: ['ok'] }, enabled: true } })
    expect(P.parentPolicySlice(parent, { sandbox: { network: { allowManagedDomainsOnly: true }, filesystem: { allowManagedReadPathsOnly: true } } }))
      .toEqual({ sandbox: { network: { deniedDomains: ['d'] }, filesystem: { denyRead: ['r'], denyWrite: ['w'] }, enabled: true } })
  })
  test('credenciales del sandbox: archivos a negar o enmascarar, variables negadas, sigv4 y pares AWS', () => {
    const slice = P.parentPolicySlice({ sandbox: { credentials: {
      files: [{ path: '/a', mode: 'deny' }, { path: '/b', mode: 'mask', injectHosts: ['h'] }],
      envVars: [{ name: 'A', mode: 'deny' }, { name: 'B', mode: 'inject' }],
      sigv4: { streaming: 'deny', presigned: 'allow' },
      awsPairs: [{ accessKeyIdVar: 'AWS_ACCESS_KEY_ID' }],
    } } }, none)
    expect(slice).toEqual({ sandbox: { credentials: {
      files: [{ path: '/a', mode: 'deny' }, { path: '/b', mode: 'mask', injectHosts: [] }],
      envVars: [{ name: 'A', mode: 'deny' }],
      sigv4: { streaming: 'deny' },
      awsPairs: [{ accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_1_' }],
    } } })
  })
})
