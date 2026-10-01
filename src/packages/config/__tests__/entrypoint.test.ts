/**
 * El módulo de entrypoints y anfitrión (`chunk-jwddn0q9.js` de 2.1.283).
 */
import { describe, expect, test } from 'bun:test'

import {
  DESKTOP_APP_ENTRYPOINTS,
  EntrypointHostState,
  type EntrypointContext,
  THIRD_PARTY_DESKTOP_ENTRYPOINT,
  configureEntrypointContext,
  coworkFrameArtifacts,
  declaredEntrypoint,
  desktopAppVersion,
  hostDisplayName,
  initializeEntrypointHostState,
  isAttendedSession,
  isChatAppEntrypoint,
  isChildSession,
  isCoworkEntrypoint,
  isDesktopEntrypoint,
  isDesktopEntrypointName,
  isEmbeddedEntrypoint,
  isFalsyFlag,
  isHostGatewayLineageManaged,
  isHostManagedGateway,
  isHostScheduledRun,
  isInsideAgentShell,
  isRemoteControlSession,
  isRemotePrefixedEntrypoint,
  isSdkEntrypoint,
  isTopLevelDesktopSession,
  isTopLevelRemoteSession,
  isTopLevelVsCodeSession,
  isTruthyFlag,
  isUnhostedNonInteractive,
  launchResumeMode,
  processEntrypointContext,
  resolveEntrypoint,
  showsSettingsHint,
  spawnedByAttendedSession,
} from '../entrypoint.ts'
import { PRODUCT_NAME } from '../product.ts'

function context(env: Record<string, string | undefined> = {}, overrides: Partial<EntrypointContext> = {}): EntrypointContext {
  return { env, state: new EntrypointHostState(), teammateAgentId: () => undefined, isNonInteractive: () => false, argv: () => ['bun', 'cli'], ...overrides }
}

describe('intérpretes de bandera', () => {
  test('isTruthyFlag (Le) e isFalsyFlag (Wo)', () => {
    for (const value of ['1', 'TRUE', ' yes ', 'on', true]) expect(isTruthyFlag(value)).toBe(true)
    for (const value of ['', '0', 'x', undefined, false]) expect(isTruthyFlag(value)).toBe(false)
    for (const value of ['0', 'False', ' no ', 'off', false]) expect(isFalsyFlag(value)).toBe(true)
    for (const value of ['', '1', 'x', undefined, true]) expect(isFalsyFlag(value)).toBe(false)
  })
})

describe('THYROX_CODE_ENTRYPOINT', () => {
  test('declaredEntrypoint (Nd) sólo devuelve uno conocido, recortado', () => {
    expect(declaredEntrypoint(context({ THYROX_CODE_ENTRYPOINT: ' cli ' }))).toBe('cli')
    expect(declaredEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'otro' }))).toBeUndefined()
    expect(declaredEntrypoint(context({ THYROX_CODE_ENTRYPOINT: '  ' }))).toBeUndefined()
  })

  test('hostDisplayName (RUo) muestra el anfitrión con el nombre del producto', () => {
    expect(hostDisplayName(context({ THYROX_CODE_ENTRYPOINT: 'claude-desktop' }))).toBe(`${PRODUCT_NAME} Desktop`)
    expect(hostDisplayName(context({ THYROX_CODE_ENTRYPOINT: 'claude-in-teams' }))).toBe(`${PRODUCT_NAME} Tag in Teams`)
    expect(hostDisplayName(context({ THYROX_CODE_ENTRYPOINT: 'remote_mobile' }))).toBe('Mobile')
    expect(hostDisplayName(context({ THYROX_CODE_ENTRYPOINT: 'claude-code-github-action' }))).toBe('GitHub Actions')
    expect(hostDisplayName(context({ THYROX_CODE_ENTRYPOINT: 'cli' }))).toBeUndefined()
  })

  test('las familias de entrypoint declarado', () => {
    expect(isDesktopEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'local-agent' }))).toBe(true)
    expect(isCoworkEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'remote_cowork_trigger' }))).toBe(true)
    expect(isChatAppEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'claude_in_slack' }))).toBe(true)
    expect(isRemotePrefixedEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'remote_x' }))).toBe(true)
    expect(isSdkEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'sdk-py' }))).toBe(true)
    expect(isSdkEntrypoint(context({ THYROX_CODE_ENTRYPOINT: 'sdk-x' }))).toBe(false)
    expect(isDesktopEntrypointName('local_agent')).toBe(true)
    expect(isEmbeddedEntrypoint('sdk-x')).toBe(true)
    expect(isEmbeddedEntrypoint(undefined)).toBe(false)
    expect(DESKTOP_APP_ENTRYPOINTS.has(THIRD_PARTY_DESKTOP_ENTRYPOINT)).toBe(true)
  })
})

describe('las demás variables del anfitrión', () => {
  test('THYROX_CODE_DESKTOP_APP_VERSION sólo para el escritorio propio o el agente local', () => {
    expect(desktopAppVersion(context({ THYROX_CODE_ENTRYPOINT: 'claude-desktop', THYROX_CODE_DESKTOP_APP_VERSION: ' 1.2 ' }))).toBe('1.2')
    expect(desktopAppVersion(context({ THYROX_CODE_ENTRYPOINT: 'claude-desktop-3p', THYROX_CODE_DESKTOP_APP_VERSION: '1.2' }))).toBeUndefined()
  })

  test('THYROX_CODE_PROVIDER_MANAGED_BY_HOST, THYROX_CODE_USE_GATEWAY, THYROX_CODE_HOST_GATEWAY_LINEAGE y THYROX_CODE_HOST_CREDS_FILE', () => {
    const base = { THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1', THYROX_CODE_USE_GATEWAY: 'true' }
    expect(isHostManagedGateway(context({ ...base, THYROX_CODE_ENTRYPOINT: 'claude-desktop' }))).toBe(true)
    expect(isHostManagedGateway(context({ ...base, THYROX_CODE_ENTRYPOINT: 'cli' }))).toBe(false)
    const lineage = { ...base, THYROX_CODE_HOST_GATEWAY_LINEAGE: 'on', THYROX_CODE_HOST_CREDS_FILE: '/c' }
    expect(isHostManagedGateway(context(lineage))).toBe(true)
    expect(isHostGatewayLineageManaged(context(lineage))).toBe(true)
    expect(isHostGatewayLineageManaged(context({ ...lineage, THYROX_CODE_HOST_CREDS_FILE: ' ' }))).toBe(false)
    expect(isHostManagedGateway(context({ ...lineage, THYROX_CODE_USE_GATEWAY: '0' }))).toBe(false)
    expect(isHostManagedGateway(context({ ...lineage, THYROX_CODE_PROVIDER_MANAGED_BY_HOST: 'off' }))).toBe(false)
  })

  test('THYROX_CODE_REMOTE con un entrypoint de control remoto', () => {
    expect(isRemoteControlSession(context({ THYROX_CODE_REMOTE: '1', THYROX_CODE_ENTRYPOINT: 'remote_mobile' }))).toBe(true)
    expect(isRemoteControlSession(context({ THYROX_CODE_REMOTE: '1', THYROX_CODE_ENTRYPOINT: 'remote_cowork' }))).toBe(false)
    expect(isRemoteControlSession(context({ THYROX_CODE_ENTRYPOINT: 'remote' }))).toBe(false)
  })

  test('THYROX_CODE_HIDE_SETTINGS_HINT y los anfitriones que la ocultan', () => {
    expect(showsSettingsHint(context())).toBe(true)
    expect(showsSettingsHint(context({ THYROX_CODE_HIDE_SETTINGS_HINT: 'yes' }))).toBe(false)
    expect(showsSettingsHint(context({ THYROX_CODE_ENTRYPOINT: 'remote_baku' }))).toBe(false)
  })

  test('THYROX_CODE_SESSION_KIND y el teammate descartan una sesión atendida', () => {
    const state = new EntrypointHostState()
    state.setInteractive(true)
    expect(isAttendedSession(context({}, { state }))).toBe(true)
    expect(isAttendedSession(context({ THYROX_CODE_SESSION_KIND: 'daemon' }, { state }))).toBe(false)
    expect(isAttendedSession(context({}, { state, teammateAgentId: () => '' }))).toBe(false)
    const hosted = new EntrypointHostState()
    hosted.setEntrypoint('ssh-remote')
    expect(isAttendedSession(context({}, { state: hosted }))).toBe(true)
    hosted.setChildSession(true)
    expect(isAttendedSession(context({}, { state: hosted }))).toBe(false)
  })
})

describe('initializeEntrypointHostState (NUo) y resolveEntrypoint (D)', () => {
  test('lee THYROX_CODE_SESSION_ATTENDED (tres estados), THYROX_CODE_CHILD_SESSION, CLAUDECODE, THYROX_CODE_COWORK_FRAME_ARTIFACTS y THYROX_CODE_HOST_SCHEDULED_RUN', () => {
    const ctx = context({
      THYROX_CODE_ENTRYPOINT: 'claude-vscode',
      THYROX_CODE_SESSION_ATTENDED: 'no',
      THYROX_CODE_CHILD_SESSION: '1',
      CLAUDECODE: '1',
      THYROX_CODE_COWORK_FRAME_ARTIFACTS: 'true',
      THYROX_CODE_HOST_SCHEDULED_RUN: 'on',
    })
    initializeEntrypointHostState(true, ctx)
    expect(ctx.state.interactive).toBe(false)
    expect(ctx.state.spawnedByAttendedSession).toBe(false)
    expect(spawnedByAttendedSession(ctx)).toBe(false)
    expect(isChildSession(ctx)).toBe(true)
    expect(isInsideAgentShell(ctx)).toBe(true)
    expect(coworkFrameArtifacts(ctx)).toBe(true)
    expect(isHostScheduledRun(ctx)).toBe(true)
    const unset = context()
    initializeEntrypointHostState(false, unset)
    expect(unset.state.spawnedByAttendedSession).toBeUndefined()
    const attended = context({ THYROX_CODE_SESSION_ATTENDED: '1' })
    initializeEntrypointHostState(false, attended)
    expect(spawnedByAttendedSession(attended)).toBe(true)
  })

  test('sin entrypoint declarado: mcp serve, THYROX_CODE_ACTION, o cli / sdk-cli', () => {
    const mcp = context({}, { argv: () => ['bun', 'cli', 'mcp', 'serve'] })
    resolveEntrypoint(false, mcp)
    expect(mcp.env.THYROX_CODE_ENTRYPOINT).toBe('mcp')
    const action = context({ THYROX_CODE_ACTION: 'true' })
    resolveEntrypoint(false, action)
    expect(action.env.THYROX_CODE_ENTRYPOINT).toBe('claude-code-github-action')
    const sdk = context()
    resolveEntrypoint(true, sdk)
    expect(sdk.env.THYROX_CODE_ENTRYPOINT).toBe('sdk-cli')
    const cli = context()
    resolveEntrypoint(false, cli)
    expect(cli.env.THYROX_CODE_ENTRYPOINT).toBe('cli')
  })

  test('con entrypoint declarado sólo normaliza local_agent y cli no interactivo', () => {
    const agent = context({ THYROX_CODE_ENTRYPOINT: 'local_agent' })
    resolveEntrypoint(false, agent)
    expect(agent.env.THYROX_CODE_ENTRYPOINT).toBe('local-agent')
    const cli = context({ THYROX_CODE_ENTRYPOINT: 'cli' })
    resolveEntrypoint(true, cli)
    expect(cli.env.THYROX_CODE_ENTRYPOINT).toBe('sdk-cli')
    const other = context({ THYROX_CODE_ENTRYPOINT: 'remote' }, { argv: () => ['bun', 'cli', 'mcp', 'serve'] })
    resolveEntrypoint(true, other)
    expect(other.env.THYROX_CODE_ENTRYPOINT).toBe('remote')
  })
})

describe('sesiones de primer nivel', () => {
  function stateWith(entrypoint: string, child = false, insideAgentShell = false) {
    const state = new EntrypointHostState()
    state.setEntrypoint(entrypoint)
    state.setChildSession(child)
    state.setInsideAgentShell(insideAgentShell)
    return state
  }

  test('escritorio, remoto y editor', () => {
    expect(isTopLevelDesktopSession(context({}, { state: stateWith('local-agent') }))).toBe(true)
    expect(isTopLevelDesktopSession(context({}, { state: stateWith('local-agent', true) }))).toBe(false)
    expect(isTopLevelRemoteSession(context({}, { state: stateWith('ssh-remote') }))).toBe(true)
    expect(isTopLevelRemoteSession(context({}, { state: stateWith('ssh-remote', false, true) }))).toBe(false)
    expect(isTopLevelVsCodeSession(context({}, { state: stateWith('claude-vscode') }))).toBe(true)
  })

  test('isUnhostedNonInteractive (P6)', () => {
    expect(isUnhostedNonInteractive(true, context())).toBe(true)
    expect(isUnhostedNonInteractive(false, context())).toBe(false)
    expect(isUnhostedNonInteractive(true, context({}, { state: stateWith('claude-desktop') }))).toBe(false)
    expect(isUnhostedNonInteractive(true, context({}, { state: stateWith('claude-desktop', false, true) }))).toBe(true)
    expect(isUnhostedNonInteractive(true, context({}, { state: stateWith('claude-vscode') }))).toBe(false)
    expect(isUnhostedNonInteractive(undefined, context({}, { isNonInteractive: () => true }))).toBe(true)
  })
})

test('launchResumeMode ($Uo) mira sólo lo anterior a --', () => {
  expect(launchResumeMode(['--resume=x'])).toBe('resume')
  expect(launchResumeMode(['--from-pr'])).toBe('resume')
  expect(launchResumeMode(['-c'])).toBe('continue')
  expect(launchResumeMode(['--', '-r'])).toBe('fresh')
})

test('el contexto del proceso lee process.env y deja configurar lo ajeno', () => {
  expect(processEntrypointContext.env).toBe(process.env as Record<string, string | undefined>)
  configureEntrypointContext({ teammateAgentId: () => 'a1' })
  expect(processEntrypointContext.teammateAgentId()).toBe('a1')
  configureEntrypointContext({ teammateAgentId: () => undefined })
})
